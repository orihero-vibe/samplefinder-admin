# Event Functions

Cloud Functions for handling event-related operations in SampleFinder.

## Endpoints

### POST /get-events-by-location

Retrieves upcoming active events sorted by proximity to the user's current location.

#### Request Body

```json
{
  "latitude": 37.785834,
  "longitude": -122.406417,
  "page": 1,
  "pageSize": 10
}
```

**Parameters:**
- `latitude` (required): User's latitude (-90 to 90)
- `longitude` (required): User's longitude (-180 to 180)
- `page` (optional): Page number (default: 1, minimum: 1)
- `pageSize` (optional): Items per page (default: 10, range: 1-100)

#### Response

**Success (200):**

```json
{
  "success": true,
  "events": [
    {
      "$id": "event_id",
      "name": "Event Name",
      "date": "2024-01-15T00:00:00.000Z",
      "startTime": "10:00",
      "endTime": "18:00",
      "city": "San Francisco",
      "address": "123 Main St",
      "state": "CA",
      "zipCode": "94102",
      "productType": ["electronics"],
      "products": "Sample products",
      "discount": 20,
      "discountImageURL": "https://...",
      "checkInCode": "ABC123",
      "checkInPoints": 100,
      "reviewPoints": 50,
      "eventInfo": "Event description",
      "isArchived": false,
      "isHidden": false,
      "categories": "category1",
      "client": {
        "$id": "client_id",
        "name": "Client Name",
        "logoURL": "https://...",
        "productType": ["electronics"],
        "city": "San Francisco",
        "address": "123 Main St",
        "state": "CA",
        "zip": "94102",
        "location": [-122.406417, 37.785834]
      },
      "distance": 2.5
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

**Error (400):**

```json
{
  "success": false,
  "error": "latitude must be a valid number"
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

## Implementation Details

### Relationship Population

The function uses Appwrite TablesDB's `Query.select()` to populate the `client` relationship:

```typescript
Query.select(['*', 'client.*'])
```

This ensures that:
- All event fields are returned (`*`)
- The related client data is fully populated (`client.*`)
- No additional API calls are needed to fetch client information
- The relationship is handled efficiently at the database level

### Distance Calculation

Events are sorted by distance using the Haversine formula, which calculates the great-circle distance between two points on Earth:

- Distance is calculated between the user's location and the client's location
- Results are sorted in ascending order (nearest first)
- Distance is returned in kilometers
- Events without valid client locations are filtered out

### Filtering

The function filters events based on:
- `isArchived = false`: Only active events
- `isHidden = false`: Only visible events
- `date >= today`: Only upcoming events

### Pagination

- Default page size: 10 items
- Maximum page size: 100 items
- Results are paginated after sorting by distance
- Pagination metadata includes total count and total pages

## Configuration

| Setting           | Value         |
| ----------------- | ------------- |
| Runtime           | Node.js       |
| Entrypoint        | `src/main.js` |
| Build Commands    | `npm install` |
| Permissions       | See below     |
| Timeout (Seconds) | 15            |

### Required Permissions

The function requires the following Appwrite API key scopes:
- `databases.read` - To read events and clients tables
- `databases.read` on the specific database and tables

### Environment Variables

The function uses the following environment variables (automatically provided by Appwrite Cloud Functions):

- `APPWRITE_FUNCTION_API_ENDPOINT` - Appwrite API endpoint
- `APPWRITE_FUNCTION_PROJECT_ID` - Appwrite project ID
- `APPWRITE_FUNCTION_KEY` - API key with required scopes

### Database Configuration

The function uses the following constants (hardcoded in the function):

- Database ID: `69217af50038b9005a61`
- Events Table ID: `events`
- Clients Table ID: `clients`

## Error Handling

The function handles the following error cases:

1. **Invalid Request Body**: Returns 400 with validation error message
2. **Missing API Key**: Returns 500 with configuration error
3. **Database Errors**: Logs error and continues (skips problematic events)
4. **Missing Client Data**: Events without valid client relationships are filtered out

## Performance Considerations

- The function fetches all matching events before sorting (necessary for distance calculation)
- For large datasets, consider implementing server-side distance filtering
- Client relationships are populated in a single query using `Query.select()`
- Events without valid client locations are excluded from results

## Testing

### Example Request

```bash
curl -X POST https://your-function-url/get-events-by-location \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 37.785834,
    "longitude": -122.406417,
    "page": 1,
    "pageSize": 10
  }'
```

### Example Response

The response includes:
- Events sorted by distance (nearest first)
- Fully populated client data for each event
- Distance in kilometers from user location
- Pagination metadata

## Notes

- Events are sorted by distance after fetching all matching records
- Only events with valid client location data are returned
- The `client` relationship must be properly configured in Appwrite TablesDB
- Distance calculation uses the Haversine formula (accurate for most use cases)
