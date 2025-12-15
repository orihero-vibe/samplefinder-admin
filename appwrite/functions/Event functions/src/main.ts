import { Client, Databases } from 'node-appwrite';

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the distance between two points on Earth using the Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Validate coordinates
 * @param latitude - Latitude value
 * @param longitude - Longitude value
 * @returns True if coordinates are valid
 */
function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Interface for request payload
 */
interface RequestPayload {
  latitude?: number;
  longitude?: number;
  limit?: number; // Deprecated: use page and pageSize instead
  page?: number; // Page number (1-based)
  pageSize?: number; // Number of items per page
}

/**
 * Interface for event with distance
 */
interface EventWithDistance {
  [key: string]: any;
  distance: number;
}

/**
 * Interface for client document
 */
interface ClientDocument {
  $id: string;
  location?: [number, number]; // Point type: [longitude, latitude]
  [key: string]: any;
}

/**
 * Interface for event document
 */
interface EventDocument {
  $id: string;
  client?: string; // Client relationship ID
  [key: string]: any;
}

/**
 * Appwrite Cloud Function: Get Events Sorted by User Location
 *
 * This function fetches events from the database and sorts them by distance
 * from the user's provided location using the related client's location.
 */
export default async ({ req, res, log, error }) => {
  try {
    // Parse request body using req.bodyJson (following Appwrite documentation)
    let payload: RequestPayload = {};
    try {
      if (req.bodyJson) {
        payload = req.bodyJson as RequestPayload;
      } else if (req.bodyText) {
        payload = JSON.parse(req.bodyText) as RequestPayload;
      }
    } catch (parseError) {
      log('Error parsing request body: ' + (parseError as Error).message);
      return res.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        400
      );
    }

    const { latitude, longitude, limit, page, pageSize } = payload;

    // Validate required parameters
    if (latitude === undefined || longitude === undefined) {
      return res.json(
        {
          success: false,
          error: 'Missing required parameters: latitude and longitude are required',
        },
        400
      );
    }

    // Validate coordinate values
    if (!isValidCoordinate(latitude, longitude)) {
      return res.json(
        {
          success: false,
          error:
            'Invalid coordinates: latitude must be between -90 and 90, longitude must be between -180 and 180',
        },
        400
      );
    }

    // Validate and set pagination parameters
    const defaultPageSize = 20;
    const maxPageSize = 100;
    const minPageSize = 1;
    
    let currentPage = page !== undefined ? Math.max(1, Math.floor(page)) : 1;
    let itemsPerPage = pageSize !== undefined 
      ? Math.max(minPageSize, Math.min(maxPageSize, Math.floor(pageSize))) 
      : defaultPageSize;

    // If legacy limit is provided, use it as pageSize and set page to 1
    if (limit !== undefined && limit > 0 && page === undefined && pageSize === undefined) {
      itemsPerPage = Math.max(minPageSize, Math.min(maxPageSize, Math.floor(limit)));
      currentPage = 1;
      log('Using deprecated "limit" parameter. Please use "page" and "pageSize" instead.');
    }

    // Get environment variables
    const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
    const apiKey = req.headers['x-appwrite-key'] ?? '';

    // Validate Appwrite configuration
    if (!endpoint || !projectId || !apiKey) {
      error('Server configuration error: Missing Appwrite environment variables or API key');
      return res.json(
        {
          success: false,
          error: 'Server configuration error: Missing Appwrite environment variables',
        },
        500
      );
    }

    // Database and collection IDs
    const databaseId = '69217af50038b9005a61';
    const eventsTableId = 'events';
    const clientsTableId = 'clients';

    // Initialize Appwrite client
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);

    const databases = new Databases(client);

    // Fetch all events from the database
    let events: EventDocument[];
    try {
      const response = await databases.listRows(databaseId, eventsTableId);
      events = (response.rows || []) as EventDocument[];
      log(`Fetched ${events.length} events from database`);
    } catch (dbError) {
      error('Error fetching events: ' + (dbError as Error).message);
      return res.json(
        {
          success: false,
          error: 'Failed to fetch events from database',
          details: (dbError as Error).message,
        },
        500
      );
    }

    // Fetch clients to get their locations
    let clients: Map<string, ClientDocument> = new Map();
    try {
      const clientsResponse = await databases.listRows(databaseId, clientsTableId);
      const clientsList = (clientsResponse.rows || []) as ClientDocument[];
      clientsList.forEach((client) => {
        clients.set(client.$id, client);
      });
      log(`Fetched ${clients.size} clients from database`);
    } catch (clientError) {
      error('Error fetching clients: ' + (clientError as Error).message);
      // Continue execution even if clients fetch fails - events without clients will be filtered out
    }

    // Calculate distance for each event and filter out events without location
    const eventsWithDistance: EventWithDistance[] = events
      .map((event) => {
        // Get client ID from event
        const clientId = event.client;

        // Skip events without a client relationship
        if (!clientId) {
          return null;
        }

        // Get client document
        const client = clients.get(clientId);

        // Skip events without a client document
        if (!client) {
          return null;
        }

        // Extract location from client
        // Clients use Point type: [longitude, latitude]
        const location = client.location;

        // Skip events without location coordinates
        if (!location || !Array.isArray(location) || location.length !== 2) {
          return null;
        }

        const [clientLon, clientLat] = location;

        // Validate client coordinates
        if (!isValidCoordinate(clientLat, clientLon)) {
          return null;
        }

        // Calculate distance from user's location to client's location
        const distance = calculateDistance(latitude, longitude, clientLat, clientLon);

        // Return event with distance field
        return {
          ...event,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        } as EventWithDistance;
      })
      .filter((event): event is EventWithDistance => event !== null); // Remove events without valid location

    // Sort events by distance (nearest first)
    eventsWithDistance.sort((a, b) => a.distance - b.distance);

    // Calculate pagination metadata
    const totalItems = eventsWithDistance.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Ensure currentPage doesn't exceed totalPages
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = totalPages;
    }

    // Calculate pagination slice
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedEvents = eventsWithDistance.slice(startIndex, endIndex);

    // Calculate pagination info
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    log(
      `Returning page ${currentPage} of ${totalPages} (${paginatedEvents.length} events, out of ${totalItems} total with valid locations)`
    );

    // Return successful response with pagination
    return res.json(
      {
        success: true,
        events: paginatedEvents,
        pagination: {
          page: currentPage,
          pageSize: itemsPerPage,
          totalItems,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
        userLocation: {
          latitude,
          longitude,
        },
      },
      200
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    error('Unexpected error: ' + errorMessage);
    return res.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        details: errorMessage,
      },
      500
    );
  }
};

