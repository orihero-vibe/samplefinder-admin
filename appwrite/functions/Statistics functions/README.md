# Statistics Function

Cloud Function for retrieving statistics for various admin dashboard pages in SampleFinder.

## Endpoints

### POST /get-statistics

Retrieves statistics for a specific dashboard page.

#### Request Body

```json
{
  "page": "dashboard"
}
```

**Parameters:**

- `page` (required): The page to get statistics for. Valid values:
  - `dashboard` - Main dashboard statistics
  - `clients` - Clients/Brands statistics
  - `users` - Users statistics
  - `notifications` - Notification settings statistics
  - `trivia` - Trivia management statistics

#### Response

**Success (200):**

The response structure varies based on the requested page:

**Dashboard:**

```json
{
  "success": true,
  "page": "dashboard",
  "statistics": {
    "totalClientsBrands": 173,
    "totalPointsAwarded": 134215,
    "totalUsers": 5000,
    "averagePPU": 925,
    "totalCheckins": 13000,
    "reviews": 11520,
    "totalClientsBrandsChange": 12,
    "totalPointsAwardedChange": 8,
    "totalUsersChange": 15,
    "averagePPUChange": 5,
    "totalCheckinsChange": 10,
    "reviewsChange": 7
  }
}
```

**Clients:**

```json
{
  "success": true,
  "page": "clients",
  "statistics": {
    "totalClients": 250,
    "newThisMonth": 167
  }
}
```

**Users:**

```json
{
  "success": true,
  "page": "users",
  "statistics": {
    "totalUsers": 5000,
    "avgPoints": 925,
    "newThisWeek": 167,
    "usersInBlacklist": 167
  }
}
```

**Notifications:**

```json
{
  "success": true,
  "page": "notifications",
  "statistics": {
    "totalSent": 2000,
    "avgOpenRate": 65,
    "avgClickRate": 48,
    "scheduled": 167
  }
}
```

**Trivia:**

```json
{
  "success": true,
  "page": "trivia",
  "statistics": {
    "totalQuizzes": 2000,
    "scheduled": 167,
    "active": 167,
    "completed": 167
  }
}
```

**Error (400):**

```json
{
  "success": false,
  "error": "page parameter is required. Valid values: dashboard, clients, users, notifications, trivia"
}
```

**Error (500):**

```json
{
  "success": false,
  "error": "Internal server error"
}
```

### GET /ping

Health check endpoint.

**Response:**

```
Pong
```

## Statistics Details

### Dashboard Statistics

#### totalClientsBrands

- **Description**: Total count of clients/brands in the system
- **Calculation**: Count of all rows in the `clients` table
- **Source**: `clients` table
- **Formula**: `COUNT(clients)`

#### totalPointsAwarded

- **Description**: Sum of all actual points awarded to users from reviews and check-ins
- **Calculation**:
  1. Sum all `pointsEarned` values from the `reviews` table (actual points awarded for reviews)
  2. Sum points from check-ins:
     - If `checkins` table has a `points` field: Sum all `points` values directly
     - If `checkins` table has an `event` relationship: For each check-in, fetch the related event's `checkInPoints` and add it to the total
- **Source**: `reviews` table (`pointsEarned` field) + `checkins` table (via `points` field or `event` relationship → `checkInPoints`)
- **Formula**:
  ```
  totalPointsAwarded = SUM(reviews.pointsEarned) + SUM(checkins.points OR event.checkInPoints)
  ```
- **Note**: This calculates actual points awarded, not potential points from event configurations

#### totalUsers

- **Description**: Total count of user profiles in the system
- **Calculation**: Count of all rows in the `user_profiles` table
- **Source**: `user_profiles` table
- **Formula**: `COUNT(user_profiles)`

#### averagePPU (Average Points Per User)

- **Description**: Average points earned per user across all users
- **Calculation**: Total points awarded divided by total number of users
- **Source**: Calculated from `totalPointsAwarded` and `totalUsers`
- **Formula**:
  ```
  averagePPU = ROUND(totalPointsAwarded / totalUsers)
  ```
- **Example**: If 134,215 points were awarded to 5,000 users:
  ```
  averagePPU = 134,215 ÷ 5,000 = 26.84 → 27 (rounded)
  ```
- **Use Case**: Helps track user engagement and points distribution across the user base

#### totalCheckins

- **Description**: Total count of check-ins recorded in the system
- **Calculation**: Count of all rows in the `checkins` table
- **Source**: `checkins` table
- **Formula**: `COUNT(checkins)`

#### reviews

- **Description**: Total count of reviews submitted by users
- **Calculation**: Count of all rows in the `reviews` table
- **Source**: `reviews` table
- **Formula**: `COUNT(reviews)`

#### Change Percentages

- **Description**: Percentage change from the previous month for various metrics
- **Calculation**:
  ```
  change = ROUND(((currentValue - previousValue) / previousValue) * 100)
  ```
- **Source**: Compares current totals with totals from the previous month
- **Note**: Currently calculated for `totalClientsBrands` and `totalUsers`. Other metrics show `0` until date-based filtering is implemented.

### Clients/Brands Statistics

#### totalClients

- **Description**: Total count of clients/brands in the system
- **Calculation**: Count of all rows in the `clients` table
- **Source**: `clients` table
- **Formula**: `COUNT(clients)`

#### newThisMonth

- **Description**: Count of new clients/brands created during the current month
- **Calculation**: Count of clients where `$createdAt` is between the first and last day of the current month
- **Source**: `clients` table filtered by `$createdAt` date range
- **Formula**:
  ```
  COUNT(clients WHERE $createdAt >= firstDayOfMonth AND $createdAt <= lastDayOfMonth)
  ```

### Users Statistics

#### totalUsers

- **Description**: Total count of user profiles in the system
- **Calculation**: Count of all rows in the `user_profiles` table
- **Source**: `user_profiles` table
- **Formula**: `COUNT(user_profiles)`

#### avgPoints

- **Description**: Average points per user (same as averagePPU in dashboard)
- **Calculation**: Total points awarded divided by total number of users
- **Source**: Calculated from sum of points from `reviews` and `checkins` tables divided by `totalUsers`
- **Formula**:
  ```
  avgPoints = ROUND(SUM(reviews.pointsEarned + checkins.points) / COUNT(user_profiles))
  ```

#### newThisWeek

- **Description**: Count of new users created during the current week (Monday to Sunday)
- **Calculation**: Count of users where `$createdAt` is between Monday and Sunday of the current week
- **Source**: `user_profiles` table filtered by `$createdAt` date range
- **Formula**:
  ```
  COUNT(user_profiles WHERE $createdAt >= mondayOfWeek AND $createdAt <= sundayOfWeek)
  ```

#### usersInBlacklist

- **Description**: Count of users who are blocked/blacklisted
- **Calculation**: Count of users where `isBlocked = true`
- **Source**: `user_profiles` table filtered by `isBlocked` field
- **Formula**:
  ```
  COUNT(user_profiles WHERE isBlocked = true)
  ```

### Notifications Statistics

#### totalSent

- **Description**: Total count of notifications sent to users
- **Calculation**: Count of all rows in the `notifications` table
- **Source**: `notifications` table
- **Formula**: `COUNT(notifications)`

#### avgOpenRate

- **Description**: Average open rate percentage across all notifications
- **Calculation**: Currently returns a placeholder value of 65%
- **Source**: Placeholder - requires notification tracking fields in the `notifications` table
- **Note**: To implement actual calculation, add fields like `openedCount` and `sentCount` to the `notifications` table, then calculate:
  ```
  avgOpenRate = (SUM(openedCount) / SUM(sentCount)) * 100
  ```

#### avgClickRate

- **Description**: Average click rate percentage across all notifications
- **Calculation**: Currently returns a placeholder value of 48%
- **Source**: Placeholder - requires notification tracking fields in the `notifications` table
- **Note**: To implement actual calculation, add fields like `clickedCount` and `sentCount` to the `notifications` table, then calculate:
  ```
  avgClickRate = (SUM(clickedCount) / SUM(sentCount)) * 100
  ```

#### scheduled

- **Description**: Count of notifications scheduled for future delivery
- **Calculation**: Currently returns total count (placeholder)
- **Source**: `notifications` table
- **Note**: To implement actual calculation, add a `scheduledAt` or `sendDate` field to the `notifications` table, then filter:
  ```
  COUNT(notifications WHERE scheduledAt > NOW())
  ```

### Trivia Statistics

#### totalQuizzes

- **Description**: Total count of trivia quizzes in the system
- **Calculation**: Count of all rows in the `trivia` table
- **Source**: `trivia` table
- **Formula**: `COUNT(trivia)`

#### scheduled

- **Description**: Count of trivia quizzes scheduled to start in the future
- **Calculation**: Count of quizzes where `startDate` is greater than the current date/time
- **Source**: `trivia` table filtered by `startDate` field
- **Formula**:
  ```
  COUNT(trivia WHERE startDate > NOW())
  ```

#### active

- **Description**: Count of trivia quizzes currently active (started but not ended)
- **Calculation**: Count of quizzes where current date/time is between `startDate` and `endDate`
- **Source**: `trivia` table filtered by `startDate` and `endDate` fields
- **Formula**:
  ```
  COUNT(trivia WHERE startDate <= NOW() AND endDate >= NOW())
  ```

#### completed

- **Description**: Count of trivia quizzes that have ended
- **Calculation**: Count of quizzes where `endDate` is less than the current date/time
- **Source**: `trivia` table filtered by `endDate` field
- **Formula**:
  ```
  COUNT(trivia WHERE endDate < NOW())
  ```

## Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node.js 22    |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install` |
| Permissions       | See below     |
| Timeout (Seconds) | 15            |

### Required Permissions

The function requires the following Appwrite API key scopes:

- `databases.read` - To read all database tables
- `tables.read` - To read table metadata
- `rows.read` - To read table rows

### Environment Variables

The function uses the following environment variables (automatically provided by Appwrite Cloud Functions):

- `APPWRITE_FUNCTION_API_ENDPOINT` - Appwrite API endpoint
- `APPWRITE_FUNCTION_PROJECT_ID` - Appwrite project ID
- `APPWRITE_FUNCTION_KEY` - API key with required scopes

### Database Configuration

The function uses the following constants (hardcoded in the function):

- Database ID: `69217af50038b9005a61`
- Table IDs:
  - `clients` - Clients/Brands table
  - `user_profiles` - User profiles table
  - `events` - Events table
  - `reviews` - Reviews table
  - `trivia` - Trivia table
  - `checkins` - Check-ins table
  - `notifications` - Notifications table

## Error Handling

The function handles the following error cases:

1. **Invalid Request Body**: Returns 400 with validation error message
2. **Missing API Key**: Returns 500 with configuration error
3. **Database Errors**: Logs error and returns 500 with error message
4. **Invalid Page Parameter**: Returns 400 with list of valid values

## Performance Considerations

- Statistics are calculated on-demand for each request
- For large datasets, consider implementing caching
- Date range queries use Appwrite Query filters for efficiency
- All statistics calculations are performed server-side

## Testing

### Example Request

```bash
curl -X POST https://your-function-url/get-statistics \
  -H "Content-Type: application/json" \
  -d '{
    "page": "dashboard"
  }'
```

### Example Response

The response includes:

- Success status
- Requested page identifier
- Statistics object with all relevant metrics

## Calculation Details

### Points Calculation Logic

The `totalPointsAwarded` calculation uses a flexible approach to handle different check-in table structures:

1. **Reviews Points**: Always sums the `pointsEarned` field from the `reviews` table
2. **Check-ins Points**:
   - **Option 1**: If `checkins` table has a `points` field, sums it directly
   - **Option 2**: If `checkins` table has an `event` relationship, fetches each event's `checkInPoints` and adds it
   - Handles both string IDs and populated relationship objects

### Date Range Calculations

- **This Month**: First day of current month 00:00:00 to last day 23:59:59
- **Last Month**: First day of previous month 00:00:00 to last day 23:59:59
- **This Week**: Monday 00:00:00 to Sunday 23:59:59 of current week (ISO week standard)

### Error Handling in Calculations

- Missing or invalid data is handled gracefully (defaults to 0)
- Database errors for individual records are logged but don't stop the entire calculation
- Division by zero is prevented (e.g., `averagePPU` returns 0 if `totalUsers` is 0)

## Notes

- Date ranges are calculated based on current server time (UTC)
- Percentage changes compare current totals with previous period totals
- Some statistics (like notification open/click rates) require additional fields in the database
- The function uses Appwrite TablesDB API (`listDocuments`) for all database operations
- All calculations are performed server-side for accuracy and security
- The function handles both populated relationships and string IDs for foreign key references

## Database Schema Requirements

### Required Fields

- **reviews** table: `pointsEarned` (integer)
- **events** table: `checkInPoints` (double), `reviewPoints` (double)
- **user_profiles** table: `isBlocked` (boolean), `$createdAt` (datetime)
- **trivia** table: `startDate` (datetime), `endDate` (datetime)
- **checkins** table: Either `points` (number) field OR `event` (relationship) field

### Optional Fields (for future enhancements)

- **notifications** table: `openedCount`, `clickedCount`, `scheduledAt` fields
- **checkins** table: `points` field (if not using event relationship)
