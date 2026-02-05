import { Client, Databases, Query, Users } from 'node-appwrite';

// Type definitions
interface StatisticsRequest {
  page: 'dashboard' | 'clients' | 'users' | 'notifications' | 'trivia';
}

interface DashboardStats {
  totalClientsBrands: number;
  totalPointsAwarded: number;
  totalUsers: number;
  averagePPU: number;
  totalCheckins: number;
  reviews: number;
  totalClientsBrandsChange?: number;
  totalPointsAwardedChange?: number;
  totalUsersChange?: number;
  averagePPUChange?: number;
  totalCheckinsChange?: number;
  reviewsChange?: number;
}

interface ClientsStats {
  totalClients: number;
  newThisMonth: number;
}

interface UsersStats {
  totalUsers: number;
  avgPoints: number;
  newThisWeek: number;
  usersInBlacklist: number;
}

interface NotificationsStats {
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  scheduled: number;
}

interface TriviaStats {
  totalQuizzes: number;
  scheduled: number;
  active: number;
  completed: number;
}

// Constants
const DATABASE_ID = '69217af50038b9005a61';
const CLIENTS_TABLE_ID = 'clients';
const USER_PROFILES_TABLE_ID = 'user_profiles';
const EVENTS_TABLE_ID = 'events';
const REVIEWS_TABLE_ID = 'reviews';
const TRIVIA_TABLE_ID = 'trivia';
const CHECKINS_TABLE_ID = 'checkins';
const NOTIFICATIONS_TABLE_ID = 'notifications';

// Tier thresholds
const TIER_THRESHOLDS = [
  { level: 5, name: 'SampleMaster', minPoints: 100000 },
  { level: 4, name: 'VIS', minPoints: 25000 },
  { level: 3, name: 'SuperSampler', minPoints: 5000 },
  { level: 2, name: 'SampleFan', minPoints: 1000 },
  { level: 1, name: 'NewbieSampler', minPoints: 0 },
];

/**
 * Calculate tier based on points
 */
function getTierFromPoints(points: number): { level: number; name: string } {
  for (const tier of TIER_THRESHOLDS) {
    if (points >= tier.minPoints) {
      return { level: tier.level, name: tier.name };
    }
  }
  return { level: 1, name: 'NewbieSampler' };
}

/**
 * Get date range for this month
 */
function getThisMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Get date range for last month
 */
function getLastMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Get date range for this week
 */
function getThisWeekRange(): { start: string; end: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
  const start = new Date(now.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * Calculate percentage change
 */
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Get Dashboard Statistics
 */
async function getDashboardStats(
  databases: Databases,
  log: (message: string) => void
): Promise<DashboardStats> {
  try {
    // Get last month range for comparisons
    const lastMonth = getLastMonthRange();

    // Total Clients/Brands
    const clientsResponse = await databases.listDocuments(
      DATABASE_ID,
      CLIENTS_TABLE_ID
    );
    const totalClientsBrands = clientsResponse.total;

    // Total Users
    const usersResponse = await databases.listDocuments(
      DATABASE_ID,
      USER_PROFILES_TABLE_ID
    );
    const totalUsers = usersResponse.total;

    // Total Points Awarded - sum of actual points earned from reviews and check-ins
    let totalPointsAwarded = 0;

    // Sum points from reviews (actual points awarded)
    const reviewsResponse = await databases.listDocuments(
      DATABASE_ID,
      REVIEWS_TABLE_ID
    );
    for (const review of reviewsResponse.documents) {
      const pointsEarned = (review.pointsEarned as number) || 0;
      totalPointsAwarded += pointsEarned;
    }

    // Sum points from check-ins
    // Note: This assumes checkins table has either:
    // 1. A 'points' field with actual points awarded, OR
    // 2. An 'event' relationship field to get checkInPoints from the event
    const checkinsResponse = await databases.listDocuments(
      DATABASE_ID,
      CHECKINS_TABLE_ID
    );

    // If checkins table has a 'points' field, sum it directly
    // Otherwise, calculate based on event relationship
    for (const checkin of checkinsResponse.documents) {
      // Try to get points from checkin record directly
      if (checkin.points !== undefined) {
        totalPointsAwarded += (checkin.points as number) || 0;
      } else if (checkin.event) {
        // If checkin has event relationship, get the event's checkInPoints
        try {
          const eventRef = checkin.event as { $id?: string; id?: string } | string | null;
          const eventId =
            typeof eventRef === 'string'
              ? eventRef
              : eventRef?.$id || eventRef?.id;

          if (eventId) {
            const eventDoc = await databases.getDocument(
              DATABASE_ID,
              EVENTS_TABLE_ID,
              eventId
            );
            const checkInPoints = (eventDoc.checkInPoints as number) || 0;
            totalPointsAwarded += checkInPoints;
          }
        } catch (err) {
          // Event not found or error fetching - skip this check-in
          log(`Error fetching event for check-in ${checkin.$id}: ${err}`);
        }
      }
    }

    // Average PPU (Points Per User)
    const averagePPU =
      totalUsers > 0 ? Math.round(totalPointsAwarded / totalUsers) : 0;

    // Total Check-ins - count from checkins table (reuse the response we already fetched)
    const totalCheckins = checkinsResponse.total;

    // Reviews count
    const reviews = reviewsResponse.total;

    // Calculate changes (comparing this month vs last month)
    // For simplicity, we'll use current totals vs previous month totals
    // In a real scenario, you'd filter by date ranges
    const lastMonthClientsResponse = await databases.listDocuments(
      DATABASE_ID,
      CLIENTS_TABLE_ID,
      [Query.lessThanEqual('$createdAt', lastMonth.end)]
    );
    const lastMonthTotalClients = lastMonthClientsResponse.total;

    const lastMonthUsersResponse = await databases.listDocuments(
      DATABASE_ID,
      USER_PROFILES_TABLE_ID,
      [Query.lessThanEqual('$createdAt', lastMonth.end)]
    );
    const lastMonthTotalUsers = lastMonthUsersResponse.total;

    return {
      totalClientsBrands,
      totalPointsAwarded,
      totalUsers,
      averagePPU,
      totalCheckins,
      reviews,
      totalClientsBrandsChange: calculateChange(
        totalClientsBrands,
        lastMonthTotalClients
      ),
      totalUsersChange: calculateChange(totalUsers, lastMonthTotalUsers),
      // For other metrics, you'd need to calculate based on date ranges
      // For now, we'll set them to 0 or calculate if needed
      totalPointsAwardedChange: 0,
      averagePPUChange: 0,
      totalCheckinsChange: 0,
      reviewsChange: 0,
    };
  } catch (error: unknown) {
    log(`Error getting dashboard stats: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Get Clients/Brands Statistics
 */
async function getClientsStats(
  databases: Databases,
  log: (message: string) => void
): Promise<ClientsStats> {
  try {
    const thisMonth = getThisMonthRange();

    // Total Clients
    const clientsResponse = await databases.listDocuments(
      DATABASE_ID,
      CLIENTS_TABLE_ID
    );
    const totalClients = clientsResponse.total;

    // New This Month
    const newClientsResponse = await databases.listDocuments(
      DATABASE_ID,
      CLIENTS_TABLE_ID,
      [
        Query.greaterThanEqual('$createdAt', thisMonth.start),
        Query.lessThanEqual('$createdAt', thisMonth.end),
      ]
    );
    const newThisMonth = newClientsResponse.total;

    return {
      totalClients,
      newThisMonth,
    };
  } catch (error: unknown) {
    log(`Error getting clients stats: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Get Users Statistics
 */
async function getUsersStats(
  databases: Databases,
  log: (message: string) => void
): Promise<UsersStats> {
  try {
    const thisWeek = getThisWeekRange();

    // Total Users
    const usersResponse = await databases.listDocuments(
      DATABASE_ID,
      USER_PROFILES_TABLE_ID
    );
    const totalUsers = usersResponse.total;

    // New This Week
    const newUsersResponse = await databases.listDocuments(
      DATABASE_ID,
      USER_PROFILES_TABLE_ID,
      [
        Query.greaterThanEqual('$createdAt', thisWeek.start),
        Query.lessThanEqual('$createdAt', thisWeek.end),
      ]
    );
    const newThisWeek = newUsersResponse.total;

    // Users in Blacklist (isBlocked = true)
    const blockedUsersResponse = await databases.listDocuments(
      DATABASE_ID,
      USER_PROFILES_TABLE_ID,
      [Query.equal('isBlocked', true)]
    );
    const usersInBlacklist = blockedUsersResponse.total;

    // Avg Points - calculate average points per user
    // Use the same calculation as dashboard: sum actual points from reviews and check-ins
    let totalPoints = 0;

    // Sum points from reviews (actual points awarded)
    const reviewsResponse = await databases.listDocuments(
      DATABASE_ID,
      REVIEWS_TABLE_ID
    );
    for (const review of reviewsResponse.documents) {
      const pointsEarned = (review.pointsEarned as number) || 0;
      totalPoints += pointsEarned;
    }

    // Sum points from check-ins
    // Note: This assumes checkins table has either:
    // 1. A 'points' field with actual points awarded, OR
    // 2. An 'event' relationship field to get checkInPoints from the event
    const checkinsResponse = await databases.listDocuments(
      DATABASE_ID,
      CHECKINS_TABLE_ID
    );

    // If checkins table has a 'points' field, sum it directly
    // Otherwise, calculate based on event relationship
    for (const checkin of checkinsResponse.documents) {
      // Try to get points from checkin record directly
      if (checkin.points !== undefined) {
        totalPoints += (checkin.points as number) || 0;
      } else if (checkin.event) {
        // If checkin has event relationship, get the event's checkInPoints
        try {
          const eventRef = checkin.event as { $id?: string; id?: string } | string | null;
          const eventId =
            typeof eventRef === 'string'
              ? eventRef
              : eventRef?.$id || eventRef?.id;

          if (eventId) {
            const eventDoc = await databases.getDocument(
              DATABASE_ID,
              EVENTS_TABLE_ID,
              eventId
            );
            const checkInPoints = (eventDoc.checkInPoints as number) || 0;
            totalPoints += checkInPoints;
          }
        } catch (err) {
          // Event not found or error fetching - skip this check-in
          log(`Error fetching event for check-in ${checkin.$id}: ${err}`);
        }
      }
    }

    const avgPoints = totalUsers > 0 ? Math.round(totalPoints / totalUsers) : 0;

    return {
      totalUsers,
      avgPoints,
      newThisWeek,
      usersInBlacklist,
    };
  } catch (error: unknown) {
    log(`Error getting users stats: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Get Notifications Statistics
 */
async function getNotificationsStats(
  databases: Databases,
  log: (message: string) => void
): Promise<NotificationsStats> {
  try {

    // Total Sent
    const notificationsResponse = await databases.listDocuments(
      DATABASE_ID,
      NOTIFICATIONS_TABLE_ID
    );
    const totalSent = notificationsResponse.total;

    // Scheduled (notifications with future dates)
    // Note: This assumes notifications have a date/scheduledAt field
    // Since the notifications table structure is empty, we'll need to check the actual schema
    // For now, we'll return 0 or calculate based on available fields
    const scheduledResponse = await databases.listDocuments(
      DATABASE_ID,
      NOTIFICATIONS_TABLE_ID,
      [
        // Query.greaterThan('scheduledAt', nowISO), // Uncomment when field exists
      ]
    );
    const scheduled = scheduledResponse.total;

    // Avg Open Rate and Click Rate
    // These would typically come from notification tracking fields
    // For now, we'll return placeholder values
    // In production, you'd calculate these from notification metadata
    const avgOpenRate = 65; // Placeholder - calculate from actual data
    const avgClickRate = 48; // Placeholder - calculate from actual data

    return {
      totalSent,
      avgOpenRate,
      avgClickRate,
      scheduled,
    };
  } catch (error: unknown) {
    log(`Error getting notifications stats: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Get Trivia Statistics
 */
async function getTriviaStats(
  databases: Databases,
  log: (message: string) => void
): Promise<TriviaStats> {
  try {
    const now = new Date();
    const nowISO = now.toISOString();

    // Total Quizzes
    const triviaResponse = await databases.listDocuments(
      DATABASE_ID,
      TRIVIA_TABLE_ID
    );
    const totalQuizzes = triviaResponse.total;

    // Scheduled (startDate > now)
    const scheduledResponse = await databases.listDocuments(
      DATABASE_ID,
      TRIVIA_TABLE_ID,
      [Query.greaterThan('startDate', nowISO)]
    );
    const scheduled = scheduledResponse.total;

    // Active (startDate <= now AND endDate >= now)
    const activeResponse = await databases.listDocuments(
      DATABASE_ID,
      TRIVIA_TABLE_ID,
      [
        Query.lessThanEqual('startDate', nowISO),
        Query.greaterThanEqual('endDate', nowISO),
      ]
    );
    const active = activeResponse.total;

    // Completed (endDate < now)
    const completedResponse = await databases.listDocuments(
      DATABASE_ID,
      TRIVIA_TABLE_ID,
      [Query.lessThan('endDate', nowISO)]
    );
    const completed = completedResponse.total;

    return {
      totalQuizzes,
      scheduled,
      active,
      completed,
    };
  } catch (error: unknown) {
    log(`Error getting trivia stats: ${(error as Error).message}`);
    throw error;
  }
}

// Main function handler
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler({ req, res, log, error }: any) {
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

    // Handle ping endpoint
    if (req.path === '/ping') {
      return res.text('Pong');
    }

    // Handle get statistics endpoint
    if (req.path === '/get-statistics' && req.method === 'POST') {
      log('Processing get-statistics request');

      // Parse and validate request body
      const body = req.body as StatisticsRequest;

      if (!body || !body.page) {
        return res.json(
          {
            success: false,
            error:
              'page parameter is required. Valid values: dashboard, clients, users, notifications, trivia',
          },
          400
        );
      }

      const validPages = [
        'dashboard',
        'clients',
        'users',
        'notifications',
        'trivia',
      ];
      if (!validPages.includes(body.page)) {
        return res.json(
          {
            success: false,
            error: `Invalid page parameter. Valid values: ${validPages.join(', ')}`,
          },
          400
        );
      }

      log(`Fetching statistics for page: ${body.page}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let statistics: any;

      switch (body.page) {
        case 'dashboard':
          statistics = await getDashboardStats(databases, log);
          break;
        case 'clients':
          statistics = await getClientsStats(databases, log);
          break;
        case 'users':
          statistics = await getUsersStats(databases, log);
          break;
        case 'notifications':
          statistics = await getNotificationsStats(databases, log);
          break;
        case 'trivia':
          statistics = await getTriviaStats(databases, log);
          break;
        default:
          return res.json(
            {
              success: false,
              error: 'Invalid page parameter',
            },
            400
          );
      }

      log(`Successfully fetched statistics for ${body.page}`);

      return res.json({
        success: true,
        page: body.page,
        statistics,
      });
    }

    // Handle get user emails endpoint (also returns last login dates)
    if (req.path === '/get-user-emails' && req.method === 'POST') {
      log('Processing get-user-emails request');

      const body = req.body as { authIDs?: string[] };

      if (!body || !body.authIDs || !Array.isArray(body.authIDs)) {
        return res.json(
          {
            success: false,
            error: 'authIDs array is required',
          },
          400
        );
      }

      const users = new Users(client);
      const emailMap: Record<string, string> = {};
      const lastLoginMap: Record<string, string> = {};

      // Fetch emails and last login dates for each authID
      for (const authID of body.authIDs) {
        try {
          const user = await users.get(authID);
          if (user) {
            if (user.email) {
              emailMap[authID] = user.email;
            }
            // accessedAt is the last time the user accessed the app
            if (user.accessedAt) {
              lastLoginMap[authID] = user.accessedAt;
            }
          }
        } catch (err) {
          // User not found or error - skip
          log(`Could not fetch user ${authID}: ${(err as Error).message}`);
        }
      }

      log(`Successfully fetched ${Object.keys(emailMap).length} emails and ${Object.keys(lastLoginMap).length} last login dates`);

      return res.json({
        success: true,
        emails: emailMap,
        lastLogins: lastLoginMap,
      });
    }

    // Handle update user tier endpoint
    if (req.path === '/update-user-tier' && req.method === 'POST') {
      log('Processing update-user-tier request');

      const body = req.body as { userId?: string };

      if (body.userId) {
        // Update single user
        try {
          const user = await databases.getDocument(
            DATABASE_ID,
            USER_PROFILES_TABLE_ID,
            body.userId
          );

          const totalPoints = (user.totalPoints as number) || 0;
          const tier = getTierFromPoints(totalPoints);

          await databases.updateDocument(
            DATABASE_ID,
            USER_PROFILES_TABLE_ID,
            body.userId,
            { tierLevel: tier.name }
          );

          log(`Updated user ${body.userId} to tier ${tier.name} (${totalPoints} points)`);

          return res.json({
            success: true,
            userId: body.userId,
            totalPoints,
            tierLevel: tier.name,
            tierNumber: tier.level,
          });
        } catch (err) {
          log(`Error updating user tier: ${(err as Error).message}`);
          return res.json(
            {
              success: false,
              error: (err as Error).message,
            },
            400
          );
        }
      } else {
        // Update all users
        let updatedCount = 0;
        let offset = 0;
        const limit = 100;

        while (true) {
          const usersResponse = await databases.listDocuments(
            DATABASE_ID,
            USER_PROFILES_TABLE_ID,
            [Query.limit(limit), Query.offset(offset)]
          );

          if (usersResponse.documents.length === 0) break;

          for (const user of usersResponse.documents) {
            const totalPoints = (user.totalPoints as number) || 0;
            const tier = getTierFromPoints(totalPoints);
            const currentTier = (user.tierLevel as string) || '';

            // Only update if tier changed
            if (currentTier !== tier.name) {
              await databases.updateDocument(
                DATABASE_ID,
                USER_PROFILES_TABLE_ID,
                user.$id,
                { tierLevel: tier.name }
              );
              updatedCount++;
            }
          }

          offset += limit;
          if (usersResponse.documents.length < limit) break;
        }

        log(`Updated tier for ${updatedCount} users`);

        return res.json({
          success: true,
          updatedCount,
        });
      }
    }

    // Default response
    return res.json({
      success: false,
      error:
        'Invalid endpoint. Use POST /get-statistics with { "page": "dashboard|clients|users|notifications|trivia" }',
    });
  } catch (err: unknown) {
    error(`Function error: ${(err as Error).message}`);
    console.error('Function error:', err);
    return res.json(
      {
        success: false,
        error: (err as Error).message || 'Internal server error',
      },
      500
    );
  }
}
