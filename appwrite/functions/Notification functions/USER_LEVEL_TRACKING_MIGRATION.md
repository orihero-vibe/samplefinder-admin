# Migration to User-Level Reminder Tracking

## Overview

The event reminder system has been upgraded from **event-level tracking** to **user-level tracking**. This document explains the changes and migration path.

---

## Why User-Level Tracking?

### Problem with Event-Level Tracking

**Old Behavior:**
```
Event: "Music Festival" on Jan 27 at 2:00 PM

Jan 26, 2:00 PM (24h before)
├─ User A has event saved
├─ Function runs: Sends 24h reminder to User A ✅
└─ Event marked: reminder24hSent = TRUE

Jan 26, 3:00 PM (23h before)
├─ User B saves event NOW
└─ Event still marked: reminder24hSent = TRUE

Result: User B never gets 24h reminder ❌
        (But would still get 1h reminder if they saved before that)
```

### Solution: User-Level Tracking

**New Behavior:**
```
Event: "Music Festival" on Jan 27 at 2:00 PM

Jan 26, 2:00 PM (24h before)
├─ User A has event saved (reminder24hSent: false)
├─ Function runs: Sends 24h reminder to User A ✅
└─ User A's savedEventIds: reminder24hSent = TRUE

Jan 26, 3:00 PM (23h before)
├─ User B saves event NOW (reminder24hSent: false)
└─ User A still has: reminder24hSent = TRUE

Jan 27, 1:00 PM (1h before)
├─ Function runs
├─ User A: reminder1hSent = false → Gets 1h reminder ✅
└─ User B: reminder1hSent = false → Gets 1h reminder ✅

Result: Each user gets all reminders they're eligible for ✅
```

---

## Technical Changes

### Data Structure Changes

**Before (Event-Level):**

```typescript
// In Events Collection
{
  "$id": "event123",
  "name": "Music Festival",
  "startTime": "2026-01-27T14:00:00Z",
  "reminder24hSent": false,  // ← Event-level flag
  "reminder1hSent": false     // ← Event-level flag
}

// In User Profiles
{
  "$id": "user456",
  "savedEventIds": "[{\"eventId\":\"event123\",\"addedAt\":\"...\"}]"
}
```

**After (User-Level):**

```typescript
// In Events Collection
{
  "$id": "event123",
  "name": "Music Festival",
  "startTime": "2026-01-27T14:00:00Z"
  // No reminder flags here anymore
}

// In User Profiles
{
  "$id": "user456",
  "savedEventIds": "[{\"eventId\":\"event123\",\"addedAt\":\"...\",\"reminder24hSent\":false,\"reminder1hSent\":false}]"
  //                                                                 ↑ User-level flags
}
```

### Code Changes

**Function Logic:**

| Aspect | Event-Level | User-Level |
|--------|-------------|------------|
| Loop over | Events | Users |
| Check flags on | Event document | User's savedEventIds |
| Update flags in | Event document | User's savedEventIds |
| Send to | All users at once | One user at a time |

---

## Migration Steps

### 1. Update Function Code ✅ DONE

The function has been rewritten to:
- Loop through users instead of events
- Check reminder flags in each user's `savedEventIds`
- Update flags in user documents, not event documents

### 2. Deploy Updated Function

```bash
cd appwrite
appwrite deploy function 695d55bb002bc6b75430
```

### 3. Verify Deployment

- Check function logs for "user-level tracking" messages
- Test with a user who saves an event after another user already has it

### 4. (Optional) Clean Up Event Schema

The event-level fields are no longer used and can be removed:

```bash
# Remove from appwrite.config.json:
# - events.reminder24hSent
# - events.reminder1hSent

# Then push schema changes:
appwrite push collections
```

**Note:** It's safe to leave these fields in place - they just won't be used anymore.

---

## Backward Compatibility

### Existing User Data

**Existing users without reminder flags:**
```json
// Old format (still works!)
{
  "eventId": "event123",
  "addedAt": "2026-01-25T10:00:00Z"
}
```

**What happens:**
- Missing `reminder24hSent` defaults to `false` → User gets reminder ✅
- Missing `reminder1hSent` defaults to `false` → User gets reminder ✅

**No migration needed for existing data!**

### Mobile App Changes

**If your mobile app adds events, update it to include flags:**

```typescript
// Old way (still works)
const savedEvents = [
  {
    eventId: eventId,
    addedAt: new Date().toISOString()
  }
];

// New way (recommended)
const savedEvents = [
  {
    eventId: eventId,
    addedAt: new Date().toISOString(),
    reminder24hSent: false,  // Explicitly set
    reminder1hSent: false
  }
];
```

**But it's not required!** The function handles missing flags gracefully.

---

## Testing the New Behavior

### Test Scenario: Late Event Save

1. **Create a test event** starting in 25 hours
2. **User A saves it** now
3. **Wait for 24h reminder** to be sent to User A
4. **User B saves it** 1 hour later
5. **Wait for 1h reminder** (23 hours later)
6. **Verify:** Both users should receive the 1h reminder

### Test with Script

```bash
cd "appwrite/functions/Notification functions"
npm run test:reminders
```

Look for user-level reminder flag status in the output.

---

## Performance Considerations

### Before (Event-Level)
- Loop through events: O(E) where E = number of events
- For each event, find users: O(U) where U = number of users
- **Total:** O(E × U) operations

### After (User-Level)
- Loop through users: O(U)
- For each user, loop through saved events: O(S) where S = avg saved events per user
- Lookup event by ID: O(1) with Map
- **Total:** O(U × S) operations

**In practice:** User-level is actually **faster** for most scenarios because:
- S (saved events per user) is typically small (5-20)
- E (total events) is typically large (hundreds/thousands)
- Most events don't have users who saved them

---

## Rollback Plan

If you need to rollback to event-level tracking:

1. Restore the previous version of `main.ts`
2. Deploy the previous function version
3. The event-level flags in the database should still be intact

**Note:** Any reminders sent during user-level tracking period would have updated user flags, not event flags.

---

## Support

For issues or questions:
- Check function execution logs
- Run `npm run test:reminders` for diagnostic info
- Review this document and `IMPLEMENTATION_SUMMARY.md`

---

## Summary

✅ **User-level tracking is better because:**
- Users who save events late still get remaining reminders
- More intuitive behavior
- Better user experience
- Same performance or better

✅ **Migration is smooth:**
- No breaking changes
- Backward compatible with existing data
- No mobile app updates required (though recommended)
- Can rollback if needed
