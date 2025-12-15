import { Client, Databases, Query } from 'node-appwrite';
// Constants
const DATABASE_ID = '69217af50038b9005a61';
const EVENTS_TABLE_ID = 'events';
const CLIENTS_TABLE_ID = 'clients';
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE = 1;
/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const toRadians = (angle) => (Math.PI / 180) * angle;
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}
/**
 * Validate request body
 */
function validateRequestBody(body) {
    if (!body || typeof body !== 'object') {
        throw new Error('Request body is required');
    }
    if (typeof body.latitude !== 'number' || isNaN(body.latitude)) {
        throw new Error('latitude must be a valid number');
    }
    if (typeof body.longitude !== 'number' || isNaN(body.longitude)) {
        throw new Error('longitude must be a valid number');
    }
    if (body.latitude < -90 || body.latitude > 90) {
        throw new Error('latitude must be between -90 and 90');
    }
    if (body.longitude < -180 || body.longitude > 180) {
        throw new Error('longitude must be between -180 and 180');
    }
    const page = body.page !== undefined ? Number(body.page) : DEFAULT_PAGE;
    const pageSize = body.pageSize !== undefined ? Number(body.pageSize) : DEFAULT_PAGE_SIZE;
    if (page < 1 || !Number.isInteger(page)) {
        throw new Error('page must be a positive integer');
    }
    if (pageSize < 1 || !Number.isInteger(pageSize) || pageSize > 100) {
        throw new Error('pageSize must be a positive integer between 1 and 100');
    }
    return {
        latitude: body.latitude,
        longitude: body.longitude,
        page,
        pageSize,
    };
}
/**
 * Get events sorted by location
 */
async function getEventsByLocation(databases, userLat, userLon, page, pageSize, log) {
    // Get current date for filtering upcoming events
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayISO = today.toISOString();
    // Build queries for filtering events
    // Use Query.select to populate the client relationship
    const queries = [
        Query.equal('isArchived', false),
        Query.equal('isHidden', false),
        Query.greaterThanEqual('date', todayISO),
        Query.orderAsc('date'), // Order by date first
        Query.select(['*', 'client.*']), // Populate client relationship
    ];
    // Fetch all matching events (we need all to calculate distances)
    // Using table ID instead of collection ID for TablesDB
    const eventsResponse = await databases.listDocuments(DATABASE_ID, EVENTS_TABLE_ID, queries);
    const events = eventsResponse.documents;
    // Fetch client data for each event and calculate distances
    const eventsWithClients = [];
    for (const event of events) {
        let clientData = null;
        let distance = Infinity;
        if (event.client) {
            try {
                // Handle relationship field - could be string ID or populated object
                if (typeof event.client === 'string') {
                    // It's a string ID, fetch the client
                    const clientResponse = await databases.getDocument(DATABASE_ID, CLIENTS_TABLE_ID, event.client);
                    clientData = clientResponse;
                }
                else if (event.client && typeof event.client === 'object') {
                    // Relationship is already populated as an object (from Query.select)
                    const clientObj = event.client;
                    // Check if it has the structure of a populated relationship
                    if (clientObj.$id || clientObj.name) {
                        // It's a populated relationship object, use it directly
                        clientData = clientObj;
                    }
                    else {
                        // Try to extract ID from object
                        const clientId = clientObj.id || clientObj.$id;
                        if (clientId && typeof clientId === 'string') {
                            const clientResponse = await databases.getDocument(DATABASE_ID, CLIENTS_TABLE_ID, clientId);
                            clientData = clientResponse;
                        }
                    }
                }
                // Calculate distance if client has location
                if (clientData && clientData.location && Array.isArray(clientData.location) && clientData.location.length === 2) {
                    const [clientLon, clientLat] = clientData.location;
                    distance = haversineDistance(userLat, userLon, clientLat, clientLon);
                }
            }
            catch (err) {
                // Client not found or error fetching - skip this event or use null
                const clientInfo = typeof event.client === 'string'
                    ? event.client
                    : event.client?.$id || JSON.stringify(event.client).substring(0, 50);
                log(`Error fetching client ${clientInfo}: ${err?.message || err}`);
            }
        }
        eventsWithClients.push({
            ...event,
            client: clientData,
            distance,
        });
    }
    // Filter out events without valid client locations
    const validEvents = eventsWithClients.filter((event) => event.client !== null && event.distance !== Infinity);
    // Sort by distance (nearest first)
    validEvents.sort((a, b) => a.distance - b.distance);
    // Calculate pagination
    const total = validEvents.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedEvents = validEvents.slice(startIndex, endIndex);
    return {
        events: paginatedEvents,
        pagination: {
            page,
            pageSize,
            total,
            totalPages,
        },
    };
}
// Main function handler
export default async function handler({ req, res, log, error }) {
    try {
        // Initialize Appwrite client
        // Use environment variables provided by Appwrite Cloud Functions
        const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
        const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || '691d4a54003b21bf0136';
        // Try multiple ways to get the API key
        // 1. Environment variable (production)
        // 2. Request header (some configurations)
        // 3. Check all possible environment variable names
        const apiKey = process.env.APPWRITE_FUNCTION_KEY ||
            process.env.APPWRITE_API_KEY ||
            req.headers['x-appwrite-key'] ||
            req.headers['x-appwrite-function-key'] ||
            '';
        // Log for debugging
        log(`Endpoint: ${endpoint}`);
        log(`Project ID: ${projectId}`);
        log(`API Key present: ${apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No'}`);
        log(`Available env vars: ${Object.keys(process.env).filter(k => k.includes('APPWRITE')).join(', ')}`);
        if (!apiKey) {
            error('API key is missing. Available environment variables: ' + Object.keys(process.env).join(', '));
            error('Request headers: ' + JSON.stringify(Object.keys(req.headers)));
            return res.json({
                success: false,
                error: 'Server configuration error: API key missing. Please ensure the function has an API key configured in Appwrite Console.',
                debug: {
                    hasEndpoint: !!endpoint,
                    hasProjectId: !!projectId,
                    envVars: Object.keys(process.env).filter(k => k.includes('APPWRITE')),
                    headers: Object.keys(req.headers)
                }
            }, 500);
        }
        // Log configuration for debugging (don't log the actual API key)
        log(`Endpoint: ${endpoint}`);
        log(`Project ID: ${projectId}`);
        log(`API Key present: ${apiKey ? 'Yes' : 'No'}`);
        const client = new Client()
            .setEndpoint(endpoint)
            .setProject(projectId)
            .setKey(apiKey);
        const databases = new Databases(client);
        // Handle ping endpoint
        if (req.path === '/ping') {
            return res.text('Pong');
        }
        // Handle get events by location endpoint
        if (req.path === '/get-events-by-location' && req.method === 'POST') {
            log('Processing get-events-by-location request');
            // Parse and validate request body
            let requestBody;
            try {
                requestBody = validateRequestBody(req.body);
            }
            catch (validationError) {
                error(`Validation error: ${validationError.message}`);
                return res.json({
                    success: false,
                    error: validationError.message,
                }, 400);
            }
            log(`Fetching events for location: (${requestBody.latitude}, ${requestBody.longitude}), page: ${requestBody.page}, pageSize: ${requestBody.pageSize}`);
            // Get events sorted by location
            const result = await getEventsByLocation(databases, requestBody.latitude, requestBody.longitude, requestBody.page, requestBody.pageSize, log);
            log(`Found ${result.pagination.total} events, returning ${result.events.length} for page ${result.pagination.page}`);
            return res.json({
                success: true,
                ...result,
            });
        }
        // Default response
        return res.json({
            motto: 'Build like a team of hundreds_',
            learn: 'https://appwrite.io/docs',
            connect: 'https://appwrite.io/discord',
            getInspired: 'https://builtwith.appwrite.io',
        });
    }
    catch (err) {
        error(`Function error: ${err.message}`);
        console.error('Function error:', err);
        return res.json({
            success: false,
            error: err.message || 'Internal server error',
        }, 500);
    }
}
;
