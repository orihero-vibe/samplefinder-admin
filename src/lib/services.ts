import { databases, appwriteConfig, ID, Query, functions, ExecutionMethod } from './appwrite'
import type { Models } from 'appwrite'

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
  [key: string]: any
}

// User Profiles service
export const userProfilesService = {
  create: (data: any) =>
    DatabaseService.create<UserProfile>(appwriteConfig.collections.userProfiles, data),
  getById: (id: string) =>
    DatabaseService.getById<UserProfile>(appwriteConfig.collections.userProfiles, id),
  list: (queries?: string[]) =>
    DatabaseService.list<UserProfile>(appwriteConfig.collections.userProfiles, queries),
  update: (id: string, data: any) =>
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
  [key: string]: any
}

// Client interface (for UI)
export interface Client extends ClientDocument {
  // Additional UI-specific fields can be added here
}

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
    const dbData: any = {
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
    const dbData: any = {
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
  [key: string]: any
}

// Events service
export const eventsService = {
  create: (data: any) =>
    DatabaseService.create<EventDocument>(appwriteConfig.collections.events, data),
  getById: (id: string) =>
    DatabaseService.getById<EventDocument>(appwriteConfig.collections.events, id),
  list: (queries?: string[]) =>
    DatabaseService.list<EventDocument>(appwriteConfig.collections.events, queries),
  update: (id: string, data: any) =>
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
  [key: string]: any
}

// Categories service
export const categoriesService = {
  create: (data: { title: string }) =>
    DatabaseService.create<CategoryDocument>(appwriteConfig.collections.categories || 'categories', data),
  getById: (id: string) =>
    DatabaseService.getById<CategoryDocument>(appwriteConfig.collections.categories || 'categories', id),
  list: (queries?: string[]) =>
    DatabaseService.list<CategoryDocument>(appwriteConfig.collections.categories || 'categories', queries),
  update: (id: string, data: { title: string }) =>
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
  [key: string]: any
}

// Trivia Response Document interface
export interface TriviaResponseDocument extends Models.Document {
  trivia?: string // Relationship to trivia table (trivia ID)
  answer?: string // Answer text
  answerIndex: number // Index of the answer selected (0-10000)
  user?: string // Relationship to user_profiles table (user ID)
  [key: string]: any
}

// Trivia Responses service
export const triviaResponsesService = {
  create: (data: any) =>
    DatabaseService.create<TriviaResponseDocument>(appwriteConfig.collections.triviaResponses, data),
  getById: (id: string) =>
    DatabaseService.getById<TriviaResponseDocument>(appwriteConfig.collections.triviaResponses, id),
  list: (queries?: string[]) =>
    DatabaseService.list<TriviaResponseDocument>(appwriteConfig.collections.triviaResponses, queries),
  update: (id: string, data: any) =>
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
  create: (data: any) =>
    DatabaseService.create<TriviaDocument>(appwriteConfig.collections.trivia, data),
  getById: (id: string) =>
    DatabaseService.getById<TriviaDocument>(appwriteConfig.collections.trivia, id),
  list: (queries?: string[]) =>
    DatabaseService.list<TriviaDocument>(appwriteConfig.collections.trivia, queries),
  update: (id: string, data: any) =>
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
      
      // Fetch Auth user data for each profile
      // Note: This requires server-side access or batch fetching
      // For now, we'll return profiles with available data
      // You may need to implement a Cloud Function to get Auth user data
      return profiles.documents.map((profile) => ({
        ...profile,
        // Auth user data would be fetched separately or via Cloud Function
      })) as AppUser[]
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
      
      // Fetch Auth user data
      // Note: This requires server-side access or Cloud Function
      return profile as AppUser
    } catch (error) {
      console.error('Error getting user:', error)
      return null
    }
  },

  // Delete user (Auth + user_profiles)
  delete: async (id: string, _authID: string): Promise<void> => {
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
      return result.documents
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
      let response: any = {}
      if (execution.responseBody) {
        try {
          response = JSON.parse(execution.responseBody)
        } catch (parseError) {
          throw new Error(`Invalid JSON response from function: ${execution.responseBody}`)
        }
      }

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch statistics')
      }

      return response.statistics as T
    } catch (error) {
      console.error(`Error fetching statistics for ${page}:`, error)
      throw error
    }
  },
}
