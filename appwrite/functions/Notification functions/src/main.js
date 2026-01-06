import { Client, Databases } from 'node-appwrite';
// Constants
const DATABASE_ID = '69217af50038b9005a61';
const NOTIFICATIONS_TABLE_ID = 'notifications';
const USER_PROFILES_TABLE_ID = 'user_profiles';
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
 * Get target users based on audience type
 */
async function getTargetUsers(databases, targetAudience, log) {
    try {
        const queries = [];
        // For now, we'll fetch all users
        // In production, you might want to add filtering based on segments, preferences, etc.
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
 * Send push notification to a user
 * Note: This is a placeholder for actual push notification implementation
 * You can integrate with:
 * - Appwrite Messaging (when available)
 * - Firebase Cloud Messaging (FCM)
 * - Apple Push Notification Service (APNS)
 * - Or any other push notification service
 */
async function sendPushNotification(userId, title, body, log, data) {
    try {
        // TODO: Implement actual push notification sending
        // This could use:
        // 1. Appwrite Messaging API (when available)
        // 2. Direct FCM/APNS integration
        // 3. A third-party service like OneSignal, Pusher, etc.
        // For now, we'll just log that we would send the notification
        log(`Would send push notification to user ${userId}: ${title}`);
        // Placeholder: In production, implement actual push notification logic here
        // The 'data' parameter will be used when implementing actual push notifications
        // Example with FCM:
        // const fcm = require('firebase-admin');
        // await fcm.messaging().send({
        //   token: userFcmToken,
        //   notification: { title, body },
        //   data,
        // });
        // Suppress unused parameter warning for now (will be used in production)
        void data;
        return true;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error sending push notification to user ${userId}: ${errorMessage}`);
        return false;
    }
}
/**
 * Send notification to all target users
 */
async function sendNotification(databases, notificationId, log) {
    try {
        // Get notification data
        const notification = await getNotification(databases, notificationId, log);
        if (!notification) {
            throw new Error('Notification not found');
        }
        if (notification.status === 'Sent') {
            log('Notification already sent');
            return {
                success: true,
                recipients: notification.recipients || 0,
                errors: 0,
            };
        }
        // Get target users
        const users = await getTargetUsers(databases, notification.targetAudience, log);
        if (users.length === 0) {
            log('No target users found');
            return {
                success: true,
                recipients: 0,
                errors: 0,
            };
        }
        // Send notifications to all users
        let successCount = 0;
        let errorCount = 0;
        for (const user of users) {
            try {
                // Send push notification
                // Note: You may need to check if user has push notification tokens registered
                const sent = await sendPushNotification(user.authID, notification.title, notification.message, log, {
                    notificationId: notification.$id,
                    type: notification.type,
                });
                if (sent) {
                    successCount++;
                }
                else {
                    errorCount++;
                }
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                log(`Failed to send to user ${user.$id}: ${errorMessage}`);
                errorCount++;
            }
        }
        // Update notification status
        const now = new Date().toISOString();
        await databases.updateDocument(DATABASE_ID, NOTIFICATIONS_TABLE_ID, notificationId, {
            status: 'Sent',
            sentAt: now,
            recipients: successCount,
        });
        log(`Notification sent successfully. Recipients: ${successCount}, Errors: ${errorCount}`);
        return {
            success: true,
            recipients: successCount,
            errors: errorCount,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Error sending notification: ${errorMessage}`);
        throw error instanceof Error ? error : new Error(errorMessage);
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
            // Send notification
            const result = await sendNotification(databases, requestBody.notificationId, log);
            log(`Notification sent. Recipients: ${result.recipients}, Errors: ${result.errors}`);
            return res.json({
                ...result,
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
;
