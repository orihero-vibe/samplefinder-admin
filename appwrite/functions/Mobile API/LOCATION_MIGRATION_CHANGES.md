# Mobile API - Location Migration Changes

## Overview
Updated the Mobile API to use event locations instead of client/brand locations for proximity-based event searches.

## Changes Made

### 1. Updated Type Definitions

#### EventData Interface
Added `location` field to the `EventData` interface:
```typescript
interface EventData {
  // ... existing fields ...
  location?: [number, number]; // [longitude, latitude]
  // ... rest of fields ...
}
```

#### ClientData Interface
Marked location field as deprecated:
```typescript
interface ClientData {
  // ... existing fields ...
  location?: [number, number]; // [longitude, latitude] - DEPRECATED: Location moved to events
  // ... rest of fields ...
}
```

### 2. Updated Distance Calculation Logic

**Before:** Distance was calculated using `clientData.location`
**After:** Distance is now calculated using `event.location`

The logic flow is now:
1. Check if event has a `location` field
2. Extract longitude and latitude from the event's location array
3. Calculate distance from user's location to the event's location
4. Fetch client data separately (for display purposes only, not for distance)

### 3. Updated Event Filtering

**Before:** Events were filtered to require both a client AND a valid location
```typescript
const validEvents = eventsWithClients.filter(
  (event) => event.client !== null && event.distance !== Infinity
);
```

**After:** Events only need to have a valid location
```typescript
const validEvents = eventsWithClients.filter(
  (event) => event.distance !== Infinity
);
```

## Impact

### Mobile App
- Events will now be sorted by their actual event location, not the brand's headquarters
- More accurate proximity search results
- Events without location data will be excluded from results

### Backward Compatibility
- Client/brand data is still fetched and returned (for brand logo, name, etc.)
- The API structure remains the same
- No breaking changes to the response format

### Data Requirements
- **All events must now have a `location` field** to appear in the mobile app
- Events without `location` will be filtered out as invalid
- Make sure to add location data when creating/editing events in the admin panel

## Testing Checklist

- [ ] Verify events are sorted by distance from user location
- [ ] Confirm events without location are excluded
- [ ] Test with both array format `[lon, lat]` and GeoJSON format
- [ ] Verify client data (logo, name) still displays correctly
- [ ] Test pagination with location-based results

## Related Files
- Admin Panel: Event creation/edit modals include LocationPicker component
- Database: Events collection now has `location` field
- Services: `eventsService` in `src/lib/services.ts` handles location data
