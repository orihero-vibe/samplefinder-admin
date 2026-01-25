# Event Reminders Implementation

## Overview

This implementation adds automated event reminder functionality to the SampleFinder application. Users who add events to their calendar will receive push notifications at 24 hours and 1 hour before the event starts.

## Architecture

### Database Schema Changes

#### User Profiles Table (`user_profiles`)
- **New Field**: `savedEventIds` (string, optional)
  - Stores JSON string containing array of saved events
  - Format: `[{"eventId": "string", "addedAt": "ISO8601 timestamp"}]`

#### Events Table (`events`)
- **New Field**: `reminder24hSent` (boolean, default: false)
  - Tracks if the 24-hour reminder has been sent
- **New Field**: `reminder1hSent` (boolean, default: false)
  - Tracks if the 1-hour reminder has been sent
- **New Field**: `location` (point, optional)
  - Geographic coordinates for the event location

### Notification Functions

The Notification Functions Appwrite Function has been enhanced with:

1. **Scheduled Execution**: Runs every 15 minutes (cron: `*/15 * * * *`)
2. **New Endpoint**: `/check-event-reminders`
3. **New Functions**:
   - `checkAndSendEventReminders()`: Main function that checks for upcoming events
   - `sendEventReminderToUsers()`: Sends reminders to users who saved specific events

## How It Works

### Scheduled Execution Flow

1. **Every 15 minutes**, the Notification Function automatically executes
2. The function calculates time windows:
   - **24-hour window**: Current time + 24h ± 15 minutes
   - **1-hour window**: Current time + 1h ± 15 minutes
3. Fetches all events from the database
4. For each event:
   - Checks if event falls within the 24h window and `reminder24hSent` is false
   - Checks if event falls within the 1h window and `reminder1hSent` is false
5. For events needing reminders:
   - Queries all users who have the event in their `savedEventIds`
   - Extracts user `authID`s
   - Sends push notification via Appwrite Messaging
   - Updates event document to mark reminder as sent

### Reminder Message Format

**24-Hour Reminder:**
- Title: `Event Reminder: {Event Name}`
- Body: `Your saved event "{Event Name}" starts in 24 hours! Location: {Address}, {City}`

**1-Hour Reminder:**
- Title: `Event Reminder: {Event Name}`
- Body: `Your saved event "{Event Name}" starts in 1 hour! Location: {Address}, {City}`

## Manual Testing

You can manually trigger the reminder check by calling the function endpoint:

```bash
# Using curl
curl -X GET https://nyc.cloud.appwrite.io/v1/functions/695d55bb002bc6b75430/executions \
  -H "X-Appwrite-Project: 691d4a54003b21bf0136" \
  -H "X-Appwrite-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"path": "/check-event-reminders"}'
```

Or via the Appwrite Console:
1. Go to Functions > Notification functions
2. Click "Execute now"
3. Set path to `/check-event-reminders`

## Deployment

### 1. Update Database Schema

Apply the schema changes in `appwrite.config.json`:

```bash
# From the appwrite directory
appwrite push collections
```

Or manually add the fields via Appwrite Console:
- Navigate to Databases > Sample Finder DB
- Update `user_profiles` table: Add `savedEventIds` (string, 1000000 size)
- Update `events` table: Add `reminder24hSent` and `reminder1hSent` (boolean)

### 2. Deploy Function

```bash
# From the appwrite directory
appwrite deploy function

# Or deploy specific function
appwrite deploy function 695d55bb002bc6b75430
```

### 3. Verify Schedule

In Appwrite Console:
1. Go to Functions > Notification functions
2. Verify "Schedule" shows: `*/15 * * * *`
3. Check "Enabled" is ON

## Monitoring

### Logs

View function execution logs in Appwrite Console:
- Functions > Notification functions > Executions

Key log messages:
- `Starting event reminder check...`
- `Found X total events`
- `Event "{name}" needs 24h reminder`
- `Sending {type} reminder to X users`
- `Reminder check complete. 24h reminders: X, 1h reminders: Y`

### Verification

To verify reminders are working:

1. **Create a test event** with startTime 24 hours from now
2. **Add event to a test user's savedEventIds**:
   ```json
   [{"eventId": "EVENT_ID", "addedAt": "2026-01-25T12:00:00.000Z"}]
   ```
3. **Wait for the next scheduled execution** (max 15 minutes)
4. **Check function logs** for reminder sending
5. **Verify push notification** on user's device

## Error Handling

- If event parsing fails, logs error and continues to next event
- If user savedEventIds parsing fails, logs error and continues to next user
- If reminder sending fails, error is logged but doesn't crash the function
- Duplicate reminders prevented by `reminder24hSent` and `reminder1hSent` flags

## Performance Considerations

- Function runs every 15 minutes (96 times per day)
- Each execution queries all events and users
- For large datasets, consider:
  - Adding indexes on `date` and `startTime` fields
  - Filtering events by date range in queries
  - Pagination for large user lists
  - Caching frequently accessed data

## Future Enhancements

Potential improvements:
1. Custom reminder times (e.g., user preference for 2h, 30m, etc.)
2. Reminder preferences (opt-in/opt-out per user)
3. Multiple notification channels (email, SMS)
4. Event-specific reminder settings
5. Reminder history tracking table
6. Analytics on reminder open rates
