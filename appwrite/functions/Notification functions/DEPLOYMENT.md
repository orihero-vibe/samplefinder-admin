# Event Reminders - Deployment Guide

## Prerequisites

Before deploying, ensure you have:

1. ✅ Appwrite CLI installed: `npm install -g appwrite-cli`
2. ✅ Appwrite CLI logged in: `appwrite login`
3. ✅ Access to the SampleFinder Appwrite project
4. ✅ Push notification providers configured in Appwrite (FCM, APNS)

## Deployment Steps

### Step 1: Update Database Schema

You need to add new fields to the database tables.

#### Option A: Using Appwrite CLI (Recommended)

```bash
cd appwrite
appwrite push collections
```

This will apply all schema changes from `appwrite.config.json`.

#### Option B: Manually via Appwrite Console

If CLI push doesn't work, add fields manually:

**User Profiles Table:**
1. Navigate to: Databases > Sample Finder DB > user_profiles
2. Click "Add Attribute"
3. Add `savedEventIds`:
   - Type: String
   - Size: 1000000
   - Required: No
   - Default: null

**Events Table:**
1. Navigate to: Databases > Sample Finder DB > events
2. Click "Add Attribute"
3. Add `reminder24hSent`:
   - Type: Boolean
   - Required: No
   - Default: false
4. Add `reminder1hSent`:
   - Type: Boolean
   - Required: No
   - Default: false
5. Add `location` (if not exists):
   - Type: Point (Geographic coordinates)
   - Required: No

### Step 2: Deploy the Function

```bash
# Navigate to the appwrite directory
cd appwrite

# Deploy the Notification functions
appwrite deploy function 695d55bb002bc6b75430

# Or deploy all functions
appwrite deploy function
```

The deployment will:
- Upload the updated function code
- Set the schedule to `*/15 * * * *` (every 15 minutes)
- Enable the function

### Step 3: Verify Deployment

#### 3.1 Check Function Status

In Appwrite Console:
1. Go to **Functions** > **Notification functions**
2. Verify:
   - ✅ Status: **Enabled**
   - ✅ Schedule: ***/15 * * * *** (every 15 minutes)
   - ✅ Runtime: **node-22**

#### 3.2 Test Manual Execution

You can manually trigger the reminder check:

**Option A: Via Appwrite Console**
1. Go to Functions > Notification functions
2. Click "Execute now"
3. In the JSON body, add:
   ```json
   {
     "path": "/check-event-reminders"
   }
   ```
4. Click "Execute"
5. Check the execution logs

**Option B: Via API**
```bash
curl -X POST \
  'https://nyc.cloud.appwrite.io/v1/functions/695d55bb002bc6b75430/executions' \
  -H 'Content-Type: application/json' \
  -H 'X-Appwrite-Project: 691d4a54003b21bf0136' \
  -H 'X-Appwrite-Key: YOUR_API_KEY' \
  -d '{"path": "/check-event-reminders"}'
```

#### 3.3 Check Execution Logs

1. Go to Functions > Notification functions > **Executions**
2. Click on the latest execution
3. Look for logs like:
   ```
   Starting event reminder check...
   Found X total events
   Event "{name}" needs 24h reminder
   Sending 24h reminder to X users
   Reminder check complete. 24h reminders: X, 1h reminders: Y
   ```

### Step 4: Test with Real Data

#### Create a Test Event

1. Go to your admin dashboard
2. Create a new event with:
   - **Name**: "Test Event - 24h Reminder"
   - **Start Time**: Exactly 24 hours from now (or 1 hour for 1h test)
   - **Location**: Any address
3. Note the event ID

#### Add Event to Test User

Using Appwrite Console or API, update a test user's `savedEventIds`:

```json
[
  {
    "eventId": "YOUR_EVENT_ID",
    "addedAt": "2026-01-25T12:00:00.000Z"
  }
]
```

**Via Appwrite Console:**
1. Go to Databases > Sample Finder DB > user_profiles
2. Find a test user
3. Edit the `savedEventIds` field
4. Paste the JSON above (replace YOUR_EVENT_ID)

**Via API:**
```bash
curl -X PATCH \
  'https://nyc.cloud.appwrite.io/v1/databases/69217af50038b9005a61/collections/user_profiles/documents/USER_ID' \
  -H 'Content-Type: application/json' \
  -H 'X-Appwrite-Project: 691d4a54003b21bf0136' \
  -H 'X-Appwrite-Key: YOUR_API_KEY' \
  -d '{
    "savedEventIds": "[{\"eventId\":\"YOUR_EVENT_ID\",\"addedAt\":\"2026-01-25T12:00:00.000Z\"}]"
  }'
```

#### Wait for Execution

The function runs every 15 minutes. Wait for the next scheduled execution or trigger manually.

#### Verify Reminder Sent

1. Check function execution logs for success messages
2. Check the event document - `reminder24hSent` should be `true`
3. Check push notification on the test user's device

## Monitoring

### View Execution History

```bash
# Using Appwrite CLI
appwrite functions listExecutions --functionId 695d55bb002bc6b75430

# View specific execution logs
appwrite functions getExecution --functionId 695d55bb002bc6b75430 --executionId EXECUTION_ID
```

### Key Metrics to Monitor

In Appwrite Console (Functions > Notification functions):

1. **Execution Success Rate**: Should be close to 100%
2. **Execution Duration**: Should be < 15 seconds for normal loads
3. **Error Count**: Should be 0 or very low
4. **Logs**: Check for error messages

### Common Log Messages

✅ **Success Logs:**
```
Starting event reminder check...
Found 25 total events
Event "Sample Event" needs 24h reminder
Found 15 users with event saved
Sending 24h reminder to 15 users
Push notification created with ID: xyz, status: processing
Reminder check complete. 24h reminders: 15, 1h reminders: 0
```

❌ **Error Logs:**
```
Error parsing savedEventIds for user abc123
Error processing event xyz: {error message}
Failed to send push notification: {error message}
```

## Troubleshooting

### Issue: Function not executing

**Check:**
- Function is enabled
- Schedule is set: `*/15 * * * *`
- Function has no deployment errors

**Fix:**
```bash
# Redeploy function
cd appwrite
appwrite deploy function 695d55bb002bc6b75430
```

### Issue: Reminders not being sent

**Check:**
1. Events have correct start time (24h or 1h in future)
2. Users have event in `savedEventIds`
3. User has valid `authID`
4. Push notification provider is configured

**Debug:**
```bash
# Run local test script
cd "appwrite/functions/Notification functions"
npm run test:reminders
```

### Issue: Duplicate reminders

**Check:**
- `reminder24hSent` and `reminder1hSent` flags are being updated
- Event documents show `true` after reminder sent

**Fix:**
- Manually set flags to `true` on events that already received reminders

### Issue: No users found with saved events

**Verify:**
- User profiles have `savedEventIds` field populated
- `savedEventIds` is valid JSON: `[{"eventId":"...", "addedAt":"..."}]`
- Event IDs match exactly

## Rollback

If you need to rollback:

### Disable Scheduled Execution

```bash
# Via Appwrite Console
# Go to Functions > Notification functions
# Toggle "Enabled" to OFF

# Or update schedule to empty via CLI
appwrite functions update --functionId 695d55bb002bc6b75430 --schedule ""
```

### Remove Database Fields (Optional)

Only if you want to completely remove the feature:

```bash
# Via Appwrite Console
# Navigate to Databases > Sample Finder DB
# Delete attributes: savedEventIds, reminder24hSent, reminder1hSent
```

## Production Checklist

Before going live:

- [ ] Database schema deployed
- [ ] Function deployed successfully
- [ ] Function schedule verified: `*/15 * * * *`
- [ ] Function enabled
- [ ] Push notification providers configured (FCM/APNS)
- [ ] Test execution successful
- [ ] Test reminder received on device
- [ ] Monitoring alerts configured
- [ ] Documentation reviewed

## Support

For issues:
1. Check function execution logs
2. Run local test script: `npm run test:reminders`
3. Verify database schema
4. Check push notification provider status

## Next Steps

After deployment:
1. Monitor execution logs for first 24 hours
2. Verify reminders are sent correctly
3. Check user feedback on reminder timing
4. Consider adding analytics to track:
   - Reminder open rates
   - User engagement after reminders
   - Opt-out rates
