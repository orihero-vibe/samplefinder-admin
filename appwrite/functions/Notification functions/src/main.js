import { Client, Databases, Messaging, ID, Query } from 'node-appwrite';
// Constants
const DATABASE_ID = '69217af50038b9005a61';
const NOTIFICATIONS_TABLE_ID = 'notifications';
const USER_PROFILES_TABLE_ID = 'user_profiles';
const EVENTS_TABLE_ID = 'events';
/**
 * Get notification by ID
 */
async function getNotification(databases, notificationId, log) {
    try {
        const notification = await databases.getDocument(DATABASE_ID, NOTIFICATIONS_TABLE_ID, notificationId);
        return notification;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error fetching notification: ${errorMessage}`);
        throw new Error(`Failed to fetch notification: ${errorMessage}`);
    }
}
/**
 * Get target users based on audience type and selected user IDs
 */
async function getTargetUsers(databases, targetAudience, selectedUserIds, log) {
    try {
        // If specific users are selected (for Targeted audience), fetch only those users
        if (targetAudience === 'Targeted' && selectedUserIds && selectedUserIds.length > 0) {
            log(`Fetching ${selectedUserIds.length} specifically selected users`);
            const users = [];
            // Fetch each selected user by ID
            for (const userId of selectedUserIds) {
                try {
                    const user = await databases.getDocument(DATABASE_ID, USER_PROFILES_TABLE_ID, userId);
                    users.push(user);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    log(`Warning: Could not fetch user ${userId}: ${errorMessage}`);
                    // Continue with other users even if one fails
                }
            }
            log(`Successfully fetched ${users.length} of ${selectedUserIds.length} selected users`);
            return users;
        }
        // For "All" or if no specific users selected, fetch all users
        const queries = [];
        const usersResponse = await databases.listDocuments(DATABASE_ID, USER_PROFILES_TABLE_ID, queries);
        const users = usersResponse.documents;
        log(`Found ${users.length} target users for audience: ${targetAudience}`);
        return users;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error fetching users: ${errorMessage}`);
        throw new Error(`Failed to fetch target users: ${errorMessage}`);
    }
}
/**
 * Send push notification using Appwrite Messaging.
 * Uses the object API and sends one push per user to avoid known multi-user delivery issues.
 * users: array of Appwrite Auth user IDs (each user must have a push target registered).
 */
async function sendPushNotificationToUsers(messaging, userIds, title, body, log, data) {
    if (userIds.length === 0) {
        log('No user IDs provided for push');
        return { $id: null, status: 'skipped', sentCount: 0 };
    }
    const payload = data ?? {};
    let lastResult = null;
    let sentCount = 0;
    for (const userId of userIds) {
        try {
            const result = await messaging.createPush(ID.unique(), title, body, [], [userId], [], payload, undefined, undefined, undefined, undefined, undefined, undefined, undefined, false);
            lastResult = result;
            sentCount += 1;
            log(`Push created for user ${userId}: messageId=${result.$id}, status=${result.status}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            log(`Failed to send push to user ${userId}: ${errorMessage}`);
        }
    }
    log(`Push notification summary: ${sentCount}/${userIds.length} users, last messageId: ${lastResult?.$id}, status: ${lastResult?.status}`);
    return lastResult
        ? { ...lastResult, sentCount }
        : { $id: null, status: 'failed', sentCount: 0 };
}
/**
 * Send notification to all target users using Appwrite Messaging
 */
async function sendNotification(databases, messaging, notificationId, log) {
    try {
        // Get notification data
        log(`Fetching notification data for ID: ${notificationId}`);
        const notification = await getNotification(databases, notificationId, log);
        if (!notification) {
            throw new Error('Notification not found');
        }
        log(`Notification found: title="${notification.title}", status="${notification.status}", targetAudience="${notification.targetAudience}"`);
        if (notification.selectedUserIds && notification.selectedUserIds.length > 0) {
            log(`Selected users: ${notification.selectedUserIds.length} user(s)`);
        }
        if (notification.status === 'Sent') {
            log('Notification already sent - skipping');
            return {
                success: true,
                recipients: notification.recipients || 0,
            };
        }
        // Get target users
        const users = await getTargetUsers(databases, notification.targetAudience, notification.selectedUserIds, log);
        if (users.length === 0) {
            log('No target users found');
            // Update notification status even if no users
            await databases.updateDocument(DATABASE_ID, NOTIFICATIONS_TABLE_ID, notificationId, {
                status: 'Sent',
                sentAt: new Date().toISOString(),
                recipients: 0,
            });
            return {
                success: true,
                recipients: 0,
            };
        }
        // Extract user auth IDs for push notification
        const userAuthIds = users
            .map(user => user.authID)
            .filter(id => id && typeof id === 'string');
        if (userAuthIds.length === 0) {
            log('No valid user auth IDs found');
            return {
                success: false,
                recipients: 0,
            };
        }
        log(`Preparing to send push notification to ${userAuthIds.length} users`);
        log(`User auth IDs: ${userAuthIds.slice(0, 5).join(', ')}${userAuthIds.length > 5 ? '...' : ''}`);
        // Send push notification using Appwrite Messaging
        const pushResult = await sendPushNotificationToUsers(messaging, userAuthIds, notification.title, notification.message, log, {
            notificationId: notification.$id,
            type: notification.type,
        });
        const recipientCount = pushResult.sentCount ?? userAuthIds.length;
        log(`Push result: ID=${pushResult.$id}, status=${pushResult.status}, sentCount=${recipientCount}`);
        // Update notification status
        const now = new Date().toISOString();
        await databases.updateDocument(DATABASE_ID, NOTIFICATIONS_TABLE_ID, notificationId, {
            status: 'Sent',
            sentAt: now,
            recipients: recipientCount,
        });
        log(`Notification sent successfully. Recipients: ${recipientCount}, Message ID: ${pushResult.$id}`);
        return {
            success: true,
            recipients: recipientCount,
            messageId: pushResult.$id ?? undefined,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error sending notification: ${errorMessage}`);
        throw error instanceof Error ? error : new Error(errorMessage);
    }
}
/**
 * Check and send event reminders
 * This function runs on a schedule to check for events that need reminders
 * and sends push notifications to users who have saved those events
 *
 * NEW: Uses user-level reminder tracking instead of event-level tracking
 * This allows users who save events late to still receive remaining reminders
 */
async function checkAndSendEventReminders(databases, messaging, log) {
    try {
        log('Starting event reminder check with user-level tracking...');
        const now = new Date();
        const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
        // Define time windows for checking (±15 minutes for flexibility)
        const time24hStart = new Date(in24Hours.getTime() - 15 * 60 * 1000);
        const time24hEnd = new Date(in24Hours.getTime() + 15 * 60 * 1000);
        const time1hStart = new Date(in1Hour.getTime() - 15 * 60 * 1000);
        const time1hEnd = new Date(in1Hour.getTime() + 15 * 60 * 1000);
        log(`Checking for events at ${now.toISOString()}`);
        log(`24h window: ${time24hStart.toISOString()} to ${time24hEnd.toISOString()}`);
        log(`1h window: ${time1hStart.toISOString()} to ${time1hEnd.toISOString()}`);
        // Fetch all events
        const eventsResponse = await databases.listDocuments(DATABASE_ID, EVENTS_TABLE_ID, []);
        const events = eventsResponse.documents;
        log(`Found ${events.length} total events`);
        // Create a map of events by ID for quick lookup
        const eventsMap = new Map();
        const events24h = [];
        const events1h = [];
        for (const event of events) {
            const eventDate = new Date(event.startTime || event.date);
            eventsMap.set(event.$id, event);
            // Check if event is in 24h window
            if (eventDate >= time24hStart && eventDate <= time24hEnd) {
                events24h.push(event);
            }
            // Check if event is in 1h window
            if (eventDate >= time1hStart && eventDate <= time1hEnd) {
                events1h.push(event);
            }
        }
        log(`Events in 24h window: ${events24h.length}, in 1h window: ${events1h.length}`);
        // Fetch all users
        const usersResponse = await databases.listDocuments(DATABASE_ID, USER_PROFILES_TABLE_ID, []);
        const allUsers = usersResponse.documents;
        log(`Checking ${allUsers.length} users for saved events`);
        let reminders24hSent = 0;
        let reminders1hSent = 0;
        // Process each user
        for (const user of allUsers) {
            try {
                if (!user.savedEventIds || !user.authID) {
                    continue;
                }
                let savedEvents = [];
                try {
                    savedEvents = JSON.parse(user.savedEventIds);
                }
                catch {
                    log(`Error parsing savedEventIds for user ${user.$id}`);
                    continue;
                }
                let needsUpdate = false;
                // Check each saved event
                for (const savedEvent of savedEvents) {
                    const event = eventsMap.get(savedEvent.eventId);
                    if (!event)
                        continue;
                    const eventDate = new Date(event.startTime || event.date);
                    // Check if user needs 24h reminder for this event
                    if (eventDate >= time24hStart &&
                        eventDate <= time24hEnd &&
                        !savedEvent.reminder24hSent) {
                        log(`User ${user.$id} needs 24h reminder for event "${event.name}"`);
                        // Send push notification
                        await sendPushNotificationToUsers(messaging, [user.authID], `Event Reminder: ${event.name}`, `Your saved event "${event.name}" starts in 24 hours! Location: ${event.address}, ${event.city}`, log, {
                            eventId: event.$id,
                            reminderType: '24h',
                            type: 'Event Reminder',
                        });
                        // Mark as sent in the savedEvent object
                        savedEvent.reminder24hSent = true;
                        needsUpdate = true;
                        reminders24hSent++;
                    }
                    // Check if user needs 1h reminder for this event
                    if (eventDate >= time1hStart &&
                        eventDate <= time1hEnd &&
                        !savedEvent.reminder1hSent) {
                        log(`User ${user.$id} needs 1h reminder for event "${event.name}"`);
                        // Send push notification
                        await sendPushNotificationToUsers(messaging, [user.authID], `Event Reminder: ${event.name}`, `Your saved event "${event.name}" starts in 1 hour! Location: ${event.address}, ${event.city}`, log, {
                            eventId: event.$id,
                            reminderType: '1h',
                            type: 'Event Reminder',
                        });
                        // Mark as sent in the savedEvent object
                        savedEvent.reminder1hSent = true;
                        needsUpdate = true;
                        reminders1hSent++;
                    }
                }
                // Update user's savedEventIds if any reminders were sent
                if (needsUpdate) {
                    await databases.updateDocument(DATABASE_ID, USER_PROFILES_TABLE_ID, user.$id, {
                        savedEventIds: JSON.stringify(savedEvents),
                    });
                    log(`Updated reminder flags for user ${user.$id}`);
                }
            }
            catch (userError) {
                const errorMessage = userError instanceof Error ? userError.message : String(userError);
                log(`Error processing user ${user.$id}: ${errorMessage}`);
                // Continue with next user
            }
        }
        log(`Reminder check complete. 24h reminders: ${reminders24hSent}, 1h reminders: ${reminders1hSent}`);
        return {
            success: true,
            reminders24h: reminders24hSent,
            reminders1h: reminders1hSent,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error checking event reminders: ${errorMessage}`);
        throw error instanceof Error ? error : new Error(errorMessage);
    }
}
/**
 * Check for scheduled notifications that are due and send them.
 * Runs on the same cron schedule as event reminders (every 15 minutes).
 * Notifications with status 'Scheduled' and scheduledAt <= now are sent to their target users.
 */
async function checkAndSendScheduledNotifications(databases, messaging, log) {
    try {
        const nowISO = new Date().toISOString();
        log(`Checking for due scheduled notifications (scheduledAt <= ${nowISO})`);
        const response = await databases.listDocuments(DATABASE_ID, NOTIFICATIONS_TABLE_ID, [
            Query.equal('status', 'Scheduled'),
            Query.lessThanEqual('scheduledAt', nowISO),
        ]);
        const dueNotifications = response.documents;
        log(`Found ${dueNotifications.length} scheduled notification(s) due to send`);
        let sent = 0;
        let failed = 0;
        for (const notification of dueNotifications) {
            try {
                log(`Sending scheduled notification: ${notification.$id} "${notification.title}"`);
                await sendNotification(databases, messaging, notification.$id, log);
                sent += 1;
            }
            catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                log(`Failed to send scheduled notification ${notification.$id}: ${errMsg}`);
                failed += 1;
            }
        }
        log(`Scheduled notifications check complete. Sent: ${sent}, Failed: ${failed}`);
        return { success: true, sent, failed };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error checking scheduled notifications: ${errorMessage}`);
        throw error instanceof Error ? error : new Error(errorMessage);
    }
}
/**
 * Archive events that completed more than 7 days ago (endTime < now - 7 days).
 */
async function archiveEventsCompletedOver7DaysAgo(databases, log) {
    try {
        const now = new Date();
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoISO = sevenDaysAgo.toISOString();
        log(`Checking for events to auto-archive (endTime < ${sevenDaysAgoISO})`);
        const response = await databases.listDocuments(DATABASE_ID, EVENTS_TABLE_ID, [
            Query.equal('isArchived', false),
            Query.lessThan('endTime', sevenDaysAgoISO),
        ]);
        let archived = 0;
        for (const doc of response.documents) {
            try {
                await databases.updateDocument(DATABASE_ID, EVENTS_TABLE_ID, doc.$id, { isArchived: true });
                archived += 1;
                log(`Archived event: ${doc.$id}`);
            }
            catch (err) {
                const errMsg = err instanceof Error ? err.message : String(err);
                log(`Failed to archive event ${doc.$id}: ${errMsg}`);
            }
        }
        log(`Auto-archive complete. Archived: ${archived}`);
        return { archived };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error auto-archiving events: ${errorMessage}`);
        return { archived: 0 };
    }
}
export default async function handler({ req, res, log, error }) {
    try {
        // Initialize Appwrite client
        const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
        const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || '691d4a54003b21bf0136';
        const apiKey = process.env.APPWRITE_FUNCTION_KEY ||
            process.env.APPWRITE_API_KEY ||
            req.headers['x-appwrite-key'] ||
            req.headers['x-appwrite-function-key'] ||
            '';
        if (!apiKey) {
            error('API key is missing');
            return res.json({
                success: false,
                error: 'Server configuration error: API key missing',
            }, 500);
        }
        const client = new Client()
            .setEndpoint(endpoint)
            .setProject(projectId)
            .setKey(apiKey);
        const databases = new Databases(client);
        const messaging = new Messaging(client);
        // Handle ping endpoint
        if (req.path === '/ping') {
            return res.text('Pong');
        }
        // Handle send notification endpoint
        if (req.path === '/send-notification' && req.method === 'POST') {
            log('Processing send-notification request');
            // Parse and validate request body
            let requestBody;
            try {
                if (!req.body || typeof req.body !== 'object') {
                    throw new Error('Request body is required');
                }
                const body = req.body;
                if (!body.notificationId || typeof body.notificationId !== 'string') {
                    throw new Error('notificationId is required and must be a string');
                }
                requestBody = {
                    notificationId: body.notificationId,
                };
            }
            catch (validationError) {
                const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
                error(`Validation error: ${errorMessage}`);
                return res.json({
                    success: false,
                    error: errorMessage,
                }, 400);
            }
            log(`Sending notification: ${requestBody.notificationId}`);
            // Send notification using Appwrite Messaging
            const result = await sendNotification(databases, messaging, requestBody.notificationId, log);
            log(`Notification sent. Recipients: ${result.recipients}${result.messageId ? `, Message ID: ${result.messageId}` : ''}`);
            return res.json({
                ...result,
            });
        }
        // Handle scheduled execution: event reminders + due scheduled notifications
        // Triggered by: Appwrite cron (path / or empty) or manual GET /check-event-reminders
        const isScheduledRun = req.path === '/check-event-reminders' ||
            req.path === '/' ||
            req.path === '';
        if (isScheduledRun) {
            log('Processing scheduled run: event reminders + scheduled notifications');
            // 1. Send due scheduled notifications (status=Scheduled, scheduledAt <= now)
            const scheduledResult = await checkAndSendScheduledNotifications(databases, messaging, log);
            log(`Scheduled notifications: sent=${scheduledResult.sent}, failed=${scheduledResult.failed}`);
            // 2. Check and send event reminders (24h / 1h)
            const remindersResult = await checkAndSendEventReminders(databases, messaging, log);
            log(`Event reminders: 24h=${remindersResult.reminders24h}, 1h=${remindersResult.reminders1h}`);
            // 3. Auto-archive events that completed more than 7 days ago
            const archiveResult = await archiveEventsCompletedOver7DaysAgo(databases, log);
            log(`Auto-archive events: ${archiveResult.archived}`);
            return res.json({
                success: true,
                scheduledNotifications: {
                    sent: scheduledResult.sent,
                    failed: scheduledResult.failed,
                },
                eventReminders: {
                    reminders24h: remindersResult.reminders24h,
                    reminders1h: remindersResult.reminders1h,
                },
                eventAutoArchive: {
                    archived: archiveResult.archived,
                },
            });
        }
        // Default response
        return res.json({
            motto: 'Build like a team of hundreds_',
            learn: 'https://appwrite.io/docs',
            connect: 'https://appwrite.io/discord',
            getInspired: 'https://builtwith.appwrite.io',
        });
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Internal server error';
        error(`Function error: ${errorMessage}`);
        console.error('Function error:', err);
        return res.json({
            success: false,
            error: errorMessage,
        }, 500);
    }
}
