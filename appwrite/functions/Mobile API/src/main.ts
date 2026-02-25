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
  location?: [number, number]; // [longitude, latitude] - DEPRECATED: Location moved to events
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
  products?: string[];
  discount?: number;
  discountImageURL?: string;
  checkInCode: string;
  checkInPoints: number;
  reviewPoints: number;
  eventInfo: string;
  isArchived: boolean;
  isHidden: boolean;
  location?: [number, number]; // [longitude, latitude]
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

interface DismissTriviaRequest {
  userId: string;
  triviaId: string;
}

// Account deletion types
interface DeleteAccountRequest {
  userId: string;
}

// User status management types
interface UpdateUserStatusRequest {
  userId: string;
  block: boolean;
}

// Get user by email (for password recovery)
interface GetUserByEmailRequest {
  email: string;
}

// Reset password after OTP verification
interface ResetPasswordAfterOTPRequest {
  userId: string;
  otp: string;
  newPassword: string;
}

// Create user request (Auth + user profile)
interface CreateUserRequest {
  email: string;
  password: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  phoneNumber?: string;
  role?: string;
  tierLevel?: string;
  dob?: string;
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
  /** User profile IDs that skipped/dismissed this trivia; they will not see it again */
  skippedUsers?: string[];
  skips?: number;
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

    // Calculate distance using event location
    // Handle both array format [longitude, latitude] and GeoJSON format {coordinates: [longitude, latitude]}
    if (event.location) {
      let eventLon: number | undefined;
      let eventLat: number | undefined;

      if (Array.isArray(event.location) && event.location.length >= 2) {
        // Direct array format: [longitude, latitude]
        eventLon = event.location[0];
        eventLat = event.location[1];
      } else if (
        typeof event.location === 'object' &&
        event.location !== null &&
        'coordinates' in event.location &&
        Array.isArray((event.location as { coordinates: number[] }).coordinates) &&
        (event.location as { coordinates: number[] }).coordinates.length >= 2
      ) {
        // GeoJSON format: {coordinates: [longitude, latitude]}
        const coords = (event.location as { coordinates: number[] }).coordinates;
        eventLon = coords[0];
        eventLat = coords[1];
      }

      if (
        eventLon !== undefined &&
        eventLat !== undefined &&
        !isNaN(eventLon) &&
        !isNaN(eventLat)
      ) {
        distance = haversineDistance(userLat, userLon, eventLat, eventLon);
      }
    }

    // Fetch client data if available
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

  // Filter out events without valid event locations
  const validEvents = eventsWithClients.filter(
    (event) => event.distance !== Infinity
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
/** Max documents to fetch in getActiveTrivia to stay within function timeout */
const GET_ACTIVE_TRIVIA_LIMIT = 100;
const GET_ACTIVE_TRIVIA_RESPONSES_LIMIT = 500;

async function getActiveTrivia(
  databases: Databases,
  userId: string,
  log: (message: string) => void
): Promise<ActiveTriviaResponse[]> {
  const now = new Date().toISOString();

  // Fetch active trivia and user's responses in parallel to minimize execution time
  const [activeTriviaResponse, userResponsesResult] = await Promise.all([
    databases.listDocuments(DATABASE_ID, TRIVIA_TABLE_ID, [
      Query.lessThanEqual('startDate', now),
      Query.greaterThanEqual('endDate', now),
      Query.limit(GET_ACTIVE_TRIVIA_LIMIT),
    ]),
    databases.listDocuments(DATABASE_ID, TRIVIA_RESPONSES_TABLE_ID, [
      Query.equal('user', userId),
      Query.limit(GET_ACTIVE_TRIVIA_RESPONSES_LIMIT),
    ]),
  ]);

  log(`Found ${activeTriviaResponse.total} active trivia questions`);

  if (activeTriviaResponse.total === 0) {
    return [];
  }

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

  // Filter out trivia that the user has already answered or skipped
  // Also remove correctOptionIndex from the response for security
  const unansweredTrivia: ActiveTriviaResponse[] = [];

  for (const trivia of activeTriviaResponse.documents as unknown as TriviaDocument[]) {
    const wasSkippedByUser =
      Array.isArray(trivia.skippedUsers) && trivia.skippedUsers.includes(userId);
    if (!answeredTriviaIds.has(trivia.$id) && !wasSkippedByUser) {
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

/**
 * Record that a user skipped/dismissed a trivia question (no answer submitted).
 * Adds the user's profile ID to the trivia's skippedUsers array so it won't be shown again.
 */
async function dismissTrivia(
  databases: Databases,
  userId: string,
  triviaId: string,
  log: (message: string) => void
): Promise<void> {
  try {
    await databases.getDocument(DATABASE_ID, USER_PROFILES_TABLE_ID, userId);
  } catch {
    throw { code: 404, message: 'User not found' };
  }
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
  const skippedUsers = Array.isArray(trivia.skippedUsers)
    ? [...trivia.skippedUsers]
    : [];
  if (skippedUsers.includes(userId)) {
    log(`User ${userId} already in skippedUsers for trivia ${triviaId}, no update`);
    return;
  }
  skippedUsers.push(userId);
  const updatePayload: { skippedUsers: string[]; skips?: number } = {
    skippedUsers,
  };
  if (typeof trivia.skips === 'number') {
    updatePayload.skips = trivia.skips + 1;
  }
  await databases.updateDocument(
    DATABASE_ID,
    TRIVIA_TABLE_ID,
    triviaId,
    updatePayload
  );
  log(`Added user ${userId} to skippedUsers for trivia ${triviaId}`);
}

// ============================================================================
// USER STATUS MANAGEMENT FUNCTION
// ============================================================================

/**
 * Update user status (block/unblock) in both Appwrite Auth and user profile.
 * This is a server-side-only operation because updating user status in Appwrite Auth
 * requires an API key with appropriate permissions.
 *
 * It will:
 * 1. Update the user status in Appwrite Auth (enable/disable the account)
 * 2. Update the isBlocked field in the user_profiles collection
 */
async function updateUserStatus(
  users: Users,
  databases: Databases,
  userId: string,
  block: boolean,
  log: (message: string) => void
): Promise<{ success: boolean; message: string }> {
  log(`Starting user status update for user: ${userId}, block: ${block}`);

  try {
    // 1. Verify the user exists in Auth
    try {
      await users.get(userId);
      log(`User ${userId} found in Auth`);
    } catch {
      throw { code: 404, message: 'User not found in authentication system' };
    }

    // 2. Update user status in Appwrite Auth
    // When block=true, set status to false (disabled)
    // When block=false, set status to true (enabled)
    log(`Updating user auth status to: ${!block ? 'enabled' : 'disabled'}`);
    await users.updateStatus(userId, !block);
    log(`User auth status updated successfully`);

    // 3. Update user profile isBlocked field
    try {
      log(`Attempting to find user profile by authID: ${userId}`);
      
      const profileQuery = await databases.listDocuments(
        DATABASE_ID,
        USER_PROFILES_TABLE_ID,
        [Query.equal('authID', userId)]
      );
      
      log(`Profile query completed. Total found: ${profileQuery.total}`);
      
      if (profileQuery.total === 0) {
        throw { code: 404, message: 'User profile not found' };
      }
      
      // Update the profile document
      const profile = profileQuery.documents[0];
      log(`Updating user profile document: ${profile.$id}`);
      await databases.updateDocument(
        DATABASE_ID,
        USER_PROFILES_TABLE_ID,
        profile.$id,
        { isBlocked: block }
      );
      log(`User profile updated successfully`);
      
    } catch (profileError: unknown) {
      const typedProfileError = profileError as { message?: string };
      log(`Error updating profile: ${typedProfileError.message || 'Unknown error'}`);
      // If profile update fails, revert the auth status
      await users.updateStatus(userId, block);
      throw {
        code: 500,
        message: `Failed to update user profile: ${typedProfileError.message || 'Unknown error'}`,
      };
    }

    return {
      success: true,
      message: block ? 'User successfully blocked' : 'User successfully unblocked',
    };
  } catch (err: unknown) {
    const typedErr = err as { code?: number; message?: string };
    log(`Error during user status update: ${typedErr.message || 'Unknown error'}`);
    throw typedErr;
  }
}

// ============================================================================
// CREATE USER FUNCTION
// ============================================================================

/**
 * Create a new user in both Appwrite Auth and user_profiles collection.
 * Requires server-side execution as creating Auth users needs users.write scope.
 */
async function createUser(
  users: Users,
  databases: Databases,
  data: CreateUserRequest,
  log: (message: string) => void
): Promise<{ success: boolean; userId: string; profileId: string; error?: string }> {
  log(`Creating user: ${data.email}`);

  try {
    // 1. Check if email already exists in Auth
    const existingByEmail = await users.list([Query.equal('email', data.email)]);
    if (existingByEmail.total > 0) {
      throw { code: 409, message: 'A user with this email already exists. Please use a different email.' };
    }

    // 2. Check if phone already exists (when provided)
    if (data.phoneNumber?.trim()) {
      const phoneFormatted = `+1${data.phoneNumber.replace(/\D/g, '')}`;
      if (phoneFormatted.length >= 12) {
        const existingByPhone = await users.list([Query.equal('phone', phoneFormatted)]);
        if (existingByPhone.total > 0) {
          throw { code: 409, message: 'A user with this phone number already exists. Please use a different email or phone.' };
        }
      }
    }

    // 3. Validate username uniqueness if provided
    if (data.username?.trim()) {
      const existingByUsername = await databases.listDocuments(
        DATABASE_ID,
        USER_PROFILES_TABLE_ID,
        [Query.equal('username', data.username.trim())]
      );
      if (existingByUsername.total > 0) {
        throw { code: 409, message: 'Username already exists. Please choose a different username.' };
      }
    }

    // 4. Create Auth user (node-appwrite v14 uses positional params: userId, email, phone, password, name)
    const userId = ID.unique();
    const name = [data.firstname, data.lastname].filter(Boolean).join(' ').trim() || '';
    await users.create(
      userId,
      data.email,
      data.phoneNumber ? `+1${data.phoneNumber.replace(/\D/g, '')}` : undefined,
      data.password,
      name || undefined
    );
    log(`Auth user created: ${userId}`);

    // 5. Create user profile
    const profileData: Record<string, unknown> = {
      authID: userId,
      firstname: data.firstname || '',
      lastname: data.lastname || '',
      username: data.username || '',
      phoneNumber: data.phoneNumber || '',
      role: data.role || 'user',
      tierLevel: data.tierLevel || '',
      isBlocked: false,
      idAdult: true,
      ...(data.dob?.trim() ? { dob: data.dob.trim().length === 10 ? `${data.dob.trim()}T00:00:00.000Z` : data.dob.trim() } : {}),
    };

    const profile = await databases.createDocument(
      DATABASE_ID,
      USER_PROFILES_TABLE_ID,
      ID.unique(),
      profileData
    );
    log(`User profile created: ${profile.$id}`);

    return {
      success: true,
      userId,
      profileId: profile.$id,
    };
  } catch (err: unknown) {
    const typedErr = err as { code?: number; message?: string };
    log(`Error creating user: ${typedErr.message || 'Unknown error'}`);
    throw typedErr;
  }
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
    } catch (profileError: unknown) {
      // Log the full error for debugging
      const typedProfileError = profileError as { 
        constructor?: { name?: string };
        message?: string;
        code?: number;
        type?: string;
        response?: unknown;
      };
      log(`Error during profile deletion process`);
      log(`Error type: ${typedProfileError.constructor?.name || 'Unknown'}`);
      log(`Error message: ${typedProfileError.message || 'N/A'}`);
      log(`Error code: ${typedProfileError.code || 'N/A'}`);
      log(`Error type field: ${typedProfileError.type || 'N/A'}`);
      log(
        `Full error details: ${JSON.stringify({
          message: typedProfileError.message,
          code: typedProfileError.code,
          type: typedProfileError.type,
          response: typedProfileError.response,
        })}`
      );
      
      // For any error, throw it to prevent partial deletion
      throw {
        code: 500,
        message: `Failed to delete user profile: ${typedProfileError.message || 'Unknown error'}`,
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
// USER LOOKUP (for password recovery)
// ============================================================================

/**
 * Get user ID by email address.
 * Searches Appwrite Auth for a user with the specified email address.
 */
async function getUserByEmail(
  users: Users,
  email: string,
  log: (message: string) => void
): Promise<{ userId: string; name?: string; emailVerification?: boolean }> {
  log(`Searching for user with email: ${email}`);
  try {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      throw { code: 400, message: 'Email is required' };
    }
    log(`Querying users with email: ${trimmedEmail}`);
    const result = await users.list([Query.equal('email', trimmedEmail)]);
    log(`Query completed. Total users found: ${result.total}`);
    if (result.total === 0) {
      throw { code: 404, message: 'User not found with this email address' };
    }
    const user = result.users[0];
    log(`User found: ${user.$id}`);
    return {
      userId: user.$id,
      name: user.name,
      emailVerification: user.emailVerification,
    };
  } catch (err: unknown) {
    const typedErr = err as { code?: number; message?: string };
    log(`Error during user lookup: ${typedErr.message || 'Unknown error'}`);
    throw typedErr;
  }
}

// ============================================================================
// PASSWORD RESET AFTER OTP
// ============================================================================

/**
 * Reset user password after OTP verification.
 * Updates the password using server-side permissions.
 * Validates that the new password is not the same as the user's username.
 */
async function resetPasswordAfterOTP(
  users: Users,
  databases: Databases,
  userId: string,
  _otp: string,
  newPassword: string,
  log: (message: string) => void
): Promise<void> {
  log(`Resetting password for user: ${userId}`);
  if (!userId || !newPassword) {
    throw { code: 400, message: 'userId and newPassword are required' };
  }
  if (newPassword.length < 8) {
    throw { code: 400, message: 'Password must be at least 8 characters long' };
  }
  try {
    const profileQuery = await databases.listDocuments(
      DATABASE_ID,
      USER_PROFILES_TABLE_ID,
      [Query.equal('authID', userId)]
    );
    if (profileQuery.total > 0) {
      const username = (profileQuery.documents[0] as { username?: string }).username ?? '';
      if (
        username &&
        newPassword.trim().toLowerCase() === username.trim().toLowerCase()
      ) {
        throw { code: 400, message: 'Password Cannot be same as Username' };
      }
    }
    log(`Updating password with server-side permissions`);
    await users.updatePassword(userId, newPassword);
    log(`Password updated successfully for user: ${userId}`);
  } catch (err: unknown) {
    const typedErr = err as { code?: number; message?: string };
    if (typedErr.code === 400 && typedErr.message) {
      throw typedErr;
    }
    log(`Error updating password: ${typedErr.message || 'Unknown error'}`);
    throw {
      code: 400,
      message: 'Failed to update password. Please try again.',
    };
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

    // DISMISS trivia (user skipped / closed without answering)
    if (req.path === '/dismiss-trivia' && req.method === 'POST') {
      log('Processing dismiss-trivia request');

      const body = req.body as DismissTriviaRequest;

      if (!body || !body.userId) {
        return res.json(
          { success: false, error: 'userId is required' },
          400
        );
      }
      if (!body.triviaId) {
        return res.json(
          { success: false, error: 'triviaId is required' },
          400
        );
      }
      try {
        await dismissTrivia(databases, body.userId, body.triviaId, log);
        return res.json({ success: true });
      } catch (err: unknown) {
        const typedErr = err as { code?: number; message?: string };
        if (typedErr.code != null && typedErr.message) {
          return res.json(
            { success: false, error: typedErr.message },
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
    // CREATE USER ENDPOINT
    // ========================================================================

    if (req.path === '/create-user' && req.method === 'POST') {
      log('Processing create-user request');

      const body = req.body as CreateUserRequest;

      if (!body || !body.email || !body.password) {
        return res.json(
          {
            success: false,
            error: 'email and password are required',
          },
          400
        );
      }

      if (body.password.length < 8) {
        return res.json(
          {
            success: false,
            error: 'Password must be at least 8 characters',
          },
          400
        );
      }

      try {
        const result = await createUser(users, databases, body, log);

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
    // USER STATUS MANAGEMENT
    // ========================================================================
    
    // UPDATE user status (block/unblock)
    if (req.path === '/update-user-status' && req.method === 'POST') {
      log('Processing update-user-status request');

      const body = req.body as UpdateUserStatusRequest;

      if (!body || !body.userId || typeof body.block !== 'boolean') {
        return res.json(
          {
            success: false,
            error: 'userId and block (boolean) are required',
          },
          400
        );
      }

      try {
        const result = await updateUserStatus(
          users,
          databases,
          body.userId,
          body.block,
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
    // USER LOOKUP (password recovery)
    // ========================================================================
    if (req.path === '/get-user-by-email' && req.method === 'POST') {
      log('Processing get-user-by-email request');

      const body = req.body as GetUserByEmailRequest;

      if (!body || !body.email) {
        return res.json(
          {
            success: false,
            error: 'email is required',
          },
          400
        );
      }

      try {
        const result = await getUserByEmail(users, body.email, log);
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
    // PASSWORD RESET AFTER OTP
    // ========================================================================
    if (req.path === '/reset-password-after-otp' && req.method === 'POST') {
      log('Processing reset-password-after-otp request');

      const body = req.body as ResetPasswordAfterOTPRequest;

      if (!body || !body.userId || !body.newPassword) {
        return res.json(
          {
            success: false,
            error: 'userId and newPassword are required',
          },
          400
        );
      }

      try {
        await resetPasswordAfterOTP(
          users,
          databases,
          body.userId,
          body.otp || '',
          body.newPassword,
          log
        );
        return res.json({
          success: true,
          message: 'Password reset successfully',
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
        'Invalid endpoint. Available endpoints: POST /get-events-by-location, POST /get-active-trivia, POST /submit-answer, POST /dismiss-trivia, POST /create-user, POST /delete-account, POST /update-user-status, POST /get-user-by-email, POST /reset-password-after-otp, GET /ping',
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
