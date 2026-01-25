# Testing Push Notifications - Setup Guide

## Prerequisites

Before testing, ensure:
1. ✅ Function is deployed
2. ✅ Push notification provider is configured (FCM/APNS)
3. ✅ You have a test user with a registered device token
4. ✅ You have access to Appwrite Console

---

## Test Setup Steps

### Step 1: Verify Push Notification Provider

**In Appwrite Console:**
1. Go to **Messaging** → **Providers**
2. Verify you have FCM (Android) or APNS (iOS) configured
3. Check provider status is **Enabled**

### Step 2: Prepare Test User

You need a user with:
- An `authID` (their Appwrite auth user ID)
- A registered device token (from mobile app)
- A `savedEventIds` field with test data

**Example user document in `user_profiles`:**
```json
{
  "$id": "user_profile_123",
  "authID": "67890abcdef",  // ← Must match auth user ID
  "name": "Test User",
  "savedEventIds": "[{\"eventId\":\"event123\",\"addedAt\":\"2026-01-25T10:00:00Z\",\"reminder24hSent\":false,\"reminder1hSent\":false}]"
}
```

### Step 3: Create Test Event

Create an event that starts in ~24 hours or ~1 hour:

**For 24h reminder test:**
```javascript
// Event starting 24 hours from now (±15 min window)
const startTime = new Date();
startTime.setHours(startTime.getHours() + 24);

// Event document
{
  "$id": "event123",
  "name": "Test Event - 24h Reminder",
  "startTime": startTime.toISOString(),
  "date": startTime.toISOString(),
  "city": "Test City",
  "address": "123 Test St",
  "isArchived": false,
  "isHidden": false
}
```

**For 1h reminder test:**
```javascript
// Event starting 1 hour from now (±15 min window)
const startTime = new Date();
startTime.setHours(startTime.getHours() + 1);

// Event document
{
  "$id": "event456",
  "name": "Test Event - 1h Reminder",
  "startTime": startTime.toISOString(),
  "date": startTime.toISOString(),
  "city": "Test City",
  "address": "456 Test Ave",
  "isArchived": false,
  "isHidden": false
}
```

### Step 4: Link User to Event

Update the test user's `savedEventIds` to include the test event:

```json
{
  "savedEventIds": "[{\"eventId\":\"event123\",\"addedAt\":\"2026-01-26T10:00:00Z\",\"reminder24hSent\":false,\"reminder1hSent\":false}]"
}
```

---

## Running Tests

### Test 1: Local Simulation (No actual push)

```bash
cd "appwrite/functions/Notification functions"
npm run test:reminders
```

**Expected output:**
```
✓ Test 1: Database Connection
  ✓ Successfully connected to database
  ✓ Found X events in database

✓ Test 2: Finding Upcoming Events
  Current time: 2026-01-26T10:00:00.000Z
  24h window: 2026-01-27T09:45:00.000Z to 2026-01-27T10:15:00.000Z
  (Note: Using user-level tracking...)

✓ Test 3: Checking Users with Saved Events
  👤 User user_profile_123:
     Auth ID: 67890abcdef
     Saved events: 1
     - Event event123:
       24h sent: false, 1h sent: false

✓ Test 4: Simulating User-Level Reminder Matching
  📬 Would send 24h reminder:
     Event: Test Event - 24h Reminder
     Recipients: 1 users
     Auth IDs: 67890abcdef

✅ All tests completed successfully!
```

### Test 2: Manual Function Execution (Actual push)

**Via Appwrite Console:**
1. Go to **Functions** → **Notification functions**
2. Click **"Execute now"**
3. Set path: `/check-event-reminders`
4. Click **Execute**
5. Go to **Logs** tab

**Expected logs:**
```
Starting event reminder check with user-level tracking...
Checking for events at 2026-01-26T10:00:00.000Z
24h window: 2026-01-27T09:45:00.000Z to 2026-01-27T10:15:00.000Z
1h window: 2026-01-26T10:45:00.000Z to 2026-01-26T11:15:00.000Z
Found 150 total events
Events in 24h window: 1, in 1h window: 0
Checking 1247 users for saved events
User user_profile_123 needs 24h reminder for event "Test Event - 24h Reminder"
Sending push notification to 1 users: "Event Reminder: Test Event - 24h Reminder"
Push notification created with ID: msg_xyz123, status: processing
Updated reminder flags for user user_profile_123
Reminder check complete. 24h reminders: 1, 1h reminders: 0
```

### Test 3: Verify Push Notification Sent

**Check in Appwrite Console:**
1. Go to **Messaging** → **Messages**
2. Look for recent message with title "Event Reminder: Test Event - 24h Reminder"
3. Check status (should be "Sent" or "Processing")
4. Check recipient count (should be 1)

**Check on Device:**
- Open your mobile app on the test device
- You should receive a push notification with:
  - **Title:** "Event Reminder: Test Event - 24h Reminder"
  - **Body:** "Your saved event 'Test Event - 24h Reminder' starts in 24 hours! Location: 123 Test St, Test City"

### Test 4: Verify User Data Updated

**Check user document:**
1. Go to **Databases** → **samplefinder** → **user_profiles**
2. Find your test user
3. Check `savedEventIds` field
4. The event should now have `reminder24hSent: true`

```json
[{
  "eventId": "event123",
  "addedAt": "2026-01-26T10:00:00Z",
  "reminder24hSent": true,  // ← Should be true now
  "reminder1hSent": false
}]
```

---

## Test 5: Test Late Event Save (User-Level Tracking)

This tests the NEW user-level tracking feature:

1. **Create event starting in 24 hours**
2. **User A saves it** (via your mobile app or manually update DB)
3. **Run function** (or wait for scheduled execution)
4. **Verify User A gets 24h reminder** ✅
5. **User B saves SAME event** (1 hour later)
6. **Wait 23 hours** (or adjust event time to be in 1h window)
7. **Run function again**
8. **Verify BOTH User A and User B get 1h reminder** ✅

**Expected behavior:**
- User A: Gets both reminders (saved early)
- User B: Misses 24h reminder (saved late), but gets 1h reminder

---

## Troubleshooting

### No Push Notification Received

**1. Check device has token registered:**
```
Database → user_profiles → Check authID matches auth user
Messaging → Users → Check user has target (device token)
```

**2. Check provider configuration:**
```
Messaging → Providers → Verify status is "Enabled"
Check FCM/APNS credentials are valid
```

**3. Check function logs for errors:**
```
Functions → Notification functions → Logs tab
Look for error messages
```

**4. Verify user is in time window:**
```
Event startTime should be within ±15 minutes of 24h or 1h from now
```

**5. Check reminder not already sent:**
```
User's savedEventIds should have reminder24hSent: false
```

### Function Errors

**"Failed to send push notification":**
- Provider not configured or disabled
- Invalid device tokens
- Provider credentials expired

**"Error parsing savedEventIds":**
- Invalid JSON in savedEventIds field
- Check field format matches expected structure

**"No users have saved event":**
- No users have this event in savedEventIds
- Check eventId matches exactly

---

## Quick Test Checklist

- [ ] Push notification provider configured and enabled
- [ ] Test user created with valid authID
- [ ] Test user has device token registered
- [ ] Test event created starting in ~24h or ~1h
- [ ] User's savedEventIds includes the test event ID
- [ ] Reminder flags set to false
- [ ] Function deployed successfully
- [ ] Execute function manually via console
- [ ] Check function execution logs
- [ ] Verify message created in Messaging tab
- [ ] Check push notification on device
- [ ] Verify user's reminder flags updated

---

## Testing Script for Quick Setup

Create test data via Appwrite Console or use this as a guide:

```javascript
// 1. Create test event (in Appwrite Console → Databases → events)
const testEvent = {
  name: "Test Concert",
  startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  city: "New York",
  address: "Madison Square Garden",
  isArchived: false,
  isHidden: false
};

// 2. Get the created event ID, then update user
// (in Appwrite Console → Databases → user_profiles)
const savedEventIds = JSON.stringify([{
  eventId: "YOUR_EVENT_ID_HERE",
  addedAt: new Date().toISOString(),
  reminder24hSent: false,
  reminder1hSent: false
}]);

// 3. Execute function and check logs!
```

---

## Expected Timeline

**For automated testing:**
1. Create event starting in 24h 5min from now
2. Function runs every 15 minutes
3. Within 15 minutes, reminder should be sent
4. Check logs and device

**For manual testing:**
1. Create event in correct time window
2. Execute function immediately
3. Check results instantly

---

## Success Indicators

✅ Function logs show "Reminder check complete"
✅ Function logs show "Push notification created with ID"
✅ Message appears in Messaging → Messages
✅ Message status is "Sent" or "Processing"
✅ Push notification appears on device
✅ User's savedEventIds shows reminder flag updated to true
✅ No errors in function logs
