# User Blocking Implementation - Appwrite Auth Integration

## Overview

This implementation updates the user blocking functionality to block users in **both** Appwrite Auth and the `user_profiles` collection. Previously, blocking only updated the `isBlocked` field in the user profile, but the user could still authenticate. Now, when a user is blocked, their Appwrite Auth account is disabled, preventing authentication entirely.

## Changes Made

### 1. Mobile API Function (Appwrite Function)

**File:** `appwrite/functions/Mobile API/src/main.ts`

#### Added New Type Definition
```typescript
interface UpdateUserStatusRequest {
  userId: string;
  block: boolean;
}
```

#### Added New Function: `updateUserStatus`
This server-side function updates both the Appwrite Auth status and the user profile:

- **Input Parameters:**
  - `userId` (string): The Appwrite Auth user ID (authID)
  - `block` (boolean): `true` to block, `false` to unblock

- **Process:**
  1. Verifies the user exists in Appwrite Auth
  2. Updates the user's auth status (`users.updateStatus()`)
     - When `block=true`: Sets status to `false` (disabled)
     - When `block=false`: Sets status to `true` (enabled)
  3. Queries the `user_profiles` collection by `authID`
  4. Updates the `isBlocked` field in the user profile
  5. If profile update fails, reverts the auth status (rollback)

- **Returns:**
  ```json
  {
    "success": true,
    "message": "User successfully blocked/unblocked"
  }
  ```

#### Added New Endpoint: `/update-user-status`
- **Method:** POST
- **Body:**
  ```json
  {
    "userId": "auth_user_id",
    "block": true
  }
  ```

### 2. Admin Services (Frontend)

**File:** `src/lib/services.ts`

#### Updated Functions: `blockUser` and `unblockUser`

Both functions now:
1. Retrieve the user profile document to get the `authID`
2. Call the Mobile API function's `/update-user-status` endpoint
3. Pass the `authID` (not the user_profile document ID)

### 3. Configuration Updates

#### Appwrite Config
**File:** `appwrite/appwrite.config.json`

- Added `users.write` scope to the Mobile API function (required for `updateStatus` API call)

#### Environment Variables
**Files:** `.env` and `.env.example`

- Added `VITE_APPWRITE_MOBILE_API_FUNCTION_ID=69308117000e7a96bcbb`

**File:** `src/lib/appwrite.ts`

- Added `mobileApiFunctionId` to the `appwriteConfig` object

## Deployment Steps

### 1. Deploy the Mobile API Function

```bash
# Navigate to the Mobile API function directory
cd appwrite/functions/Mobile\ API

# Install dependencies (if needed)
npm install

# Build the function
npm run build

# Deploy using Appwrite CLI
appwrite push functions
```

Or use the Appwrite Console to deploy the function manually.

### 2. Update Environment Variables

Ensure the following environment variable is set in your production environment:

```env
VITE_APPWRITE_MOBILE_API_FUNCTION_ID=69308117000e7a96bcbb
```

### 3. Verify Function Permissions

In the Appwrite Console, verify that the Mobile API function has the following scopes:
- `users.read`
- `users.write`
- `databases.read`
- `databases.write`

### 4. Deploy the Admin Panel

```bash
# Build the admin panel
yarn build

# Deploy to your hosting platform
```

## Testing

### Test Blocking a User

1. Log into the admin panel
2. Navigate to the Users page
3. Select a user and click "Block User"
4. Verify:
   - Success notification appears
   - User's `isBlocked` field is set to `true` in `user_profiles`
   - User's status is set to `false` (disabled) in Appwrite Auth
5. Try to log in as the blocked user - authentication should fail

### Test Unblocking a User

1. In the admin panel, select a blocked user
2. Click "Unblock User"
3. Verify:
   - Success notification appears
   - User's `isBlocked` field is set to `false` in `user_profiles`
   - User's status is set to `true` (enabled) in Appwrite Auth
4. Try to log in as the unblocked user - authentication should succeed

### Check Function Logs

In the Appwrite Console:
1. Go to Functions → Mobile API → Executions
2. Find the `/update-user-status` executions
3. Review logs for any errors or issues

## API Reference

### POST /update-user-status

**Request Body:**
```json
{
  "userId": "string",  // Appwrite Auth user ID (authID)
  "block": boolean      // true to block, false to unblock
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User successfully blocked" // or "User successfully unblocked"
}
```

**Error Responses:**

- **400 Bad Request:**
  ```json
  {
    "success": false,
    "error": "userId and block (boolean) are required"
  }
  ```

- **404 Not Found:**
  ```json
  {
    "success": false,
    "error": "User not found in authentication system"
  }
  ```

- **500 Internal Server Error:**
  ```json
  {
    "success": false,
    "error": "Failed to update user profile: [error details]"
  }
  ```

## Rollback Mechanism

The implementation includes a rollback mechanism:
- If updating the user profile fails after updating the auth status, the auth status is reverted
- This ensures data consistency between Appwrite Auth and the user_profiles collection

## Notes

- The `blockUser` and `unblockUser` functions expect the **user_profile document ID** as input
- These functions internally retrieve the `authID` from the user profile
- The Mobile API function expects the **authID** (Appwrite Auth user ID)
- Blocking a user in Appwrite Auth prevents them from authenticating entirely
- The Mobile API function can only be called from server-side or with the admin panel's authenticated context

## Troubleshooting

### User Can Still Login After Being Blocked

1. Check the Appwrite Auth user status in the Appwrite Console (Auth → Users)
2. Verify the user's status is set to `false` (disabled)
3. Check the Mobile API function logs for errors
4. Ensure the function has the `users.write` scope

### Function Returns 500 Error

1. Check the function logs in the Appwrite Console
2. Verify the user profile exists in the `user_profiles` collection
3. Ensure the `authID` field in the user profile matches the Auth user ID
4. Verify the function has the required scopes

### "Mobile API function ID is not configured" Error

1. Ensure `VITE_APPWRITE_MOBILE_API_FUNCTION_ID` is set in your `.env` file
2. Rebuild your application after updating environment variables
3. Verify the function ID matches the one in Appwrite Console
