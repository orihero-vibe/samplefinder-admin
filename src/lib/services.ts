import { databases, appwriteConfig, ID, Query, functions, ExecutionMethod } from './appwrite'
import type { Models } from 'appwrite'
import { formatDateWithTimezone } from './dateUtils'

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

  // Search documents
  static async search<T extends Models.Document>(
    collectionId: string,
    searchTerm: string,
    searchFields: string[],
    queries?: string[]
  ): Promise<Models.DocumentList<T>> {
    const searchQueries = searchFields.map((field) =>
      Query.search(field, searchTerm)
    )
    const allQueries = [...(queries || []), ...searchQueries]
    return await this.list<T>(collectionId, allQueries)
  }
}

// User Profile interface
export interface UserProfile extends Models.Document {
  authID: string
  role: string
  [key: string]: unknown
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
  city?: string
  address?: string
  state?: string
  zip?: string
  location?: [number, number] // [longitude, latitude]
  [key: string]: unknown
}

// Client interface (for UI)
export type Client = ClientDocument

// Client Form Data interface
export interface ClientFormData {
  name: string
  logoURL?: string
  productType?: string[]
  city?: string
  address?: string
  state?: string
  zip?: string
  latitude?: number
  longitude?: number
}

// Clients service
export const clientsService = {
  create: (data: ClientFormData) => {
    const dbData: Record<string, unknown> = {
      name: data.name,
      logoURL: data.logoURL || null,
      productType: data.productType || [],
      city: data.city || null,
      address: data.address || null,
      state: data.state || null,
      zip: data.zip || null,
    }

    // Add location if provided
    if (data.latitude !== undefined && data.longitude !== undefined) {
      dbData.location = [data.longitude, data.latitude] // Appwrite expects [longitude, latitude]
    }

    return DatabaseService.create<ClientDocument>(appwriteConfig.collections.clients, dbData)
  },
  getById: (id: string) =>
    DatabaseService.getById<ClientDocument>(appwriteConfig.collections.clients, id),
  list: (queries?: string[]) =>
    DatabaseService.list<ClientDocument>(appwriteConfig.collections.clients, queries),
  update: (id: string, data: Partial<ClientFormData>) => {
    const dbData: Record<string, unknown> = {
      ...data,
    }

    // Handle location update
    if (data.latitude !== undefined && data.longitude !== undefined) {
      dbData.location = [data.longitude, data.latitude]
      delete dbData.latitude
      delete dbData.longitude
    }

    return DatabaseService.update<ClientDocument>(appwriteConfig.collections.clients, id, dbData)
  },
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.clients, id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search<ClientDocument>(
      appwriteConfig.collections.clients,
      searchTerm,
      ['name', 'city', 'state', 'address'],
      queries
    ),
  findByName: async (name: string): Promise<ClientDocument | null> => {
    const result = await DatabaseService.list<ClientDocument>(
      appwriteConfig.collections.clients,
      [Query.equal('name', [name])]
    )
    return result.documents[0] || null
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
  productType?: string[]
  products: string
  discount?: number
  discountImageURL?: string
  checkInCode: string
  checkInPoints: number
  reviewPoints: number
  eventInfo: string
  isArchived: boolean
  isHidden: boolean
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
}

// App User interface (combines Auth user and user_profiles)
export interface AppUser extends UserProfile {
  email?: string
  firstName?: string // Mapped from firstname for UI compatibility
  lastName?: string // Mapped from lastname for UI compatibility
  // Additional fields from Auth user can be added here
}

// Users service - handles creating Auth users and user_profiles
export const appUsersService = {
  // Create a new user (Auth + user_profiles)
  // Note: Creating users as admin requires server-side execution
  // This implementation uses account.create which may work if admin has permissions
  create: async (userData: UserFormData): Promise<AppUser> => {
    try {
      // Step 1: Create Auth user
      // Note: This requires server-side execution or admin permissions
      // For now, we'll create the profile and assume Auth user is created separately
      // In production, use a Cloud Function with server SDK

      // Step 2: Create user profile
      // For now, we'll create profile with a placeholder authID
      // In production, get the actual authID from the Auth user creation
      const profileData = {
        authID: ID.unique(), // Placeholder - should be actual Auth user ID
        firstname: userData.firstname || '',
        lastname: userData.lastname || '',
        username: userData.username || '',
        phoneNumber: userData.phoneNumber || '',
        dob: userData.dob || null,
        zipCode: userData.zipCode || '',
        role: userData.role || 'user',
        isBlocked: false,
      }

      const profile = await userProfilesService.create(profileData)

      // For production, consider using a Cloud Function with server SDK
      return profile as AppUser
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  },

  // List all users with their profiles
  list: async (queries?: string[]): Promise<AppUser[]> => {
    try {
      const profiles = await userProfilesService.list(queries)
      
      // Fetch Auth user emails via Cloud Function
      const authIDs = profiles.documents
        .map((profile) => (profile as { authID?: string }).authID)
        .filter((id): id is string => !!id)

      let emailMap: Record<string, string> = {}
      
      if (authIDs.length > 0 && appwriteConfig.functions.statisticsFunctionId) {
        try {
          const execution = await functions.createExecution({
            functionId: appwriteConfig.functions.statisticsFunctionId,
            xpath: '/get-user-emails',
            method: ExecutionMethod.POST,
            body: JSON.stringify({ authIDs }),
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (execution.status === 'completed' && execution.responseBody) {
            try {
              const response = JSON.parse(execution.responseBody)
              if (response.success && response.emails) {
                emailMap = response.emails
              }
            } catch (parseError) {
              console.warn('Failed to parse email response:', parseError)
            }
          }
        } catch (emailError) {
          console.warn('Failed to fetch user emails:', emailError)
          // Continue without emails rather than failing completely
        }
      }
      
      // Map profiles with emails and name fields
      return profiles.documents.map((profile) => {
        const authID = (profile as { authID?: string }).authID
        return {
          ...profile,
          // Map firstname/lastname to firstName/lastName for UI compatibility
          firstName: (profile as { firstname?: string }).firstname,
          lastName: (profile as { lastname?: string }).lastname,
          // Add email from Auth user
          email: authID ? emailMap[authID] : undefined,
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
      
      // Fetch Auth user emails via Cloud Function
      const authIDs = profiles.documents
        .map((profile) => (profile as { authID?: string }).authID)
        .filter((id): id is string => !!id)

      let emailMap: Record<string, string> = {}
      
      if (authIDs.length > 0 && appwriteConfig.functions.statisticsFunctionId) {
        try {
          const execution = await functions.createExecution({
            functionId: appwriteConfig.functions.statisticsFunctionId,
            xpath: '/get-user-emails',
            method: ExecutionMethod.POST,
            body: JSON.stringify({ authIDs }),
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (execution.status === 'completed' && execution.responseBody) {
            try {
              const response = JSON.parse(execution.responseBody)
              if (response.success && response.emails) {
                emailMap = response.emails
              }
            } catch (parseError) {
              console.warn('Failed to parse email response:', parseError)
            }
          }
        } catch (emailError) {
          console.warn('Failed to fetch user emails:', emailError)
          // Continue without emails rather than failing completely
        }
      }
      
      // Map profiles with emails and name fields
      const users = profiles.documents.map((profile) => {
        const authID = (profile as { authID?: string }).authID
        return {
          ...profile,
          // Map firstname/lastname to firstName/lastName for UI compatibility
          firstName: (profile as { firstname?: string }).firstname,
          lastName: (profile as { lastname?: string }).lastname,
          // Add email from Auth user
          email: authID ? emailMap[authID] : undefined,
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
      
      // Fetch Auth user email via Cloud Function
      const authID = (profile as { authID?: string }).authID
      let email: string | undefined

      if (authID && appwriteConfig.functions.statisticsFunctionId) {
        try {
          const execution = await functions.createExecution({
            functionId: appwriteConfig.functions.statisticsFunctionId,
            xpath: '/get-user-emails',
            method: ExecutionMethod.POST,
            body: JSON.stringify({ authIDs: [authID] }),
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (execution.status === 'completed' && execution.responseBody) {
            try {
              const response = JSON.parse(execution.responseBody)
              if (response.success && response.emails && response.emails[authID]) {
                email = response.emails[authID]
              }
            } catch (parseError) {
              console.warn('Failed to parse email response:', parseError)
            }
          }
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
      
      // Fetch Auth user emails via Cloud Function
      const authIDs = result.documents
        .map((profile) => (profile as { authID?: string }).authID)
        .filter((id): id is string => !!id)

      let emailMap: Record<string, string> = {}
      
      if (authIDs.length > 0 && appwriteConfig.functions.statisticsFunctionId) {
        try {
          const execution = await functions.createExecution({
            functionId: appwriteConfig.functions.statisticsFunctionId,
            xpath: '/get-user-emails',
            method: ExecutionMethod.POST,
            body: JSON.stringify({ authIDs }),
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (execution.status === 'completed' && execution.responseBody) {
            try {
              const response = JSON.parse(execution.responseBody)
              if (response.success && response.emails) {
                emailMap = response.emails
              }
            } catch (parseError) {
              console.warn('Failed to parse email response:', parseError)
            }
          }
        } catch (emailError) {
          console.warn('Failed to fetch user emails:', emailError)
        }
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

  update: (id: string, data: Partial<NotificationFormData>) => {
    const dbData: Record<string, unknown> = { ...data }
    
    // Handle scheduling updates
    if (data.scheduledAt && data.scheduledTime) {
      const [hours, minutes] = data.scheduledTime.split(':')
      const scheduledDate = new Date(data.scheduledAt)
      scheduledDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)
      dbData.scheduledAt = formatDateWithTimezone(scheduledDate)
      delete dbData.scheduledTime
    }

    return DatabaseService.update<NotificationDocument>(
      appwriteConfig.collections.notifications,
      id,
      dbData
    )
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
}