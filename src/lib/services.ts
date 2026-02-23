import { databases, appwriteConfig, ID, Query, functions, ExecutionMethod } from './appwrite'
import type { Models } from 'appwrite'
import { formatDateWithTimezone } from './dateUtils'

// Collection IDs
export const COLLECTION_IDS = {
  USER_PROFILES: 'user_profiles',
  CLIENTS: 'clients',
  CATEGORIES: 'categories',
  EVENTS: 'events',
  NOTIFICATIONS: 'notifications',
  TRIVIA: 'trivia',
  TRIVIA_RESPONSES: 'trivia_responses',
  REVIEWS: 'reviews',
  SETTINGS: 'settings',
  TIERS: 'tiers',
  LOCATIONS: 'locations',
} as const

// Generic database service functions
export class DatabaseService {
  // Create a document
  static async create<T extends Models.Document>(
    collectionId: string,
    data: Omit<T, keyof Models.Document>
  ): Promise<T> {
    return await databases.createDocument(
      appwriteConfig.databaseId,
      collectionId,
      ID.unique(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data as any
    ) as T
  }

  // Get a document by ID
  static async getById<T extends Models.Document>(
    collectionId: string,
    documentId: string
  ): Promise<T> {
    return await databases.getDocument(
      appwriteConfig.databaseId,
      collectionId,
      documentId
    ) as T
  }

  // List documents with optional queries
  static async list<T extends Models.Document>(
    collectionId: string,
    queries?: string[]
  ): Promise<Models.DocumentList<T>> {
    return await databases.listDocuments(
      appwriteConfig.databaseId,
      collectionId,
      queries
    ) as Models.DocumentList<T>
  }

  // Update a document
  static async update<T extends Models.Document>(
    collectionId: string,
    documentId: string,
    data: Partial<Omit<T, keyof Models.Document>>
  ): Promise<T> {
    return await databases.updateDocument(
      appwriteConfig.databaseId,
      collectionId,
      documentId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data as any
    ) as T
  }

  // Delete a document
  static async delete(
    collectionId: string,
    documentId: string
  ): Promise<void> {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      collectionId,
      documentId
    )
  }

  // Search documents (client-side filtering since full-text indexes may not be configured)
  static async search<T extends Models.Document>(
    collectionId: string,
    searchTerm: string,
    searchFields: string[],
    queries?: string[]
  ): Promise<Models.DocumentList<T>> {
    // Fetch documents with the provided queries (without search)
    const result = await this.list<T>(collectionId, queries)
    
    // If no search term, return all results
    if (!searchTerm.trim()) {
      return result
    }
    
    // Client-side filtering: match search term against any of the specified fields
    const lowerSearchTerm = searchTerm.toLowerCase().trim()
    const filteredDocuments = result.documents.filter((doc) => {
      return searchFields.some((field) => {
        const fieldValue = (doc as Record<string, unknown>)[field]
        if (typeof fieldValue === 'string') {
          return fieldValue.toLowerCase().includes(lowerSearchTerm)
        }
        return false
      })
    })
    
    return {
      total: filteredDocuments.length,
      documents: filteredDocuments,
    } as Models.DocumentList<T>
  }

  // Get most recent document update time from a collection
  static async getMostRecentUpdateTime(collectionId: string): Promise<Date | null> {
    try {
      const result = await databases.listDocuments(
        appwriteConfig.databaseId,
        collectionId,
        [
          Query.orderDesc('$updatedAt'),
          Query.limit(1)
        ]
      )
      
      if (result.documents.length > 0) {
        return new Date(result.documents[0].$updatedAt)
      }
      return null
    } catch (error) {
      console.error(`Error fetching most recent update time for ${collectionId}:`, error)
      return null
    }
  }
}

// Reports metadata service
export const reportsService = {
  // Get last generated time for each report type based on source data
  getReportMetadata: async () => {
    try {
      const [
        eventsTime,
        clientsTime,
        usersTime,
        reviewsTime,
      ] = await Promise.all([
        DatabaseService.getMostRecentUpdateTime(COLLECTION_IDS.EVENTS),
        DatabaseService.getMostRecentUpdateTime(COLLECTION_IDS.CLIENTS),
        DatabaseService.getMostRecentUpdateTime(COLLECTION_IDS.USER_PROFILES),
        DatabaseService.getMostRecentUpdateTime(COLLECTION_IDS.REVIEWS),
      ])

      return {
        events: eventsTime,
        clients: clientsTime,
        users: usersTime,
        reviews: reviewsTime,
      }
    } catch (error) {
      console.error('Error fetching report metadata:', error)
      return {
        events: null,
        clients: null,
        users: null,
        reviews: null,
      }
    }
  }
}

// User Profile interface
export interface UserProfile extends Models.Document {
  authID: string
  role: string
  firstname?: string
  lastname?: string
  username?: string
  phoneNumber?: string
  dob?: string
  zipCode?: string
  isBlocked?: boolean
  idAdult?: boolean
  avatarURL?: string // User profile image URL
  // Points & stats fields (match actual database column names)
  totalPoints?: number
  totalReviews?: number
  totalEvents?: number
  isAmbassador?: boolean
  isInfluencer?: boolean
  referralCode?: string
  favoriteIds?: string | string[] // JSON string array or array of event IDs
  savedEventIds?: string // JSON string with saved event data
  // Legacy field names for backward compatibility
  userPoints?: number
  tierLevel?: string
  baBadge?: boolean
  influencerBadge?: boolean
  checkIns?: number
  reviews?: number
  triviasWon?: number
  checkInReviewPoints?: number
  [key: string]: unknown
}

/** Parse user favoriteIds (JSON string or array) to event ID array for counting favorites. */
function parseFavoriteIds(favoriteIds?: string | string[]): string[] {
  if (favoriteIds == null) return []
  if (Array.isArray(favoriteIds)) return favoriteIds.filter((id): id is string => typeof id === 'string')
  try {
    const parsed = JSON.parse(favoriteIds as string)
    return Array.isArray(parsed) ? parsed.filter((id: unknown): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

// User Profiles service
export const userProfilesService = {
  create: (data: Record<string, unknown>) =>
    DatabaseService.create<UserProfile>(appwriteConfig.collections.userProfiles, data),
  getById: (id: string) =>
    DatabaseService.getById<UserProfile>(appwriteConfig.collections.userProfiles, id),
  list: (queries?: string[]) =>
    DatabaseService.list<UserProfile>(appwriteConfig.collections.userProfiles, queries),
  update: (id: string, data: Record<string, unknown>) =>
    DatabaseService.update<UserProfile>(appwriteConfig.collections.userProfiles, id, data),
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.userProfiles, id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search<UserProfile>(
      appwriteConfig.collections.userProfiles,
      searchTerm,
      ['firstname', 'lastname', 'username', 'phoneNumber'],
      queries
    ),
  findByAuthID: async (authID: string): Promise<UserProfile | null> => {
    const result = await DatabaseService.list<UserProfile>(
      appwriteConfig.collections.userProfiles,
      [Query.equal('authID', [authID])]
    )
    return result.documents[0] || null
  },
}

// Client Document interface
export interface ClientDocument extends Models.Document {
  name: string
  logoURL?: string
  productType?: string[]
  [key: string]: unknown
}

// Client interface (for UI)
export type Client = ClientDocument

// Client Form Data interface
export interface ClientFormData {
  name: string
  logoURL?: string
  productType?: string[]
  description?: string
}

// Clients service
export const clientsService = {
  create: (data: ClientFormData) => {
    const dbData: Record<string, unknown> = {
      name: data.name,
      logoURL: data.logoURL || null,
      productType: data.productType || [],
      description: data.description || null,
    }

    return DatabaseService.create<ClientDocument>(appwriteConfig.collections.clients, dbData)
  },
  getById: (id: string) =>
    DatabaseService.getById<ClientDocument>(appwriteConfig.collections.clients, id),
  list: (queries?: string[]) =>
    DatabaseService.list<ClientDocument>(appwriteConfig.collections.clients, queries),
  // OPTIMIZATION: Batch fetch multiple clients by IDs
  getByIds: async (ids: string[]): Promise<Map<string, ClientDocument>> => {
    const clientsMap = new Map<string, ClientDocument>()
    if (ids.length === 0) return clientsMap
    
    try {
      // Fetch all clients in parallel
      const clientPromises = ids.map(id => DatabaseService.getById<ClientDocument>(appwriteConfig.collections.clients, id))
      const clients = await Promise.all(clientPromises)
      
      // Build a map of clientId -> client for O(1) lookup
      clients.forEach((client, index) => {
        if (client) {
          clientsMap.set(ids[index], client)
        }
      })
    } catch (err) {
      console.error('Error fetching clients batch:', err)
    }
    
    return clientsMap
  },
  update: (id: string, data: Partial<ClientFormData>) => {
    const dbData: Record<string, unknown> = {
      ...data,
    }

    return DatabaseService.update<ClientDocument>(appwriteConfig.collections.clients, id, dbData)
  },
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.clients, id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search<ClientDocument>(
      appwriteConfig.collections.clients,
      searchTerm,
      ['name'],
      queries
    ),
  findByName: async (name: string): Promise<ClientDocument | null> => {
    const result = await DatabaseService.list<ClientDocument>(
      appwriteConfig.collections.clients,
      [Query.equal('name', [name])]
    )
    return result.documents[0] || null
  },
  
  // Compute stats for a single client
  getClientStats: async (clientId: string): Promise<{
    totalEvents: number
    totalFavorites: number
    totalCheckIns: number
    totalPoints: number
  }> => {
    try {
      // 1. Get all events for this client
      const eventsResult = await DatabaseService.list<EventDocument>(
        appwriteConfig.collections.events,
        [Query.equal('client', [clientId]), Query.limit(1000)]
      )
      const events = eventsResult.documents
      const totalEvents = eventsResult.total
      const eventIds = events.map(e => e.$id)
      
      let totalCheckIns = 0
      let totalPoints = 0
      if (eventIds.length > 0) {
        const chunkSize = 100
        for (let i = 0; i < eventIds.length; i += chunkSize) {
          const chunk = eventIds.slice(i, i + chunkSize)
          const reviewsResult = await DatabaseService.list<ReviewDocument>(
            appwriteConfig.collections.reviews,
            [Query.equal('event', chunk), Query.limit(1000)]
          )
          totalCheckIns += reviewsResult.total
          totalPoints += reviewsResult.documents.reduce((sum, r) => sum + (r.pointsEarned || 0), 0)
        }
      }

      // 3. Count favorites from all users' favoriteIds arrays (paginate so we don't miss anyone)
      let totalFavorites = 0
      const userPageSize = 500
      let userOffset = 0
      let userChunk: UserProfile[]
      do {
        const usersResult = await DatabaseService.list<UserProfile>(
          appwriteConfig.collections.userProfiles,
          [Query.limit(userPageSize), Query.offset(userOffset)]
        )
        userChunk = usersResult.documents ?? []
        const eventIdSet = new Set(eventIds)
        for (const user of userChunk) {
          const ids = parseFavoriteIds(user.favoriteIds)
          for (const favId of ids) {
            if (eventIdSet.has(favId) || favId === clientId) totalFavorites++
          }
        }
        userOffset += userPageSize
      } while (userChunk.length === userPageSize)
      
      return { totalEvents, totalFavorites, totalCheckIns, totalPoints }
    } catch (err) {
      console.error('Error computing client stats:', err)
      return { totalEvents: 0, totalFavorites: 0, totalCheckIns: 0, totalPoints: 0 }
    }
  },
  
  // Compute stats for multiple clients (batch operation)
  getClientsStats: async (clientIds: string[]): Promise<Map<string, {
    totalEvents: number
    totalFavorites: number
    totalCheckIns: number
    totalPoints: number
  }>> => {
    const statsMap = new Map<string, { totalEvents: number; totalFavorites: number; totalCheckIns: number; totalPoints: number }>()
    
    if (clientIds.length === 0) return statsMap
    
    try {
      // 1. Get all events for all clients (chunk clientIds to stay under Appwrite's 100-value limit per query)
      const eventsByClient = new Map<string, EventDocument[]>()
      const allEventIds: string[] = []
      const CLIENT_IDS_CHUNK = 100

      for (let i = 0; i < clientIds.length; i += CLIENT_IDS_CHUNK) {
        const chunk = clientIds.slice(i, i + CLIENT_IDS_CHUNK)
        const eventsResult = await DatabaseService.list<EventDocument>(
          appwriteConfig.collections.events,
          [Query.equal('client', chunk), Query.limit(5000)]
        )
        for (const event of eventsResult.documents) {
          const clientId = event.client as string
          if (clientId) {
            if (!eventsByClient.has(clientId)) {
              eventsByClient.set(clientId, [])
            }
            eventsByClient.get(clientId)!.push(event)
            allEventIds.push(event.$id)
          }
        }
      }
      
      // 2. Get all reviews for all events
      const reviewsByEvent = new Map<string, ReviewDocument[]>()
      if (allEventIds.length > 0) {
        const chunkSize = 100
        for (let i = 0; i < allEventIds.length; i += chunkSize) {
          const chunk = allEventIds.slice(i, i + chunkSize)
          const reviewsResult = await DatabaseService.list<ReviewDocument>(
            appwriteConfig.collections.reviews,
            [Query.equal('event', chunk), Query.limit(5000)]
          )
          for (const review of reviewsResult.documents) {
            const eventId = review.event as string
            if (eventId) {
              if (!reviewsByEvent.has(eventId)) {
                reviewsByEvent.set(eventId, [])
              }
              reviewsByEvent.get(eventId)!.push(review)
            }
          }
        }
      }
      
      // 3. Fetch ALL users in pages so we don't miss anyone (favorites count from favoriteIds)
      const allUsers: UserProfile[] = []
      const USER_PAGE_SIZE = 500
      let userOffset = 0
      let userChunk: UserProfile[]
      do {
        const userResult = await DatabaseService.list<UserProfile>(
          appwriteConfig.collections.userProfiles,
          [Query.limit(USER_PAGE_SIZE), Query.offset(userOffset)]
        )
        userChunk = userResult.documents ?? []
        allUsers.push(...userChunk)
        userOffset += USER_PAGE_SIZE
      } while (userChunk.length === USER_PAGE_SIZE)

      // 4. Compute stats for each client
      for (const clientId of clientIds) {
        const clientEvents = eventsByClient.get(clientId) || []
        const clientEventIds = clientEvents.map(e => e.$id)

        let totalCheckIns = 0
        let totalPoints = 0

        for (const eventId of clientEventIds) {
          const eventReviews = reviewsByEvent.get(eventId) || []
          totalCheckIns += eventReviews.length
          totalPoints += eventReviews.reduce((sum, r) => sum + (r.pointsEarned || 0), 0)
        }

        // Favorites count from users' favoriteIds: event IDs that belong to this client, or the client ID itself
        let totalFavorites = 0
        const clientEventIdSet = new Set(clientEventIds)
        for (const user of allUsers) {
          const ids = parseFavoriteIds(user.favoriteIds)
          for (const favId of ids) {
            if (clientEventIdSet.has(favId) || favId === clientId) totalFavorites++
          }
        }

        statsMap.set(clientId, {
          totalEvents: clientEvents.length,
          totalFavorites,
          totalCheckIns,
          totalPoints,
        })
      }
      
      return statsMap
    } catch (err) {
      console.error('Error computing clients stats batch:', err)
      return statsMap
    }
  },
}

// Event Document interface
export interface EventDocument extends Models.Document {
  name: string
  date: string
  startTime: string
  endTime: string
  city: string
  address: string
  state: string
  zipCode: string
  products?: string[]
  discount?: string
  discountImageURL?: string
  checkInCode: string
  checkInPoints: number
  reviewPoints: number
  eventInfo: string
  brandDescription?: string // Brand description text field
  isArchived: boolean
  isHidden: boolean
  radius?: number
  location?: [number, number] // [longitude, latitude]
  client?: string // Client ID (relationship)
  categories?: string // Category ID (relationship)
  [key: string]: unknown
}

// Events service
export const eventsService = {
  create: (data: Record<string, unknown>) =>
    DatabaseService.create<EventDocument>(appwriteConfig.collections.events, data),
  getById: (id: string) =>
    DatabaseService.getById<EventDocument>(appwriteConfig.collections.events, id),
  list: (queries?: string[]) =>
    DatabaseService.list<EventDocument>(appwriteConfig.collections.events, queries),
  update: (id: string, data: Record<string, unknown>) =>
    DatabaseService.update<EventDocument>(appwriteConfig.collections.events, id, data),
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.events, id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search<EventDocument>(
      appwriteConfig.collections.events,
      searchTerm,
      ['name', 'city', 'address', 'state'],
      queries
    ),
}

// Category Document interface
export interface CategoryDocument extends Models.Document {
  title: string
  isAdult?: boolean
  [key: string]: unknown
}

// Categories service
export const categoriesService = {
  create: (data: { title: string; isAdult?: boolean }) =>
    DatabaseService.create<CategoryDocument>(appwriteConfig.collections.categories || 'categories', data),
  getById: (id: string) =>
    DatabaseService.getById<CategoryDocument>(appwriteConfig.collections.categories || 'categories', id),
  list: (queries?: string[]) =>
    DatabaseService.list<CategoryDocument>(appwriteConfig.collections.categories || 'categories', queries),
  update: (id: string, data: { title: string; isAdult?: boolean }) =>
    DatabaseService.update<CategoryDocument>(appwriteConfig.collections.categories || 'categories', id, data),
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.categories || 'categories', id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search<CategoryDocument>(
      appwriteConfig.collections.categories || 'categories',
      searchTerm,
      ['title'],
      queries
    ),
  findByTitle: async (title: string): Promise<CategoryDocument | null> => {
    const result = await DatabaseService.list<CategoryDocument>(
      appwriteConfig.collections.categories || 'categories',
      [Query.equal('title', [title])]
    )
    return result.documents[0] || null
  },
}

// Trivia Document interface
export interface TriviaDocument extends Models.Document {
  client?: string // Relationship to clients table
  question: string
  answers?: string[]
  correctOptionIndex: number
  startDate: string
  endDate: string
  points: number
  views?: number // Number of times trivia was viewed
  skips?: number // Number of times trivia was skipped
  [key: string]: unknown
}

// Trivia Response Document interface
export interface TriviaResponseDocument extends Models.Document {
  trivia?: string // Relationship to trivia table (trivia ID)
  answer?: string // Answer text
  answerIndex: number // Index of the answer selected (0-10000)
  user?: string // Relationship to user_profiles table (user ID)
  [key: string]: unknown
}

// Trivia Responses service
export const triviaResponsesService = {
  create: (data: Record<string, unknown>) =>
    DatabaseService.create<TriviaResponseDocument>(appwriteConfig.collections.triviaResponses, data),
  getById: (id: string) =>
    DatabaseService.getById<TriviaResponseDocument>(appwriteConfig.collections.triviaResponses, id),
  list: (queries?: string[]) =>
    DatabaseService.list<TriviaResponseDocument>(appwriteConfig.collections.triviaResponses, queries),
  update: (id: string, data: Record<string, unknown>) =>
    DatabaseService.update<TriviaResponseDocument>(appwriteConfig.collections.triviaResponses, id, data),
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.triviaResponses, id),
  getByTriviaId: async (triviaId: string): Promise<TriviaResponseDocument[]> => {
    const result = await DatabaseService.list<TriviaResponseDocument>(
      appwriteConfig.collections.triviaResponses,
      [Query.equal('trivia', [triviaId])]
    )
    return result.documents
  },
  getByUserId: async (userId: string): Promise<TriviaResponseDocument[]> => {
    const result = await DatabaseService.list<TriviaResponseDocument>(
      appwriteConfig.collections.triviaResponses,
      [Query.equal('user', [userId])]
    )
    return result.documents
  },
  /** Count correct trivia answers (wins) for a user from trivia_responses + trivia correctOptionIndex */
  getTriviasWonCountByUserId: async (userId: string): Promise<number> => {
    const responses = await triviaResponsesService.getByUserId(userId)
    if (responses.length === 0) return 0
    const triviaIds = [...new Set(responses.map((r) => r.trivia).filter(Boolean))] as string[]
    let count = 0
    for (const tid of triviaIds) {
      try {
        const trivia = await triviaService.getById(tid)
        const correct = responses.filter(
          (r) => r.trivia === tid && r.answerIndex === trivia.correctOptionIndex
        )
        count += correct.length
      } catch {
        // Trivia may be deleted, skip
      }
    }
    return count
  },
}

// Trivia service
export const triviaService = {
  create: (data: Record<string, unknown>) =>
    DatabaseService.create<TriviaDocument>(appwriteConfig.collections.trivia, data),
  getById: (id: string) =>
    DatabaseService.getById<TriviaDocument>(appwriteConfig.collections.trivia, id),
  list: (queries?: string[]) =>
    DatabaseService.list<TriviaDocument>(appwriteConfig.collections.trivia, queries),
  update: (id: string, data: Record<string, unknown>) =>
    DatabaseService.update<TriviaDocument>(appwriteConfig.collections.trivia, id, data),
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.trivia, id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search<TriviaDocument>(
      appwriteConfig.collections.trivia,
      searchTerm,
      ['question'],
      queries
    ),
  getWithClient: async (id: string): Promise<{ trivia: TriviaDocument; client: ClientDocument | null }> => {
    const trivia = await DatabaseService.getById<TriviaDocument>(appwriteConfig.collections.trivia, id)
    let client: ClientDocument | null = null
    if (trivia.client) {
      try {
        client = await DatabaseService.getById<ClientDocument>(appwriteConfig.collections.clients, trivia.client)
      } catch (error) {
        console.error('Error fetching client:', error)
      }
    }
    return { trivia, client }
  },
  getWithStatistics: async (id: string): Promise<{
    trivia: TriviaDocument
    client: ClientDocument | null
    responses: TriviaResponseDocument[]
    statistics: {
      totalResponses: number
      correctResponses: number
      incorrectResponses: number
      uniqueUsers: number
    }
  }> => {
    const { trivia, client } = await triviaService.getWithClient(id)
    const responses = await triviaResponsesService.getByTriviaId(id)
    
    const correctResponses = responses.filter(
      (response) => response.answerIndex === trivia.correctOptionIndex
    )
    const uniqueUsers = new Set(responses.map((r) => r.user).filter(Boolean)).size
    
    return {
      trivia,
      client,
      responses,
      statistics: {
        totalResponses: responses.length,
        correctResponses: correctResponses.length,
        incorrectResponses: responses.length - correctResponses.length,
        uniqueUsers,
      },
    }
  },
}

// User Form Data interface (for creating/updating users)
export interface UserFormData {
  email: string
  password: string
  firstname?: string
  lastname?: string
  username?: string
  phoneNumber?: string
  dob?: string
  zipCode?: string
  role?: 'admin' | 'user'
  tierLevel?: string
  totalPoints?: number
}

// App User interface (combines Auth user and user_profiles)
export interface AppUser extends UserProfile {
  email?: string
  firstName?: string // Mapped from firstname for UI compatibility
  lastName?: string // Mapped from lastname for UI compatibility
  lastLoginDate?: string // Last login date from Auth (accessedAt)
  // Additional fields from Auth user can be added here
}

/** Batch size for get-user-emails to stay under Appwrite's 30s synchronous execution limit */
const GET_USER_EMAILS_BATCH_SIZE = 25

/**
 * Fetches emails and last login dates for auth IDs in batches to avoid function timeout.
 * Each batch runs in a separate execution so no single call exceeds the 30s limit.
 */
async function fetchUserEmailsInBatches(authIDs: string[]): Promise<{
  emailMap: Record<string, string>
  lastLoginMap: Record<string, string>
}> {
  const emailMap: Record<string, string> = {}
  const lastLoginMap: Record<string, string> = {}
  if (authIDs.length === 0 || !appwriteConfig.functions.statisticsFunctionId) {
    return { emailMap, lastLoginMap }
  }
  const chunks: string[][] = []
  for (let i = 0; i < authIDs.length; i += GET_USER_EMAILS_BATCH_SIZE) {
    chunks.push(authIDs.slice(i, i + GET_USER_EMAILS_BATCH_SIZE))
  }
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const execution = await functions.createExecution({
        functionId: appwriteConfig.functions.statisticsFunctionId,
        xpath: '/get-user-emails',
        method: ExecutionMethod.POST,
        body: JSON.stringify({ authIDs: chunk }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (execution.status !== 'completed' || !execution.responseBody) return { emails: {} as Record<string, string>, lastLogins: {} as Record<string, string> }
      try {
        const response = JSON.parse(execution.responseBody)
        if (!response.success) return { emails: {}, lastLogins: {} }
        return {
          emails: response.emails ?? {},
          lastLogins: response.lastLogins ?? {},
        }
      } catch {
        return { emails: {}, lastLogins: {} }
      }
    })
  )
  for (const r of results) {
    Object.assign(emailMap, r.emails)
    Object.assign(lastLoginMap, r.lastLogins)
  }
  return { emailMap, lastLoginMap }
}

// Users service - handles creating Auth users and user_profiles
export const appUsersService = {
  // Create a new user (Auth + user_profiles) via Mobile API function (server-side creates both)
  create: async (userData: UserFormData): Promise<AppUser> => {
    try {
      if (!appwriteConfig.functions.mobileApiFunctionId) {
        throw new Error('Mobile API function is not configured. Cannot create Auth user.')
      }

      const body = {
        email: userData.email,
        password: userData.password,
        firstname: userData.firstname ?? '',
        lastname: userData.lastname ?? '',
        username: userData.username ?? '',
        phoneNumber: userData.phoneNumber ?? '',
        role: userData.role ?? 'user',
        tierLevel: userData.tierLevel ?? '',
        totalPoints: userData.totalPoints ?? 100,
      }

      const execution = await functions.createExecution({
        functionId: appwriteConfig.functions.mobileApiFunctionId,
        xpath: '/create-user',
        method: ExecutionMethod.POST,
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })

      if (execution.status !== 'completed' || !execution.responseBody) {
        const msg =
          execution.status === 'failed'
            ? execution.responseBody ?? 'Create user failed'
            : 'Create user request did not complete in time.'
        throw new Error(msg)
      }

      const response = JSON.parse(execution.responseBody) as {
        success?: boolean
        error?: string
        profileId?: string
      }

      const status = execution.responseStatusCode ?? 0
      if (status < 200 || status >= 300) {
        throw new Error(response.error ?? 'Failed to create user.')
      }

      if (!response.success || !response.profileId) {
        throw new Error(response.error ?? 'Failed to create user.')
      }

      const profile = await userProfilesService.getById(response.profileId)
      if (!profile) throw new Error('User profile was created but could not be retrieved.')

      return {
        ...profile,
        firstName: (profile as { firstname?: string }).firstname,
        lastName: (profile as { lastname?: string }).lastname,
      } as AppUser
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  },

  // List all users with their profiles
  list: async (queries?: string[]): Promise<AppUser[]> => {
    try {
      const profiles = await userProfilesService.list(queries)
      
      // Fetch Auth user emails and last login dates via Cloud Function (batched to avoid 30s timeout)
      const authIDs = profiles.documents
        .map((profile) => (profile as { authID?: string }).authID)
        .filter((id): id is string => !!id)

      let emailMap: Record<string, string> = {}
      let lastLoginMap: Record<string, string> = {}
      try {
        const result = await fetchUserEmailsInBatches(authIDs)
        emailMap = result.emailMap
        lastLoginMap = result.lastLoginMap
      } catch (emailError) {
        console.warn('Failed to fetch user emails:', emailError)
        // Continue without emails rather than failing completely
      }

      // Map profiles with emails, last login dates, and name fields
      return profiles.documents.map((profile) => {
        const authID = (profile as { authID?: string }).authID
        return {
          ...profile,
          // Map firstname/lastname to firstName/lastName for UI compatibility
          firstName: (profile as { firstname?: string }).firstname,
          lastName: (profile as { lastname?: string }).lastname,
          // Add email from Auth user
          email: authID ? emailMap[authID] : undefined,
          // Add last login date from Auth user
          lastLoginDate: authID ? lastLoginMap[authID] : undefined,
        }
      }) as AppUser[]
    } catch (error) {
      console.error('Error listing users:', error)
      throw error
    }
  },
  
  // List users with pagination info
  listWithPagination: async (queries?: string[]): Promise<{ users: AppUser[]; total: number }> => {
    try {
      const profiles = await userProfilesService.list(queries)
      
      // Fetch Auth user emails and last login dates via Cloud Function (batched to avoid 30s timeout)
      const authIDs = profiles.documents
        .map((profile) => (profile as { authID?: string }).authID)
        .filter((id): id is string => !!id)

      let emailMap: Record<string, string> = {}
      let lastLoginMap: Record<string, string> = {}
      try {
        const result = await fetchUserEmailsInBatches(authIDs)
        emailMap = result.emailMap
        lastLoginMap = result.lastLoginMap
      } catch (emailError) {
        console.warn('Failed to fetch user emails:', emailError)
        // Continue without emails rather than failing completely
      }

      // Map profiles with emails, last login dates, and name fields
      const users = profiles.documents.map((profile) => {
        const authID = (profile as { authID?: string }).authID
        return {
          ...profile,
          // Map firstname/lastname to firstName/lastName for UI compatibility
          firstName: (profile as { firstname?: string }).firstname,
          lastName: (profile as { lastname?: string }).lastname,
          // Add email from Auth user
          email: authID ? emailMap[authID] : undefined,
          // Add last login date from Auth user
          lastLoginDate: authID ? lastLoginMap[authID] : undefined,
        }
      }) as AppUser[]
      
      return {
        users,
        total: profiles.total,
      }
    } catch (error) {
      console.error('Error listing users:', error)
      throw error
    }
  },

  // Get user by ID
  getById: async (id: string): Promise<AppUser | null> => {
    try {
      const profile = await userProfilesService.getById(id)
      if (!profile) return null
      
      // Fetch Auth user email via Cloud Function (uses same batched helper for consistency)
      const authID = (profile as { authID?: string }).authID
      let email: string | undefined
      if (authID) {
        try {
          const { emailMap } = await fetchUserEmailsInBatches([authID])
          email = emailMap[authID]
        } catch (emailError) {
          console.warn('Failed to fetch user email:', emailError)
        }
      }

      // Map firstname/lastname to firstName/lastName for UI compatibility
      return {
        ...profile,
        firstName: (profile as { firstname?: string }).firstname,
        lastName: (profile as { lastname?: string }).lastname,
        email,
      } as AppUser
    } catch (error) {
      console.error('Error getting user:', error)
      return null
    }
  },

  // Update user profile
  update: async (id: string, data: Record<string, unknown>): Promise<AppUser> => {
    try {
      // Validate username uniqueness if username is being updated
      if (data.username && typeof data.username === 'string' && data.username.trim()) {
        const existingUsers = await userProfilesService.list([
          Query.equal('username', data.username.trim())
        ])
        
        // Check if username exists for a different user (exclude current user)
        const duplicateUser = existingUsers.documents.find(user => user.$id !== id)
        if (duplicateUser) {
          throw new Error('Username already exists. Please choose a different username.')
        }
      }
      
      // Update user_profiles
      const updatedProfile = await userProfilesService.update(id, data)
      
      // Map firstname/lastname to firstName/lastName for UI compatibility
      return {
        ...updatedProfile,
        firstName: (updatedProfile as { firstname?: string }).firstname,
        lastName: (updatedProfile as { lastname?: string }).lastname,
      } as AppUser
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  },

  // Delete user (Auth + user_profiles)
  delete: async (id: string): Promise<void> => {
    try {
      // Step 1: Delete user_profiles
      await userProfilesService.delete(id)
      
      // Step 2: Delete Auth user
      // Note: This requires server-side access (Users.delete)
      // For now, we'll only delete the profile
      // You may need to implement a Cloud Function to delete Auth user
      console.warn('Auth user deletion requires server-side execution')
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  },

  // Search users
  // Note: Appwrite Tables search may require different query syntax
  search: async (searchTerm: string, queries?: string[]): Promise<AppUser[]> => {
    try {
      const result = await userProfilesService.search(
        searchTerm,
        queries
      )
      
      // Fetch Auth user emails via Cloud Function (batched to avoid 30s timeout)
      const authIDs = result.documents
        .map((profile) => (profile as { authID?: string }).authID)
        .filter((id): id is string => !!id)

      let emailMap: Record<string, string> = {}
      try {
        const batchResult = await fetchUserEmailsInBatches(authIDs)
        emailMap = batchResult.emailMap
      } catch (emailError) {
        console.warn('Failed to fetch user emails:', emailError)
      }

      // Map firstname/lastname to firstName/lastName for UI compatibility
      return result.documents.map((profile) => {
        const authID = (profile as { authID?: string }).authID
        return {
          ...profile,
          firstName: (profile as { firstname?: string }).firstname,
          lastName: (profile as { lastname?: string }).lastname,
          email: authID ? emailMap[authID] : undefined,
        }
      }) as AppUser[]
    } catch (error) {
      console.error('Error searching users:', error)
      throw error
    }
  },

  // Block a user (update both Appwrite Auth and user_profile)
  // Note: userId parameter is the user_profile document ID
  blockUser: async (userId: string): Promise<void> => {
    try {
      if (!appwriteConfig.functions.mobileApiFunctionId) {
        throw new Error('Mobile API function ID is not configured')
      }

      // Get the user profile to retrieve the authID
      const userProfile = await userProfilesService.getById(userId)
      if (!userProfile.authID) {
        throw new Error('User profile does not have an authID')
      }

      const execution = await functions.createExecution({
        functionId: appwriteConfig.functions.mobileApiFunctionId,
        xpath: '/update-user-status',
        method: ExecutionMethod.POST,
        body: JSON.stringify({ userId: userProfile.authID, block: true }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (execution.responseStatusCode !== 200) {
        throw new Error(`Failed to block user: ${execution.responseBody}`)
      }

      const response = JSON.parse(execution.responseBody)
      if (!response.success) {
        throw new Error(response.error || 'Failed to block user')
      }
    } catch (error) {
      console.error('Error blocking user:', error)
      throw error
    }
  },

  // Unblock a user (update both Appwrite Auth and user_profile)
  // Note: userId parameter is the user_profile document ID
  unblockUser: async (userId: string): Promise<void> => {
    try {
      if (!appwriteConfig.functions.mobileApiFunctionId) {
        throw new Error('Mobile API function ID is not configured')
      }

      // Get the user profile to retrieve the authID
      const userProfile = await userProfilesService.getById(userId)
      if (!userProfile.authID) {
        throw new Error('User profile does not have an authID')
      }

      const execution = await functions.createExecution({
        functionId: appwriteConfig.functions.mobileApiFunctionId,
        xpath: '/update-user-status',
        method: ExecutionMethod.POST,
        body: JSON.stringify({ userId: userProfile.authID, block: false }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (execution.responseStatusCode !== 200) {
        throw new Error(`Failed to unblock user: ${execution.responseBody}`)
      }

      const response = JSON.parse(execution.responseBody)
      if (!response.success) {
        throw new Error(response.error || 'Failed to unblock user')
      }
    } catch (error) {
      console.error('Error unblocking user:', error)
      throw error
    }
  },
}

// Statistics Type Definitions
export interface DashboardStats {
  totalClientsBrands: number
  totalPointsAwarded: number
  totalUsers: number
  averagePPU: number
  totalCheckins: number
  reviews: number
  totalClientsBrandsChange?: number
  totalPointsAwardedChange?: number
  totalUsersChange?: number
  averagePPUChange?: number
  totalCheckinsChange?: number
  reviewsChange?: number
}

export interface ClientsStats {
  totalClients: number
  newThisMonth: number
}

export interface UsersStats {
  totalUsers: number
  avgPoints: number
  newThisWeek: number
  usersInBlacklist: number
}

export interface NotificationsStats {
  totalSent: number
  avgOpenRate: number
  avgClickRate: number
  scheduled: number
}

export interface TriviaStats {
  totalQuizzes: number
  scheduled: number
  active: number
  completed: number
}

// Statistics Service
export const statisticsService = {
  /**
   * Get statistics for a specific page
   * @param page - The page to get statistics for: 'dashboard' | 'clients' | 'users' | 'notifications' | 'trivia'
   * @returns Statistics object for the requested page
   */
  getStatistics: async <T extends DashboardStats | ClientsStats | UsersStats | NotificationsStats | TriviaStats>(
    page: 'dashboard' | 'clients' | 'users' | 'notifications' | 'trivia'
  ): Promise<T> => {
    try {
      const execution = await functions.createExecution({
        functionId: appwriteConfig.functions.statisticsFunctionId,
        xpath: '/get-statistics',
        method: ExecutionMethod.POST,
        body: JSON.stringify({ page }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Check execution status
      if (execution.status === 'failed') {
        let errorMessage = 'Function execution failed'
        
        // Try to parse the response body for error details
        if (execution.responseBody) {
          try {
            const errorResponse = JSON.parse(execution.responseBody)
            if (errorResponse.error) {
              errorMessage = errorResponse.error
            }
          } catch {
            // If responseBody is not JSON, use it as the error message
            errorMessage = execution.responseBody
          }
        }
        
        // Include execution errors if available
        if (execution.errors) {
          errorMessage += ` (Execution errors: ${execution.errors})`
        }
        
        throw new Error(errorMessage)
      }

      // Check response status code
      if (execution.responseStatusCode && execution.responseStatusCode >= 400) {
        let errorMessage = `Function returned status ${execution.responseStatusCode}`
        
        if (execution.responseBody) {
          try {
            const errorResponse = JSON.parse(execution.responseBody)
            if (errorResponse.error) {
              errorMessage = errorResponse.error
            }
          } catch {
            errorMessage = execution.responseBody
          }
        }
        
        throw new Error(errorMessage)
      }

      // Parse response body
      let response: Record<string, unknown> = {}
      if (execution.responseBody) {
        try {
          response = JSON.parse(execution.responseBody) as Record<string, unknown>
        } catch {
          throw new Error(`Invalid JSON response from function: ${execution.responseBody}`)
        }
      }

      if (!response.success) {
        const errorMessage = typeof response.error === 'string' ? response.error : 'Failed to fetch statistics'
        throw new Error(errorMessage)
      }

      return response.statistics as T
    } catch (error) {
      console.error(`Error fetching statistics for ${page}:`, error)
      throw error
    }
  },
}

// Notification Document interface
export interface NotificationDocument extends Models.Document {
  title: string
  message: string
  type: 'Event Reminder' | 'Promotional' | 'Engagement'
  targetAudience: 'All' | 'Targeted' | 'Specific Segment'
  status: 'Scheduled' | 'Sent' | 'Draft'
  scheduledAt?: string // ISO date string for scheduled notifications
  sentAt?: string // ISO date string when notification was sent
  recipients?: number // Number of recipients
  openRate?: number // Percentage of users who opened
  clickRate?: number // Percentage of users who clicked
  [key: string]: unknown
}

// Notification Form Data interface
export interface NotificationFormData {
  title: string
  message: string
  type: 'Event Reminder' | 'Promotional' | 'Engagement'
  targetAudience: 'All' | 'Targeted' | 'Specific Segment'
  schedule: 'Send Immediately' | 'Schedule for Later' | 'Recurring'
  scheduledAt?: string // ISO date string
  scheduledTime?: string // Time string (HH:mm)
}

// Notifications service
export const notificationsService = {
  create: async (data: NotificationFormData): Promise<NotificationDocument> => {
    const dbData: Record<string, unknown> = {
      title: data.title,
      message: data.message,
      type: data.type,
      targetAudience: data.targetAudience,
      // Always start with 'Draft' status - function will update to 'Sent' after sending
      status: data.schedule === 'Schedule for Later' ? 'Scheduled' : 'Draft',
      recipients: 0, // Will be updated when notification is sent
    }

    // Handle scheduling
    if (data.schedule === 'Schedule for Later' && data.scheduledAt && data.scheduledTime) {
      // Combine date and time
      const [hours, minutes] = data.scheduledTime.split(':')
      const scheduledDate = new Date(data.scheduledAt)
      scheduledDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)
      dbData.scheduledAt = formatDateWithTimezone(scheduledDate)
    }

    const notification = await DatabaseService.create<NotificationDocument>(
      appwriteConfig.collections.notifications,
      dbData
    )

    // If sending immediately, trigger the send function
    // The function will update status to 'Sent' and set sentAt after sending
    if (data.schedule === 'Send Immediately') {
      try {
        await notificationsService.sendNotification(notification.$id)
      } catch (error) {
        console.error('Error sending notification:', error)
        // Status is already Draft, so just re-throw the error
        throw error
      }
    }

    return notification
  },

  getById: (id: string) =>
    DatabaseService.getById<NotificationDocument>(appwriteConfig.collections.notifications, id),

  list: (queries?: string[]) =>
    DatabaseService.list<NotificationDocument>(appwriteConfig.collections.notifications, queries),

  update: async (id: string, data: Partial<NotificationFormData>): Promise<NotificationDocument> => {
    // Only include actual database fields
    const dbData: Record<string, unknown> = {
      title: data.title,
      message: data.message,
      type: data.type,
      targetAudience: data.targetAudience,
    }
    
    // Handle scheduling updates
    if (data.schedule === 'Schedule for Later' && data.scheduledAt && data.scheduledTime) {
      const [hours, minutes] = data.scheduledTime.split(':')
      const scheduledDate = new Date(data.scheduledAt)
      scheduledDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)
      dbData.scheduledAt = formatDateWithTimezone(scheduledDate)
      dbData.status = 'Scheduled'
    } else if (data.schedule === 'Send Immediately') {
      // Clear scheduledAt if switching to immediate
      dbData.scheduledAt = null
      dbData.status = 'Draft'
    }

    const updated = await DatabaseService.update<NotificationDocument>(
      appwriteConfig.collections.notifications,
      id,
      dbData
    )

    // If publishing (Send Immediately), trigger the send function after updating the document
    if (data.schedule === 'Send Immediately') {
      try {
        await notificationsService.sendNotification(id)
      } catch (error) {
        console.error('Error sending notification:', error)
        throw error
      }
    }

    return updated
  },

  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.notifications, id),

  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search<NotificationDocument>(
      appwriteConfig.collections.notifications,
      searchTerm,
      ['title', 'message'],
      queries
    ),

  // Send notification via Appwrite function
  sendNotification: async (notificationId: string): Promise<void> => {
    try {
      if (!appwriteConfig.functions.notificationFunctionId) {
        throw new Error('Notification function ID is not configured')
      }

      const execution = await functions.createExecution({
        functionId: appwriteConfig.functions.notificationFunctionId,
        xpath: '/send-notification',
        method: ExecutionMethod.POST,
        body: JSON.stringify({ notificationId }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (execution.status === 'failed') {
        let errorMessage = 'Function execution failed'
        
        if (execution.responseBody) {
          try {
            const errorResponse = JSON.parse(execution.responseBody)
            if (errorResponse.error) {
              errorMessage = errorResponse.error
            }
          } catch {
            errorMessage = execution.responseBody
          }
        }
        
        if (execution.errors) {
          errorMessage += ` (Execution errors: ${execution.errors})`
        }
        
        throw new Error(errorMessage)
      }

      if (execution.responseStatusCode && execution.responseStatusCode >= 400) {
        let errorMessage = `Function returned status ${execution.responseStatusCode}`
        
        if (execution.responseBody) {
          try {
            const errorResponse = JSON.parse(execution.responseBody)
            if (errorResponse.error) {
              errorMessage = errorResponse.error
            }
          } catch {
            errorMessage = execution.responseBody
          }
        }
        
        throw new Error(errorMessage)
      }

      const response = execution.responseBody
        ? JSON.parse(execution.responseBody)
        : {}

      if (!response.success) {
        throw new Error(response.error || 'Failed to send notification')
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      throw error
    }
  },

  // Send system push notification to a specific user
  sendSystemPush: async (userId: string, notificationType: string): Promise<void> => {
    try {
      if (!appwriteConfig.functions.notificationFunctionId) {
        throw new Error('Notification function ID is not configured')
      }

      const execution = await functions.createExecution({
        functionId: appwriteConfig.functions.notificationFunctionId,
        xpath: '/send-system-push',
        method: ExecutionMethod.POST,
        body: JSON.stringify({ userId, notificationType }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (execution.status === 'failed') {
        let errorMessage = 'Function execution failed'
        
        if (execution.responseBody) {
          try {
            const errorResponse = JSON.parse(execution.responseBody)
            if (errorResponse.error) {
              errorMessage = errorResponse.error
            }
          } catch {
            errorMessage = execution.responseBody
          }
        }
        
        if (execution.errors) {
          errorMessage += ` (Execution errors: ${execution.errors})`
        }
        
        throw new Error(errorMessage)
      }

      if (execution.responseStatusCode && execution.responseStatusCode >= 400) {
        let errorMessage = `Function returned status ${execution.responseStatusCode}`
        
        if (execution.responseBody) {
          try {
            const errorResponse = JSON.parse(execution.responseBody)
            if (errorResponse.error) {
              errorMessage = errorResponse.error
            }
          } catch {
            errorMessage = execution.responseBody
          }
        }
        
        throw new Error(errorMessage)
      }

      const response = execution.responseBody
        ? JSON.parse(execution.responseBody)
        : {}

      if (!response.success) {
        throw new Error(response.error || 'Failed to send system push notification')
      }
    } catch (error) {
      console.error('Error sending system push notification:', error)
      throw error
    }
  },
}

// Review Document interface
export interface ReviewDocument extends Models.Document {
  rating: number
  liked?: string
  hasPurchased?: boolean
  review?: string
  user?: string // User ID (relationship)
  event?: string // Event ID (relationship)
  pointsEarned?: number
  helpfulCount?: number
  isHidden?: boolean // Flag for content moderation - hidden reviews are not shown to users
  [key: string]: unknown
}

// Reviews service
export const reviewsService = {
  create: (data: Record<string, unknown>) =>
    DatabaseService.create<ReviewDocument>(appwriteConfig.collections.reviews, data),
  getById: (id: string) =>
    DatabaseService.getById<ReviewDocument>(appwriteConfig.collections.reviews, id),
  list: (queries?: string[]) =>
    DatabaseService.list<ReviewDocument>(appwriteConfig.collections.reviews, queries),
  update: (id: string, data: Record<string, unknown>) =>
    DatabaseService.update<ReviewDocument>(appwriteConfig.collections.reviews, id, data),
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.reviews, id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search<ReviewDocument>(
      appwriteConfig.collections.reviews,
      searchTerm,
      ['review'],
      queries
    ),
  // Get reviews with populated user and event data
  listWithRelations: async (queries?: string[]): Promise<ReviewDocument[]> => {
    const result = await DatabaseService.list<ReviewDocument>(
      appwriteConfig.collections.reviews,
      queries
    )
    return result.documents
  },
  // Hide a review (moderation action)
  hideReview: async (reviewId: string): Promise<ReviewDocument> => {
    return DatabaseService.update<ReviewDocument>(
      appwriteConfig.collections.reviews,
      reviewId,
      { isHidden: true }
    )
  },
  // Unhide a review (restore visibility)
  unhideReview: async (reviewId: string): Promise<ReviewDocument> => {
    return DatabaseService.update<ReviewDocument>(
      appwriteConfig.collections.reviews,
      reviewId,
      { isHidden: false }
    )
  },
}

// Settings Document interface
export interface SettingsDocument extends Models.Document {
  key: string
  value: string
  description?: string
  [key: string]: unknown
}

// Settings service
export const settingsService = {
  // Get a setting by key
  getByKey: async (key: string): Promise<SettingsDocument | null> => {
    try {
      const result = await DatabaseService.list<SettingsDocument>(
        appwriteConfig.collections.settings,
        [Query.equal('key', [key])]
      )
      return result.documents[0] || null
    } catch (error) {
      console.error(`Error fetching setting with key "${key}":`, error)
      return null
    }
  },
  
  // Get multiple settings by keys
  getByKeys: async (keys: string[]): Promise<Map<string, string>> => {
    const settingsMap = new Map<string, string>()
    if (keys.length === 0) return settingsMap
    
    try {
      const result = await DatabaseService.list<SettingsDocument>(
        appwriteConfig.collections.settings,
        [Query.equal('key', keys)]
      )
      
      result.documents.forEach((doc) => {
        settingsMap.set(doc.key, doc.value)
      })
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
    
    return settingsMap
  },
  
  // Get default check-in points from settings
  getDefaultCheckInPoints: async (): Promise<number | null> => {
    const setting = await settingsService.getByKey('checkInPoints')
    if (setting && setting.value) {
      const value = parseFloat(setting.value)
      return isNaN(value) ? null : value
    }
    return null
  },
  
  // Get default review points from settings
  getDefaultReviewPoints: async (): Promise<number | null> => {
    const setting = await settingsService.getByKey('reviewPoints')
    if (setting && setting.value) {
      const value = parseFloat(setting.value)
      return isNaN(value) ? null : value
    }
    return null
  },
}

// Tier Document interface
export interface TierDocument extends Models.Document {
  name: string
  requiredPoints: number
  order: number
  description?: string
  imageURL?: string
  [key: string]: unknown
}

// Tiers service
export const tiersService = {
  // List all tiers ordered by order field
  list: async (): Promise<TierDocument[]> => {
    try {
      const result = await DatabaseService.list<TierDocument>(
        appwriteConfig.collections.tiers,
        [Query.orderAsc('order')]
      )
      return result.documents
    } catch (error) {
      console.error('Error fetching tiers:', error)
      throw error
    }
  },
  
  // Get tier by ID
  getById: (id: string) =>
    DatabaseService.getById<TierDocument>(appwriteConfig.collections.tiers, id),
}

// Location Document interface
export interface LocationDocument extends Models.Document {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  location?: [number, number] // [longitude, latitude] - Must be type "point" in Appwrite collection
  [key: string]: unknown
}

// Location Form Data interface
export interface LocationFormData {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  location?: [number, number] // [longitude, latitude] - Must be type "point" in Appwrite collection
}

// Locations service
// Note: The 'location' field must be configured as type "point" in Appwrite collection
// Format: [longitude, latitude] - same as events collection
export const locationsService = {
  create: (data: LocationFormData) => {
    const dbData: Record<string, unknown> = {
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      location: data.location || null,
    }

    return DatabaseService.create<LocationDocument>(appwriteConfig.collections.locations, dbData)
  },
  getById: (id: string) =>
    DatabaseService.getById<LocationDocument>(appwriteConfig.collections.locations, id),
  list: (queries?: string[]) =>
    DatabaseService.list<LocationDocument>(appwriteConfig.collections.locations, queries),
  update: (id: string, data: Partial<LocationFormData>) => {
    const dbData: Record<string, unknown> = {
      ...data,
    }

    return DatabaseService.update<LocationDocument>(appwriteConfig.collections.locations, id, dbData)
  },
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.locations, id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search<LocationDocument>(
      appwriteConfig.collections.locations,
      searchTerm,
      ['name', 'address', 'city', 'state', 'zipCode'],
      queries
    ),
}