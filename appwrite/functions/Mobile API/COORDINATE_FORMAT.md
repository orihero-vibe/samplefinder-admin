# Coordinate Format Documentation

## Issue Summary

The distance calculation was producing incorrect results because coordinates were being stored and accessed in the wrong order.

## Correct Format

All coordinates in the system are now stored as **`[latitude, longitude]`**:

```typescript
location: [latitude, longitude]
```

### Example
For New York City:
- Latitude: 40.7128
- Longitude: -74.0060
- Stored as: `[40.7128, -74.0060]`

## Changes Made

### 1. Mobile API Function (`main.js` and `main.ts`)

**Before (INCORRECT):**
```javascript
// Assumed [longitude, latitude] (GeoJSON format)
const [clientLon, clientLat] = clientData.location;
distance = haversineDistance(userLat, userLon, clientLat, clientLon);
```

**After (CORRECT):**
```javascript
// location is stored as [latitude, longitude]
const [clientLat, clientLon] = clientData.location;
distance = haversineDistance(userLat, userLon, clientLat, clientLon);
```

### 2. Admin Panel - Services (`services.ts`)

**Before (INCORRECT):**
```typescript
// Stored as [longitude, latitude]
dbData.location = [data.longitude, data.latitude]
```

**After (CORRECT):**
```typescript
// Store as [latitude, longitude]
dbData.location = [data.latitude, data.longitude]
```

### 3. Admin Panel - Client Modals

**Before (INCORRECT):**
```typescript
// Map click stored as [longitude, latitude]
const point: [number, number] = [lng, lat]
```

**After (CORRECT):**
```typescript
// Store as [latitude, longitude]
const point: [number, number] = [lat, lng]
```

## API Request Format

The `/get-events-by-location` endpoint expects:

```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "page": 1,
  "pageSize": 10
}
```

## Database Schema

### Client Collection
```typescript
{
  name: string
  logoURL?: string
  productType?: string[]
  city?: string
  address?: string
  state?: string
  zip?: string
  location?: [number, number]  // [latitude, longitude]
}
```

## Haversine Distance Function

The `haversineDistance` function expects parameters in this order:

```javascript
haversineDistance(lat1, lon1, lat2, lon2)
```

- `lat1`: User's latitude
- `lon1`: User's longitude
- `lat2`: Client's latitude
- `lon2`: Client's longitude

Returns distance in kilometers.

## Testing

To verify the fix is working correctly, check the function logs:

```
Fetching events for location: lat=40.7128, lon=-74.0060, page=1, pageSize=10
Client ABC Store: location=[40.7589, -73.9851], user=[40.7128, -74.0060]
Calculated distance: 7.42 km
```

The logs now show:
1. Input coordinates received from the request
2. Client location and user location being compared
3. Calculated distance in kilometers

## Migration Note

**Important:** Any existing client records in the database that were created before this fix may have coordinates stored in the wrong order `[longitude, latitude]`. These will need to be manually corrected or migrated.

To identify affected records:
1. Check if latitude values are outside the range -90 to 90
2. Check if longitude values are outside the range -180 to 180
3. If coordinates appear swapped (e.g., latitude looks like longitude), update the record

## Why Not GeoJSON Format?

While GeoJSON typically uses `[longitude, latitude]`, we chose `[latitude, longitude]` because:
1. It's more intuitive (matches how humans typically say coordinates)
2. It matches the order used in the API requests
3. It's consistent with most mapping libraries (e.g., Leaflet uses `[lat, lng]`)
4. It simplifies the codebase by keeping one consistent format throughout
