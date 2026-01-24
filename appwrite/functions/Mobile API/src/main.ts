import { Client, Databases, Query, ID, Users } from 'node-appwrite';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Event-related types
interface GetEventsByLocationRequest {
  latitude: number;
  longitude: number;
  page?: number;
  pageSize?: number;
}

interface ClientData {
  $id: string;
  name: string;
  logoURL?: string;
  productType?: string[];
  city?: string;
  address?: string;
  state?: string;
  zip?: string;
  location?: [number, number]; // [longitude, latitude]
  [key: string]: unknown;
}

interface EventData {
  $id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  city: string;
  address: string;
  state: string;
  zipCode: string;
  productType?: string[];
  products: string;
  discount?: number;
  discountImageURL?: string;
  checkInCode: string;
  checkInPoints: number;
  reviewPoints: number;
  eventInfo: string;
  isArchived: boolean;
  isHidden: boolean;
  client?: string;
  categories?: string;
  [key: string]: unknown;
}

interface EventWithClient extends Omit<EventData, 'client'> {
  client: ClientData | null;
  distance: number;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface EventsResponseData {
  events: EventWithClient[];
  pagination: PaginationMeta;
}

// Trivia-related types
interface GetActiveTriviaRequest {
  userId: string;
}

interface SubmitAnswerRequest {
  userId: string;
  triviaId: string;
  answerIndex: number;
}

// Account deletion types
interface DeleteAccountRequest {
  userId: string;
}

interface TriviaClientDocument {
  $id: string;
  name: string;
  logoURL?: string;
}

interface TriviaDocument {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  question: string;
  answers: string[];
  correctOptionIndex: number;
  startDate: string;
  endDate: string;
  points: number;
  client?: TriviaClientDocument;
}

interface ActiveTriviaResponse {
  $id: string;
  question: string;
  answers: string[];
  startDate: string;
  endDate: string;
  points: number;
  client?: TriviaClientDocument;
}

// Handler types
interface HandlerRequest {
  path: string;
  method: string;
  body?: unknown;
  headers: Record<string, string>;
}

interface HandlerResponse {
  json: (data: unknown, code?: number) => void;
  text: (data: string, code?: number) => void;
}

interface HandlerContext {
  req: HandlerRequest;
  res: HandlerResponse;
  log: (message: string) => void;
  error: (message: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DATABASE_ID = '69217af50038b9005a61';
const EVENTS_TABLE_ID = 'events';
const CLIENTS_TABLE_ID = 'clients';
const TRIVIA_TABLE_ID = 'trivia';
const TRIVIA_RESPONSES_TABLE_ID = 'trivia_responses';
const USER_PROFILES_TABLE_ID = 'user_profiles';
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_PAGE = 1;

// ============================================================================
// EVENT FUNCTIONS
// ============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRadians = (angle: number) => (Math.PI / 180) * angle;
  const R = 6371000; // Earth's radius in meters

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Validate request body for events by location
 */
function validateEventsRequestBody(body: unknown): GetEventsByLocationRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body is required');
  }

  const bodyObj = body as Record<string, unknown>;

  if (typeof bodyObj.latitude !== 'number' || isNaN(bodyObj.latitude)) {
    throw new Error('latitude must be a valid number');
  }

  if (typeof bodyObj.longitude !== 'number' || isNaN(bodyObj.longitude)) {
    throw new Error('longitude must be a valid number');
  }

  if (bodyObj.latitude < -90 || bodyObj.latitude > 90) {
    throw new Error('latitude must be between -90 and 90');
  }

  if (bodyObj.longitude < -180 || bodyObj.longitude > 180) {
    throw new Error('longitude must be between -180 and 180');
  }

  const page =
    bodyObj.page !== undefined ? Number(bodyObj.page) : DEFAULT_PAGE;
  const pageSize =
    bodyObj.pageSize !== undefined ? Number(bodyObj.pageSize) : DEFAULT_PAGE_SIZE;

  if (page < 1 || !Number.isInteger(page)) {
    throw new Error('page must be a positive integer');
  }

  if (pageSize < 1 || !Number.isInteger(pageSize) || pageSize > 100) {
    throw new Error('pageSize must be a positive integer between 1 and 100');
  }

  return {
    latitude: bodyObj.latitude,
    longitude: bodyObj.longitude,
    page,
    pageSize,
  };
}

/**
 * Get events sorted by location
 */
async function getEventsByLocation(
  databases: Databases,
  userLat: number,
  userLon: number,
  page: number,
  pageSize: number,
  log: (message: string) => void
): Promise<EventsResponseData> {
  // Get current date for filtering upcoming events
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayISO = today.toISOString();

  // Build queries for filtering events
  const queries = [
    Query.equal('isArchived', false),
    Query.equal('isHidden', false),
    Query.greaterThanEqual('date', todayISO),
    Query.orderAsc('date'),
    Query.select(['*', 'client.*']),
  ];

  // Fetch all matching events
  const eventsResponse = await databases.listDocuments(
    DATABASE_ID,
    EVENTS_TABLE_ID,
    queries
  );

  const events = eventsResponse.documents as unknown as EventData[];

  // Fetch client data for each event and calculate distances
  const eventsWithClients: EventWithClient[] = [];

  for (const event of events) {
    let clientData: ClientData | null = null;
    let distance: number = Infinity;

    if (event.client) {
      try {
        // Handle relationship field - could be string ID or populated object
        if (typeof event.client === 'string') {
          const clientResponse = await databases.getDocument(
            DATABASE_ID,
            CLIENTS_TABLE_ID,
            event.client
          );
          clientData = clientResponse as unknown as ClientData;
        } else if (event.client && typeof event.client === 'object') {
          const clientObj = event.client as Record<string, unknown>;
          if (clientObj.$id || clientObj.name) {
            clientData = clientObj as unknown as ClientData;
          } else {
            const clientId = (clientObj.id || clientObj.$id) as string | undefined;
            if (clientId && typeof clientId === 'string') {
              const clientResponse = await databases.getDocument(
                DATABASE_ID,
                CLIENTS_TABLE_ID,
                clientId
              );
              clientData = clientResponse as unknown as ClientData;
            }
          }
        }

        // Calculate distance if client has location
        // Handle both array format [longitude, latitude] and GeoJSON format {coordinates: [longitude, latitude]}
        if (clientData && clientData.location) {
          let clientLon: number | undefined;
          let clientLat: number | undefined;

          if (Array.isArray(clientData.location) && clientData.location.length >= 2) {
            // Direct array format: [longitude, latitude]
            clientLon = clientData.location[0];
            clientLat = clientData.location[1];
          } else if (
            typeof clientData.location === 'object' &&
            clientData.location !== null &&
            'coordinates' in clientData.location &&
            Array.isArray((clientData.location as { coordinates: number[] }).coordinates) &&
            (clientData.location as { coordinates: number[] }).coordinates.length >= 2
          ) {
            // GeoJSON format: {coordinates: [longitude, latitude]}
            const coords = (clientData.location as { coordinates: number[] }).coordinates;
            clientLon = coords[0];
            clientLat = coords[1];
          }

          if (
            clientLon !== undefined &&
            clientLat !== undefined &&
            !isNaN(clientLon) &&
            !isNaN(clientLat)
          ) {
            distance = haversineDistance(userLat, userLon, clientLat, clientLon);
          }
        }
      } catch (err: unknown) {
        const clientInfo =
          typeof event.client === 'string'
            ? event.client
            : (event.client as Record<string, unknown>)?.$id ||
              JSON.stringify(event.client).substring(0, 50);
        const errorMessage = err instanceof Error ? err.message : String(err);
        log(`Error fetching client ${clientInfo}: ${errorMessage}`);
      }
    }

    eventsWithClients.push({
      ...event,
      client: clientData,
      distance,
    });
  }

  // Filter out events without valid client locations
  const validEvents = eventsWithClients.filter(
    (event) => event.client !== null && event.distance !== Infinity
  );

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

// ============================================================================
// TRIVIA FUNCTIONS
// ============================================================================

/**
 * Get active trivia questions for a user
 * Returns trivia questions that are currently active and not yet answered by the user
 */
async function getActiveTrivia(
  databases: Databases,
  userId: string,
  log: (message: string) => void
): Promise<ActiveTriviaResponse[]> {
  const now = new Date().toISOString();

  // Get all currently active trivia (startDate <= now AND endDate >= now)
  const activeTriviaResponse = await databases.listDocuments(
    DATABASE_ID,
    TRIVIA_TABLE_ID,
    [
      Query.lessThanEqual('startDate', now),
      Query.greaterThanEqual('endDate', now),
    ]
  );

  log(`Found ${activeTriviaResponse.total} active trivia questions`);

  if (activeTriviaResponse.total === 0) {
    return [];
  }

  // Get all trivia responses for this user
  const userResponsesResult = await databases.listDocuments(
    DATABASE_ID,
    TRIVIA_RESPONSES_TABLE_ID,
    [Query.equal('user', userId)]
  );

  // Create a set of trivia IDs that the user has already answered
  const answeredTriviaIds = new Set<string>();
  for (const response of userResponsesResult.documents) {
    const triviaRef = response.trivia as string | { $id?: string; id?: string };
    const triviaId =
      typeof triviaRef === 'string' ? triviaRef : triviaRef?.$id || triviaRef?.id;
    if (triviaId) {
      answeredTriviaIds.add(triviaId);
    }
  }

  log(`User has answered ${answeredTriviaIds.size} trivia questions`);

  // Filter out trivia that the user has already answered
  // Also remove correctOptionIndex from the response for security
  const unansweredTrivia: ActiveTriviaResponse[] = [];

  for (const trivia of activeTriviaResponse.documents as unknown as TriviaDocument[]) {
    if (!answeredTriviaIds.has(trivia.$id)) {
      unansweredTrivia.push({
        $id: trivia.$id,
        question: trivia.question,
        answers: trivia.answers,
        startDate: trivia.startDate,
        endDate: trivia.endDate,
        points: trivia.points,
        client: trivia.client,
      });
    }
  }

  log(`Returning ${unansweredTrivia.length} unanswered trivia questions`);

  return unansweredTrivia;
}

/**
 * Submit an answer for a trivia question
 * Creates a response record and awards points if correct
 */
async function submitTriviaAnswer(
  databases: Databases,
  userId: string,
  triviaId: string,
  answerIndex: number,
  log: (message: string) => void
): Promise<{ isCorrect: boolean; pointsAwarded: number; message: string }> {
  const now = new Date().toISOString();

  // 1. Get the trivia question and validate it exists
  let trivia: TriviaDocument;
  try {
    trivia = (await databases.getDocument(
      DATABASE_ID,
      TRIVIA_TABLE_ID,
      triviaId
    )) as unknown as TriviaDocument;
  } catch {
    throw { code: 404, message: 'Trivia question not found' };
  }

  // 2. Check if trivia is currently active
  const startDate = new Date(trivia.startDate);
  const endDate = new Date(trivia.endDate);
  const currentDate = new Date(now);

  if (currentDate < startDate || currentDate > endDate) {
    throw {
      code: 400,
      message: 'This trivia question is not currently active',
    };
  }

  // 3. Validate the user exists
  try {
    await databases.getDocument(DATABASE_ID, USER_PROFILES_TABLE_ID, userId);
  } catch {
    throw { code: 404, message: 'User not found' };
  }

  // 4. Check if user has already answered this trivia
  const existingResponses = await databases.listDocuments(
    DATABASE_ID,
    TRIVIA_RESPONSES_TABLE_ID,
    [Query.equal('user', userId), Query.equal('trivia', triviaId)]
  );

  if (existingResponses.total > 0) {
    throw {
      code: 400,
      message: 'You have already answered this trivia question',
    };
  }

  // 5. Validate answerIndex is within bounds
  if (answerIndex < 0 || answerIndex >= trivia.answers.length) {
    throw {
      code: 400,
      message: `Invalid answer index. Must be between 0 and ${trivia.answers.length - 1}`,
    };
  }

  // 6. Check if answer is correct
  const isCorrect = answerIndex === trivia.correctOptionIndex;
  const answerText = trivia.answers[answerIndex];

  // 7. Create the trivia response record
  await databases.createDocument(
    DATABASE_ID,
    TRIVIA_RESPONSES_TABLE_ID,
    ID.unique(),
    {
      trivia: triviaId,
      user: userId,
      answer: answerText,
      answerIndex: answerIndex,
    }
  );

  log(
    `Created trivia response for user ${userId}, trivia ${triviaId}, isCorrect: ${isCorrect}`
  );

  // 8. If correct, award points to the user
  let pointsAwarded = 0;
  if (isCorrect) {
    pointsAwarded = trivia.points;

    // Get current user points
    const userDoc = await databases.getDocument(
      DATABASE_ID,
      USER_PROFILES_TABLE_ID,
      userId
    );
    const currentPoints = (userDoc.totalPoints as number) || 0;

    // Update user's total points
    await databases.updateDocument(
      DATABASE_ID,
      USER_PROFILES_TABLE_ID,
      userId,
      {
        totalPoints: currentPoints + pointsAwarded,
      }
    );

    log(`Awarded ${pointsAwarded} points to user ${userId}`);
  }

  return {
    isCorrect,
    pointsAwarded,
    message: isCorrect
      ? `Correct! You earned ${pointsAwarded} points.`
      : 'Incorrect answer. Better luck next time!',
  };
}

// ============================================================================
// ACCOUNT DELETION FUNCTION
// ============================================================================

/**
 * Delete user account from Appwrite Auth
 * This function should be called when a user wants to delete their account
 * It will:
 * 1. Delete the user from Appwrite Auth (which is only possible from server-side)
 * 2. This will also cascade delete all related data (sessions, tokens, etc.)
 */
async function deleteUserAccount(
  users: Users,
  databases: Databases,
  userId: string,
  log: (message: string) => void
): Promise<{ success: boolean; message: string }> {
  log(`Starting account deletion for user: ${userId}`);

  try {
    // 1. Verify the user exists
    try {
      await users.get(userId);
      log(`User ${userId} found in Auth`);
    } catch {
      throw { code: 404, message: 'User not found in authentication system' };
    }

    // 2. Find and delete user profile from database
    // Note: The user profile document ID is different from the auth user ID
    // We need to query by the 'authID' field to find the profile document
    try {
      log(`Attempting to find user profile by authID: ${userId}`);
      log(`Database ID: ${DATABASE_ID}, Table ID: ${USER_PROFILES_TABLE_ID}`);
      
      // Query for the user profile document where authID matches the user's auth ID
      const profileQuery = await databases.listDocuments(
        DATABASE_ID,
        USER_PROFILES_TABLE_ID,
        [Query.equal('authID', userId)]
      );
      
      log(`Profile query completed. Total found: ${profileQuery.total}`);
      
      if (profileQuery.total === 0) {
        log(`No user profile found with authID: ${userId} - continuing with auth deletion`);
      } else {
        log(`Found ${profileQuery.total} profile(s) to delete`);
        // Delete the profile document(s) - there should only be one, but handle multiple just in case
        for (const profile of profileQuery.documents) {
          log(`Profile document details: ID=${profile.$id}, authID=${profile.authID || 'N/A'}`);
          log(`Attempting to delete user profile document: ${profile.$id}`);
          await databases.deleteDocument(DATABASE_ID, USER_PROFILES_TABLE_ID, profile.$id);
          log(`User profile deleted successfully: ${profile.$id}`);
        }
        log(`Deleted ${profileQuery.total} user profile(s) from database`);
      }
    } catch (profileError: any) {
      // Log the full error for debugging
      log(`Error during profile deletion process`);
      log(`Error type: ${profileError?.constructor?.name || 'Unknown'}`);
      log(`Error message: ${profileError?.message || 'N/A'}`);
      log(`Error code: ${profileError?.code || 'N/A'}`);
      log(`Error type field: ${profileError?.type || 'N/A'}`);
      log(
        `Full error details: ${JSON.stringify({
          message: profileError?.message,
          code: profileError?.code,
          type: profileError?.type,
          response: profileError?.response,
        })}`
      );
      
      // For any error, throw it to prevent partial deletion
      throw {
        code: 500,
        message: `Failed to delete user profile: ${profileError?.message || 'Unknown error'}`,
      };
    }

    // 3. Delete the user from Appwrite Auth
    // This will automatically delete all sessions, tokens, and related auth data
    log(`Deleting user from Appwrite Auth: ${userId}`);
    await users.delete(userId);
    log(`User ${userId} successfully deleted from Appwrite Auth`);

    return {
      success: true,
      message: 'Account successfully deleted',
    };
  } catch (err: unknown) {
    const typedErr = err as { code?: number; message?: string };
    log(`Error during account deletion: ${typedErr.message || 'Unknown error'}`);
    throw typedErr;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export default async function handler({ req, res, log, error }: HandlerContext) {
  try {
    // Initialize Appwrite client
    const endpoint =
      process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
      'https://nyc.cloud.appwrite.io/v1';
    const projectId =
      process.env.APPWRITE_FUNCTION_PROJECT_ID || '691d4a54003b21bf0136';

    const apiKey =
      process.env.APPWRITE_FUNCTION_KEY ||
      process.env.APPWRITE_API_KEY ||
      req.headers['x-appwrite-key'] ||
      req.headers['x-appwrite-function-key'] ||
      '';

    if (!apiKey) {
      error('API key is missing');
      return res.json(
        {
          success: false,
          error: 'Server configuration error: API key missing',
        },
        500
      );
    }

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);
    const users = new Users(client);

    // ========================================================================
    // PING ENDPOINT
    // ========================================================================
    if (req.path === '/ping') {
      return res.text('Pong');
    }

    // ========================================================================
    // EVENT ENDPOINTS
    // ========================================================================

    // GET events by location
    if (req.path === '/get-events-by-location' && req.method === 'POST') {
      log('Processing get-events-by-location request');

      let requestBody: GetEventsByLocationRequest;
      try {
        requestBody = validateEventsRequestBody(req.body);
      } catch (validationError: unknown) {
        const errorMessage =
          validationError instanceof Error
            ? validationError.message
            : String(validationError);
        error(`Validation error: ${errorMessage}`);
        return res.json(
          {
            success: false,
            error: errorMessage,
          },
          400
        );
      }

      log(
        `Fetching events for location: (${requestBody.latitude}, ${requestBody.longitude}), page: ${requestBody.page}, pageSize: ${requestBody.pageSize}`
      );

      const result = await getEventsByLocation(
        databases,
        requestBody.latitude,
        requestBody.longitude,
        requestBody.page!,
        requestBody.pageSize!,
        log
      );

      log(
        `Found ${result.pagination.total} events, returning ${result.events.length} for page ${result.pagination.page}`
      );

      return res.json({
        success: true,
        ...result,
      });
    }

    // ========================================================================
    // TRIVIA ENDPOINTS
    // ========================================================================

    // GET active trivia for user
    if (req.path === '/get-active-trivia' && req.method === 'POST') {
      log('Processing get-active-trivia request');

      const body = req.body as GetActiveTriviaRequest;

      if (!body || !body.userId) {
        return res.json(
          {
            success: false,
            error: 'userId is required',
          },
          400
        );
      }

      const activeTrivia = await getActiveTrivia(databases, body.userId, log);

      return res.json({
        success: true,
        trivia: activeTrivia,
        count: activeTrivia.length,
      });
    }

    // SUBMIT trivia answer
    if (req.path === '/submit-answer' && req.method === 'POST') {
      log('Processing submit-answer request');

      const body = req.body as SubmitAnswerRequest;

      if (!body || !body.userId) {
        return res.json(
          {
            success: false,
            error: 'userId is required',
          },
          400
        );
      }

      if (!body.triviaId) {
        return res.json(
          {
            success: false,
            error: 'triviaId is required',
          },
          400
        );
      }

      if (body.answerIndex === undefined || body.answerIndex === null) {
        return res.json(
          {
            success: false,
            error: 'answerIndex is required',
          },
          400
        );
      }

      if (typeof body.answerIndex !== 'number' || body.answerIndex < 0) {
        return res.json(
          {
            success: false,
            error: 'answerIndex must be a non-negative number',
          },
          400
        );
      }

      try {
        const result = await submitTriviaAnswer(
          databases,
          body.userId,
          body.triviaId,
          body.answerIndex,
          log
        );

        return res.json({
          success: true,
          ...result,
        });
      } catch (err: unknown) {
        const typedErr = err as { code?: number; message?: string };
        if (typedErr.code && typedErr.message) {
          return res.json(
            {
              success: false,
              error: typedErr.message,
            },
            typedErr.code
          );
        }
        throw err;
      }
    }

    // ========================================================================
    // ACCOUNT DELETION ENDPOINT
    // ========================================================================

    // DELETE user account
    if (req.path === '/delete-account' && req.method === 'POST') {
      log('Processing delete-account request');

      const body = req.body as DeleteAccountRequest;

      if (!body || !body.userId) {
        return res.json(
          {
            success: false,
            error: 'userId is required',
          },
          400
        );
      }

      try {
        const result = await deleteUserAccount(users, databases, body.userId, log);

        return res.json({
          success: true,
          ...result,
        });
      } catch (err: unknown) {
        const typedErr = err as { code?: number; message?: string };
        if (typedErr.code && typedErr.message) {
          return res.json(
            {
              success: false,
              error: typedErr.message,
            },
            typedErr.code
          );
        }
        throw err;
      }
    }

    // ========================================================================
    // DEFAULT RESPONSE
    // ========================================================================
    return res.json({
      success: false,
      error:
        'Invalid endpoint. Available endpoints: POST /get-events-by-location, POST /get-active-trivia, POST /submit-answer, POST /delete-account, GET /ping',
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : 'Internal server error';
    error(`Function error: ${errorMessage}`);
    console.error('Function error:', err);
    return res.json(
      {
        success: false,
        error: errorMessage,
      },
      500
    );
  }
}
