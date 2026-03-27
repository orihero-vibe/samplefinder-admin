import { Client, Databases, Messaging, Users, ID, Query } from 'node-appwrite';
// Constants
const DATABASE_ID = '69217af50038b9005a61';
const NOTIFICATIONS_TABLE_ID = 'notifications';
const USER_PROFILES_TABLE_ID = 'user_profiles';
const EVENTS_TABLE_ID = 'events';
const SETTINGS_TABLE_ID = 'settings';
const PAGE_SIZE = 100;
const NOTIFICATION_SEND_HOUR_EST = 13;
const EST_TIMEZONE = 'America/New_York';
function getTimePartsInTimezone(date, timezone) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);
    const year = parseInt(parts.find((p) => p.type === 'year')?.value ?? '0', 10);
    const month = parseInt(parts.find((p) => p.type === 'month')?.value ?? '0', 10);
    const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '0', 10);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
    return { year, month, day, hour, minute };
}
function timezoneLocalToUTC(year, month, day, hour, minute, timezone) {
    let guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    for (let i = 0; i < 5; i++) {
        const comp = getTimePartsInTimezone(new Date(guess), timezone);
        if (comp.year === year &&
            comp.month === month &&
            comp.day === day &&
            comp.hour === hour &&
            comp.minute === minute) {
            return new Date(guess);
        }
        const diffMs = (hour - comp.hour) * 36e5 +
            (minute - comp.minute) * 6e4 +
            (day - comp.day) * 864e5;
        guess += diffMs;
    }
    return new Date(guess);
}
function getNextOnePmEasternUTC(date = new Date()) {
    const nowEastern = getTimePartsInTimezone(date, EST_TIMEZONE);
    const useNextDay = nowEastern.hour > NOTIFICATION_SEND_HOUR_EST ||
        (nowEastern.hour === NOTIFICATION_SEND_HOUR_EST && nowEastern.minute > 0);
    const targetDay = new Date(Date.UTC(nowEastern.year, nowEastern.month - 1, nowEastern.day + (useNextDay ? 1 : 0)));
    const targetUtc = timezoneLocalToUTC(targetDay.getUTCFullYear(), targetDay.getUTCMonth() + 1, targetDay.getUTCDate(), NOTIFICATION_SEND_HOUR_EST, 0, EST_TIMEZONE);
    return targetUtc.toISOString();
}
/**
 * Fetch all documents matching queries by paginating with limit/offset.
 * Appwrite defaults to 25 docs per request; this ensures we get every matching document.
 */
async function listAllDocuments(databases, databaseId, collectionId, queries = []) {
    let offset = 0;
    const all = [];
    while (true) {
        const response = await databases.listDocuments(databaseId, collectionId, [
            ...queries,
            Query.limit(PAGE_SIZE),
            Query.offset(offset),
        ]);
        all.push(...response.documents);
        if (response.documents.length < PAGE_SIZE)
            break;
        offset += PAGE_SIZE;
    }
    return all;
}
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
 * Get target users based on audience type and selected user IDs / filters
 */
async function getTargetUsers(databases, targetAudience, selectedUserIds, log, notification) {
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
        const queries = [];
        // Audience-based filtering
        if (targetAudience === 'NewUsers') {
            const days = notification?.newUsersTimeRange ?? 30;
            const now = new Date();
            const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
            log(`Filtering NewUsers with cutoff >= ${cutoff}`);
            queries.push(Query.greaterThanEqual('$createdAt', cutoff));
        }
        else if (targetAudience === 'BrandAmbassadors') {
            log('Filtering BrandAmbassadors (isAmbassador = true)');
            queries.push(Query.equal('isAmbassador', true));
        }
        else if (targetAudience === 'Influencers') {
            log('Filtering Influencers (isInfluencer = true)');
            queries.push(Query.equal('isInfluencer', true));
        }
        else if (targetAudience === 'Tier1' ||
            targetAudience === 'Tier2' ||
            targetAudience === 'Tier3' ||
            targetAudience === 'Tier4' ||
            targetAudience === 'Tier5') {
            const tierMap = {
                Tier1: 'NewbieSampler',
                Tier2: 'SampleFan',
                Tier3: 'SuperSampler',
                Tier4: 'VIS',
                Tier5: 'SampleMaster',
                All: '',
                NewUsers: '',
                BrandAmbassadors: '',
                Influencers: '',
                ZipCode: '',
                Targeted: '',
            };
            const tierName = tierMap[targetAudience] || '';
            if (tierName) {
                log(`Filtering by tierLevel = ${tierName}`);
                queries.push(Query.equal('tierLevel', tierName));
            }
        }
        else if (targetAudience === 'ZipCode') {
            const zips = notification?.selectedZipCodes || [];
            if (zips.length > 0) {
                log(`Filtering ZipCode audience for ${zips.length} zip(s)`);
                queries.push(Query.equal('zipCode', zips));
            }
            else {
                log('ZipCode audience selected but no zip codes provided, returning empty list');
                return [];
            }
        }
        const users = (await listAllDocuments(databases, DATABASE_ID, USER_PROFILES_TABLE_ID, queries));
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
 * Append a notification entry to a user profile's notifications array.
 * Handles both string (JSON array) and array storage formats.
 */
async function appendNotificationToUserProfile(databases, userProfileId, entry, log) {
    try {
        const doc = await databases.getDocument(DATABASE_ID, USER_PROFILES_TABLE_ID, userProfileId);
        const raw = doc.notifications;
        let list = [];
        if (Array.isArray(raw)) {
            list = raw.map((item) => typeof item === 'string' ? JSON.parse(item) : item);
        }
        else if (typeof raw === 'string' && raw) {
            try {
                list = JSON.parse(raw);
            }
            catch {
                list = [];
            }
        }
        list.push(entry);
        const notificationsValue = list.map((item) => typeof item === 'string' ? item : JSON.stringify(item));
        await databases.updateDocument(DATABASE_ID, USER_PROFILES_TABLE_ID, userProfileId, { notifications: notificationsValue });
        log(`Appended notification to user profile ${userProfileId}`);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Warning: could not append notification to user ${userProfileId}: ${errorMessage}`);
    }
}
/**
 * Append the same notification to multiple user profiles (e.g. after sending push).
 */
async function appendNotificationToUserProfiles(databases, userProfileIds, notification, log) {
    const now = new Date().toISOString();
    const entry = {
        id: notification.$id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: false,
        createdAt: now,
        data: { notificationId: notification.$id },
    };
    for (const userId of userProfileIds) {
        await appendNotificationToUserProfile(databases, userId, entry, log);
    }
}
const PUSH_BATCH_SIZE = 50;
const PUSH_CONCURRENCY = 3;
/**
 * Send push notification using Appwrite Messaging.
 * Uses object-based API and batches users for efficient delivery.
 * Sends to multiple users per createPush call, with concurrent batch execution.
 * users: array of Appwrite Auth user IDs (each user must have a push target registered).
 */
async function sendPushNotificationToUsers(messaging, userIds, title, body, log, data) {
    if (userIds.length === 0) {
        log('No user IDs provided for push');
        return { $id: null, status: 'skipped', sentCount: 0 };
    }
    const payload = data ?? {};
    const batches = [];
    for (let i = 0; i < userIds.length; i += PUSH_BATCH_SIZE) {
        batches.push(userIds.slice(i, i + PUSH_BATCH_SIZE));
    }
    log(`Sending push in ${batches.length} batch(es), ${userIds.length} total users`);
    let sentCount = 0;
    let failedCount = 0;
    let lastResult = null;
    let lastError = '';
    for (let i = 0; i < batches.length; i += PUSH_CONCURRENCY) {
        const chunk = batches.slice(i, i + PUSH_CONCURRENCY);
        const results = await Promise.allSettled(chunk.map((userBatch) => {
            // Object-based API per Appwrite docs; node-appwrite 14 types only declare positional overload
            const createPushObj = messaging.createPush;
            return createPushObj({
                messageId: ID.unique(),
                title,
                body,
                topics: [],
                users: userBatch,
                targets: [],
                data: payload,
                draft: false,
            });
        }));
        for (let j = 0; j < results.length; j++) {
            const settled = results[j];
            const batch = chunk[j];
            if (settled.status === 'fulfilled') {
                const result = settled.value;
                lastResult = result;
                sentCount += batch.length;
                log(`Push batch ${i + j + 1}: messageId=${result.$id}, status=${result.status}, users=${batch.length}`);
            }
            else {
                const errMsg = settled.reason instanceof Error ? settled.reason.message : String(settled.reason);
                failedCount += batch.length;
                lastError = errMsg;
                log(`Failed to send push batch (${batch.length} users): ${errMsg}`);
            }
        }
    }
    log(`Push notification summary: sent=${sentCount}/${userIds.length}, failed=${failedCount}, last messageId: ${lastResult?.$id}, status: ${lastResult?.status}${lastError ? `, lastError: ${lastError}` : ''}`);
    return lastResult
        ? { ...lastResult, sentCount }
        : { $id: null, status: sentCount > 0 ? 'completed' : 'failed', sentCount };
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
        const users = await getTargetUsers(databases, notification.targetAudience, notification.selectedUserIds, log, notification);
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
            log(`ERROR: Found ${users.length} user profile(s) but none have a valid authID. Push cannot be sent.`);
            return {
                success: false,
                recipients: 0,
                error: `Found ${users.length} user profile(s) but none have a valid authID linked. Push notifications require users to have an authenticated account.`,
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
        if (recipientCount === 0 && userAuthIds.length > 0) {
            log(`ERROR: All push batches failed. ${userAuthIds.length} users targeted but 0 reached. Notification will NOT be marked as Sent.`);
            await databases.updateDocument(DATABASE_ID, NOTIFICATIONS_TABLE_ID, notificationId, { status: 'Draft' });
            return {
                success: false,
                recipients: 0,
                error: `Push delivery failed for all ${userAuthIds.length} targeted users. The notification remains in Draft status. Check that Appwrite Messaging has a push provider (FCM/APNS) configured and that users have registered push targets.`,
            };
        }
        // Update notification status
        const now = new Date().toISOString();
        await databases.updateDocument(DATABASE_ID, NOTIFICATIONS_TABLE_ID, notificationId, {
            status: 'Sent',
            sentAt: now,
            recipients: recipientCount,
        });
        // Append notification to each recipient's user profile for in-app list
        const userProfileIds = users.map((u) => u.$id);
        await appendNotificationToUserProfiles(databases, userProfileIds, notification, log);
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
        const events = (await listAllDocuments(databases, DATABASE_ID, EVENTS_TABLE_ID, []));
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
        const allUsers = (await listAllDocuments(databases, DATABASE_ID, USER_PROFILES_TABLE_ID, []));
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
        const now = new Date();
        const nowISO = now.toISOString();
        // Server runs in UTC; log for debugging timezone issues
        log(`Server time: ${nowISO} UTC (tz: ${process.env.TZ ?? 'UTC'})`);
        log(`Checking for due scheduled notifications (scheduledAt <= ${nowISO})`);
        const dueNotifications = (await listAllDocuments(databases, DATABASE_ID, NOTIFICATIONS_TABLE_ID, [
            Query.equal('status', 'Scheduled'),
            Query.lessThanEqual('scheduledAt', nowISO),
        ]));
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
// ============================================================================
// SETTINGS HELPERS
// ============================================================================
async function getSettingValue(databases, key) {
    try {
        const result = await databases.listDocuments(DATABASE_ID, SETTINGS_TABLE_ID, [Query.equal('key', key), Query.limit(1)]);
        if (result.documents.length > 0) {
            return result.documents[0].value;
        }
        return null;
    }
    catch {
        return null;
    }
}
async function setSettingValue(databases, key, value) {
    const result = await databases.listDocuments(DATABASE_ID, SETTINGS_TABLE_ID, [Query.equal('key', key), Query.limit(1)]);
    if (result.documents.length > 0) {
        await databases.updateDocument(DATABASE_ID, SETTINGS_TABLE_ID, result.documents[0].$id, { value });
    }
    else {
        await databases.createDocument(DATABASE_ID, SETTINGS_TABLE_ID, ID.unique(), {
            key,
            value,
        });
    }
}
// ============================================================================
// AUTOMATED NOTIFICATION CHECKS
// ============================================================================
/**
 * TRIVIA TUESDAY
 * Sends "Earn points by knowing fun facts about your favorite brands!" to all users
 * every Tuesday morning. Uses settings key `triviaTuesdayLastSent` to run once per Tuesday.
 */
async function checkAndSendTriviaTuesday(databases, messaging, log) {
    const now = new Date();
    if (now.getUTCDay() !== 2) {
        log('Trivia Tuesday: not Tuesday, skipping');
        return { sent: 0 };
    }
    const todayStr = now.toISOString().slice(0, 10);
    const lastSent = await getSettingValue(databases, 'triviaTuesdayLastSent');
    if (lastSent === todayStr) {
        log('Trivia Tuesday: already sent today, skipping');
        return { sent: 0 };
    }
    log('Trivia Tuesday: sending to all users');
    const allUsers = (await listAllDocuments(databases, DATABASE_ID, USER_PROFILES_TABLE_ID, []));
    const authIds = allUsers
        .map((u) => u.authID)
        .filter((id) => id && typeof id === 'string');
    const result = await sendPushNotificationToUsers(messaging, authIds, 'TRIVIA TUESDAY', 'Earn points by knowing fun facts about your favorite brands!', log, { type: 'Engagement' });
    await setSettingValue(databases, 'triviaTuesdayLastSent', todayStr);
    log(`Trivia Tuesday: sent to ${result.sentCount ?? 0} users`);
    return { sent: result.sentCount ?? 0 };
}
/**
 * SAMPLING TODAY
 * Sends "Sampling at {storeName} starts at {time}!" the morning of the event
 * to users who have that event in their savedEventIds calendar.
 * Tracks `samplingTodaySent` flag per saved event entry to avoid resending.
 */
async function checkAndSendSamplingToday(databases, messaging, log) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    log(`Sampling Today: checking for events on ${todayStr}`);
    const allEvents = (await listAllDocuments(databases, DATABASE_ID, EVENTS_TABLE_ID, []));
    const todaysEvents = allEvents.filter((e) => {
        const eventDateStr = (e.startTime || e.date || '').slice(0, 10);
        return eventDateStr === todayStr && !e.isArchived && !e.isHidden;
    });
    if (todaysEvents.length === 0) {
        log('Sampling Today: no events today');
        return { sent: 0 };
    }
    log(`Sampling Today: ${todaysEvents.length} event(s) today`);
    const todaysEventIds = new Set(todaysEvents.map((e) => e.$id));
    const eventsMap = new Map(todaysEvents.map((e) => [e.$id, e]));
    const allUsers = (await listAllDocuments(databases, DATABASE_ID, USER_PROFILES_TABLE_ID, []));
    let totalSent = 0;
    for (const user of allUsers) {
        if (!user.savedEventIds || !user.authID)
            continue;
        let savedEvents;
        try {
            savedEvents = JSON.parse(user.savedEventIds);
        }
        catch {
            continue;
        }
        let needsUpdate = false;
        for (const saved of savedEvents) {
            if (!todaysEventIds.has(saved.eventId) ||
                saved.samplingTodaySent) {
                continue;
            }
            const event = eventsMap.get(saved.eventId);
            if (!event)
                continue;
            const startDate = new Date(event.startTime || event.date);
            const timeStr = startDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'UTC',
            });
            const storeName = event.name || 'your event';
            await sendPushNotificationToUsers(messaging, [user.authID], 'SAMPLING TODAY', `Sampling at ${storeName} starts at ${timeStr}! Click to learn more!`, log, { eventId: event.$id, type: 'Event Reminder' });
            saved.samplingTodaySent = true;
            needsUpdate = true;
            totalSent++;
        }
        if (needsUpdate) {
            try {
                await databases.updateDocument(DATABASE_ID, USER_PROFILES_TABLE_ID, user.$id, { savedEventIds: JSON.stringify(savedEvents) });
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                log(`Sampling Today: failed to update flags for user ${user.$id}: ${msg}`);
            }
        }
    }
    log(`Sampling Today: sent ${totalSent} notification(s)`);
    return { sent: totalSent };
}
/**
 * HAPPY BIRTHDAY
 * Sends birthday push + awards configurable points on the user's birthday.
 * Uses `birthdayNotifYear` to send once per year.
 */
async function checkAndSendBirthdayNotifications(databases, messaging, log) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const lastRun = await getSettingValue(databases, 'birthdayCheckLastRun');
    if (lastRun === todayStr) {
        log('Birthday: already checked today, skipping');
        return { sent: 0 };
    }
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();
    const currentDay = now.getUTCDate();
    const pointsStr = await getSettingValue(databases, 'birthdayPoints');
    const points = pointsStr ? parseInt(pointsStr, 10) : 100;
    log(`Birthday: checking for birthdays on ${currentMonth + 1}/${currentDay}, awarding ${points} points`);
    const allUsers = (await listAllDocuments(databases, DATABASE_ID, USER_PROFILES_TABLE_ID, []));
    let sent = 0;
    for (const user of allUsers) {
        if (!user.dob || !user.authID)
            continue;
        if (user.birthdayNotifYear === currentYear)
            continue;
        const dob = new Date(user.dob);
        if (dob.getUTCMonth() !== currentMonth || dob.getUTCDate() !== currentDay)
            continue;
        log(`Birthday: sending to user ${user.$id}`);
        await sendPushNotificationToUsers(messaging, [user.authID], 'HAPPY BIRTHDAY!', `We wish you a very happy birthday, from all of us here at SampleFinder! As a gift, we've awarded you ${points} points.`, log, { type: 'Engagement' });
        const currentPoints = user.totalPoints ?? 0;
        try {
            await databases.updateDocument(DATABASE_ID, USER_PROFILES_TABLE_ID, user.$id, {
                birthdayNotifYear: currentYear,
                totalPoints: currentPoints + points,
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            log(`Birthday: failed to update user ${user.$id}: ${msg}`);
        }
        sent++;
    }
    await setSettingValue(databases, 'birthdayCheckLastRun', todayStr);
    log(`Birthday: sent ${sent} notification(s)`);
    return { sent };
}
/**
 * HAPPY SAMPLING ANNIVERSARY
 * Sends anniversary push + awards configurable points on the user's join date anniversary.
 * Uses `anniversaryNotifYear` to send once per year. Only triggers after at least 1 full year.
 */
async function checkAndSendAnniversaryNotifications(databases, messaging, log) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const lastRun = await getSettingValue(databases, 'anniversaryCheckLastRun');
    if (lastRun === todayStr) {
        log('Anniversary: already checked today, skipping');
        return { sent: 0 };
    }
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();
    const currentDay = now.getUTCDate();
    const pointsStr = await getSettingValue(databases, 'anniversaryPoints');
    const points = pointsStr ? parseInt(pointsStr, 10) : 200;
    log(`Anniversary: checking for join-date anniversaries on ${currentMonth + 1}/${currentDay}, awarding ${points} points`);
    const allUsers = (await listAllDocuments(databases, DATABASE_ID, USER_PROFILES_TABLE_ID, []));
    let sent = 0;
    for (const user of allUsers) {
        if (!user.$createdAt || !user.authID)
            continue;
        if (user.anniversaryNotifYear === currentYear)
            continue;
        const createdAt = new Date(user.$createdAt);
        if (createdAt.getUTCMonth() !== currentMonth || createdAt.getUTCDate() !== currentDay)
            continue;
        const yearsOnPlatform = currentYear - createdAt.getUTCFullYear();
        if (yearsOnPlatform < 1)
            continue;
        log(`Anniversary: sending to user ${user.$id} (${yearsOnPlatform} year(s))`);
        await sendPushNotificationToUsers(messaging, [user.authID], 'HAPPY SAMPLING ANNIVERSARY!', `Congratulations on reaching a full new year of sampling with SampleFinder! As a gift, we've awarded you ${points} points.`, log, { type: 'Engagement' });
        const currentPoints = user.totalPoints ?? 0;
        try {
            await databases.updateDocument(DATABASE_ID, USER_PROFILES_TABLE_ID, user.$id, {
                anniversaryNotifYear: currentYear,
                totalPoints: currentPoints + points,
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            log(`Anniversary: failed to update user ${user.$id}: ${msg}`);
        }
        sent++;
    }
    await setSettingValue(databases, 'anniversaryCheckLastRun', todayStr);
    log(`Anniversary: sent ${sent} notification(s)`);
    return { sent };
}
/**
 * YOU'VE BEEN MISSING SAMPLES
 * Sends re-engagement push to users who haven't logged in for 30+ days.
 * Re-sends every 30 days of continued inactivity using `lastInactivityNotifAt`.
 */
async function checkAndSendInactivityNotifications(databases, messaging, users, log) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const lastRun = await getSettingValue(databases, 'inactivityCheckLastRun');
    if (lastRun === todayStr) {
        log('Inactivity: already checked today, skipping');
        return { sent: 0 };
    }
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(now.getTime() - thirtyDaysMs);
    log(`Inactivity: checking for users inactive since before ${cutoffDate.toISOString()}`);
    const allProfiles = (await listAllDocuments(databases, DATABASE_ID, USER_PROFILES_TABLE_ID, []));
    const AUTH_BATCH_SIZE = 50;
    let sent = 0;
    for (let i = 0; i < allProfiles.length; i += AUTH_BATCH_SIZE) {
        const batch = allProfiles.slice(i, i + AUTH_BATCH_SIZE);
        const authIds = batch.map((u) => u.authID).filter(Boolean);
        if (authIds.length === 0)
            continue;
        let authUsersMap;
        try {
            const authResult = await users.list([
                Query.equal('$id', authIds),
                Query.limit(AUTH_BATCH_SIZE),
            ]);
            authUsersMap = new Map(authResult.users.map((au) => [au.$id, { accessedAt: au.accessedAt }]));
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            log(`Inactivity: failed to fetch auth users batch: ${msg}`);
            continue;
        }
        for (const profile of batch) {
            if (!profile.authID)
                continue;
            const authUser = authUsersMap.get(profile.authID);
            if (!authUser?.accessedAt)
                continue;
            const lastAccess = new Date(authUser.accessedAt);
            if (lastAccess >= cutoffDate)
                continue;
            if (profile.lastInactivityNotifAt) {
                const lastNotif = new Date(profile.lastInactivityNotifAt);
                if (now.getTime() - lastNotif.getTime() < thirtyDaysMs)
                    continue;
            }
            log(`Inactivity: sending to user ${profile.$id} (last access: ${authUser.accessedAt})`);
            await sendPushNotificationToUsers(messaging, [profile.authID], "YOU'VE BEEN MISSING SAMPLES!", 'Enjoy experiencing new brands, earning points and winning prizes!', log, { type: 'Engagement' });
            try {
                await databases.updateDocument(DATABASE_ID, USER_PROFILES_TABLE_ID, profile.$id, { lastInactivityNotifAt: now.toISOString() });
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                log(`Inactivity: failed to update user ${profile.$id}: ${msg}`);
            }
            sent++;
        }
    }
    await setSettingValue(databases, 'inactivityCheckLastRun', todayStr);
    log(`Inactivity: sent ${sent} notification(s)`);
    return { sent };
}
/**
 * BADGE EARNED NOTIFICATION
 * Sends a push notification when an admin assigns ambassador or influencer badge.
 * Called via POST /send-badge-notification.
 */
async function sendBadgeNotification(databases, messaging, userId, badgeType, log) {
    void messaging;
    log(`Badge notification: scheduling ${badgeType} badge notification for auth user ${userId}`);
    const title = badgeType === 'ambassador'
        ? 'BRAND AMBASSADOR BADGE EARNED!'
        : 'INFLUENCER BADGE EARNED!';
    const body = badgeType === 'ambassador'
        ? "Congratulations, you're an official SampleFinder Brand Ambassador!"
        : 'Congratulations on earning your SampleFinder Influencer badge!';
    const profileResult = await databases.listDocuments(DATABASE_ID, USER_PROFILES_TABLE_ID, [Query.equal('authID', userId), Query.limit(1)]);
    if (profileResult.documents.length === 0) {
        throw new Error('Badge notification target profile not found');
    }
    const profile = profileResult.documents[0];
    const scheduledAt = getNextOnePmEasternUTC();
    await databases.createDocument(DATABASE_ID, NOTIFICATIONS_TABLE_ID, ID.unique(), {
        title,
        message: body,
        type: 'Engagement',
        targetAudience: 'Targeted',
        category: 'AppPush',
        status: 'Scheduled',
        scheduledAt,
        recipients: 0,
        selectedUserIds: [profile.$id],
    });
    log(`Badge notification: scheduled for ${scheduledAt} UTC`);
    return { success: true, sentCount: 0 };
}
/**
 * TIER CHANGED NOTIFICATION
 * Sends a push notification when a user's tier changes (e.g. via admin panel).
 * Called via POST /send-tier-notification.
 */
async function sendTierNotification(databases, messaging, userId, newTierName, oldTierName, log) {
    void messaging;
    log(`Tier notification: scheduling tierChanged notification for auth user ${userId}`);
    const title = `NEW TIER: ${newTierName}!`;
    const body = `Congratulations, you've reached the ${newTierName} tier! Keep earning points to level up!`;
    const profileResult = await databases.listDocuments(DATABASE_ID, USER_PROFILES_TABLE_ID, [Query.equal('authID', userId), Query.limit(1)]);
    if (profileResult.documents.length === 0) {
        throw new Error('Tier notification target profile not found');
    }
    const profile = profileResult.documents[0];
    const scheduledAt = getNextOnePmEasternUTC();
    await databases.createDocument(DATABASE_ID, NOTIFICATIONS_TABLE_ID, ID.unique(), {
        title,
        message: body,
        type: 'Engagement',
        targetAudience: 'Targeted',
        category: 'AppPush',
        status: 'Scheduled',
        scheduledAt,
        recipients: 0,
        selectedUserIds: [profile.$id],
    });
    log(`Tier notification: scheduled for ${scheduledAt} UTC`);
    return { success: true, sentCount: 0 };
}
/**
 * Archive events that completed more than 7 days ago (endTime < now - 7 days).
 * Runs on the same cron schedule as event reminders and scheduled notifications.
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
            Query.limit(500),
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
        const appwriteUsers = new Users(client);
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
                let body;
                if (typeof req.body === 'string') {
                    body = JSON.parse(req.body);
                }
                else if (req.body && typeof req.body === 'object') {
                    body = req.body;
                }
                else {
                    throw new Error('Request body is required');
                }
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
        // Handle badge notification endpoint (triggered by admin portal)
        if (req.path === '/send-badge-notification' && req.method === 'POST') {
            log('Processing send-badge-notification request');
            let requestBody;
            try {
                let body;
                if (typeof req.body === 'string') {
                    body = JSON.parse(req.body);
                }
                else if (req.body && typeof req.body === 'object') {
                    body = req.body;
                }
                else {
                    throw new Error('Request body is required');
                }
                if (!body.userId || typeof body.userId !== 'string') {
                    throw new Error('userId is required and must be a string');
                }
                if (body.badgeType !== 'ambassador' && body.badgeType !== 'influencer') {
                    throw new Error('badgeType must be "ambassador" or "influencer"');
                }
                requestBody = {
                    userId: body.userId,
                    badgeType: body.badgeType,
                };
            }
            catch (validationError) {
                const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
                error(`Validation error: ${errorMessage}`);
                return res.json({ success: false, error: errorMessage }, 400);
            }
            const result = await sendBadgeNotification(databases, messaging, requestBody.userId, requestBody.badgeType, log);
            return res.json(result);
        }
        // Handle tier notification endpoint (triggered by admin portal)
        if (req.path === '/send-tier-notification' && req.method === 'POST') {
            log('Processing send-tier-notification request');
            let requestBody;
            try {
                let body;
                if (typeof req.body === 'string') {
                    body = JSON.parse(req.body);
                }
                else if (req.body && typeof req.body === 'object') {
                    body = req.body;
                }
                else {
                    throw new Error('Request body is required');
                }
                if (!body.userId || typeof body.userId !== 'string') {
                    throw new Error('userId is required and must be a string');
                }
                if (!body.newTierName || typeof body.newTierName !== 'string') {
                    throw new Error('newTierName is required and must be a string');
                }
                requestBody = {
                    userId: body.userId,
                    newTierName: body.newTierName,
                    oldTierName: typeof body.oldTierName === 'string' && body.oldTierName.trim().length > 0
                        ? body.oldTierName
                        : undefined,
                };
            }
            catch (validationError) {
                const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
                error(`Validation error: ${errorMessage}`);
                return res.json({ success: false, error: errorMessage }, 400);
            }
            const result = await sendTierNotification(databases, messaging, requestBody.userId, requestBody.newTierName, requestBody.oldTierName, log);
            return res.json(result);
        }
        // Handle scheduled execution: event reminders + due scheduled notifications
        // Triggered by: Appwrite cron (path / or empty) or manual GET /check-event-reminders
        const isScheduledRun = req.path === '/check-event-reminders' ||
            req.path === '/' ||
            req.path === '';
        if (isScheduledRun) {
            log('Processing scheduled run: event reminders + scheduled notifications');
            const { hour: easternHour } = getTimePartsInTimezone(new Date(), EST_TIMEZONE);
            if (easternHour !== NOTIFICATION_SEND_HOUR_EST) {
                log(`Skipping scheduled notification processing. Current ET hour is ${easternHour}; notifications only send at 1:00 PM ET.`);
                return res.json({
                    success: true,
                    skipped: true,
                    reason: 'Outside 1:00 PM ET notification send window',
                });
            }
            // 1. Send due scheduled notifications (status=Scheduled, scheduledAt <= now)
            const scheduledResult = await checkAndSendScheduledNotifications(databases, messaging, log);
            log(`Scheduled notifications: sent=${scheduledResult.sent}, failed=${scheduledResult.failed}`);
            // 2. Check and send event reminders (24h / 1h)
            const remindersResult = await checkAndSendEventReminders(databases, messaging, log);
            log(`Event reminders: 24h=${remindersResult.reminders24h}, 1h=${remindersResult.reminders1h}`);
            // 3. Auto-archive events that completed more than 7 days ago
            const archiveResult = await archiveEventsCompletedOver7DaysAgo(databases, log);
            log(`Auto-archive events: ${archiveResult.archived}`);
            // 4. Trivia Tuesday (sends once per Tuesday)
            const triviaTuesdayResult = await checkAndSendTriviaTuesday(databases, messaging, log);
            log(`Trivia Tuesday: sent=${triviaTuesdayResult.sent}`);
            // 5. Sampling Today (morning of event day)
            const samplingTodayResult = await checkAndSendSamplingToday(databases, messaging, log);
            log(`Sampling Today: sent=${samplingTodayResult.sent}`);
            // 6. Happy Birthday (once per year per user)
            const birthdayResult = await checkAndSendBirthdayNotifications(databases, messaging, log);
            log(`Birthday: sent=${birthdayResult.sent}`);
            // 7. Happy Sampling Anniversary (once per year per user)
            const anniversaryResult = await checkAndSendAnniversaryNotifications(databases, messaging, log);
            log(`Anniversary: sent=${anniversaryResult.sent}`);
            // 8. Inactivity re-engagement (30+ days inactive)
            const inactivityResult = await checkAndSendInactivityNotifications(databases, messaging, appwriteUsers, log);
            log(`Inactivity: sent=${inactivityResult.sent}`);
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
                triviaTuesday: {
                    sent: triviaTuesdayResult.sent,
                },
                samplingToday: {
                    sent: samplingTodayResult.sent,
                },
                birthday: {
                    sent: birthdayResult.sent,
                },
                anniversary: {
                    sent: anniversaryResult.sent,
                },
                inactivity: {
                    sent: inactivityResult.sent,
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
