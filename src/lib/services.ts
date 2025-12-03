import { databases, appwriteConfig, ID, Query, storage } from './appwrite'
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
  // Find user profile by authID
  findByAuthID: async (authID: string): Promise<UserProfile | null> => {
    try {
      const result = await DatabaseService.list<UserProfile>(
        appwriteConfig.collections.userProfiles,
        [Query.equal('authID', authID), Query.limit(1)]
      )
      return result.documents.length > 0 ? result.documents[0] : null
    } catch (error) {
      console.error('Error finding user profile by authID:', error)
      return null
    }
  },
}

// Client interface matching Appwrite Tables schema
export interface ClientDocument extends Models.Document {
  name: string
  logoURL?: string
  productType?: string[]
  city?: string
  address?: string
  state?: string
  zip?: string
  location?: [number, number] // Point type: [longitude, latitude]
}

// Client interface for UI with calculated fields
export interface Client extends ClientDocument {
  // Calculated fields (not in DB, will be computed)
  totalEvents?: number
  numberOfFavorites?: number
  numberOfCheckIns?: number
  totalPoints?: number
  // Map createdAt to joinDate for UI
  joinDate?: string // Maps from createdAt
}

// Upload file to Appwrite Storage
export const uploadFile = async (file: File): Promise<string | null> => {
  try {
    if (!appwriteConfig.storage.bucketId) {
      throw new Error('Storage bucket ID is not configured')
    }

    const fileId = ID.unique()
    const result = await storage.createFile(
      appwriteConfig.storage.bucketId,
      fileId,
      file
    )

    // Get file preview URL
    const fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storage.bucketId}/files/${result.$id}/view?project=${appwriteConfig.projectId}`
    return fileUrl
  } catch (error) {
    console.error('Error uploading file:', error)
    throw error
  }
}

// Client data for UI (maps between UI and DB fields)
export interface ClientFormData {
  logo: File | null
  clientName: string
  productTypes: string[]
  city?: string
  address?: string
  state?: string
  zip?: string
  location?: [number, number] // Point format: [longitude, latitude]
}

// Specific service functions for Clients table
export const clientsService = {
  // Create a new client
  create: async (formData: ClientFormData): Promise<ClientDocument> => {
    // Upload logo if provided
    let logoURL: string | undefined = undefined
    if (formData.logo) {
      logoURL = (await uploadFile(formData.logo)) || undefined
    }

    // Map UI fields to DB fields
    const dbData: Omit<ClientDocument, keyof Models.Document> = {
      name: formData.clientName,
      logoURL,
      productType: formData.productTypes.length > 0 ? formData.productTypes : undefined,
      city: formData.city || undefined,
      address: formData.address || undefined,
      state: formData.state || undefined,
      zip: formData.zip || undefined,
      location: formData.location,
    }

    return await DatabaseService.create<ClientDocument>(
      appwriteConfig.collections.clients,
      dbData
    )
  },

  // Get client by ID
  getById: (id: string): Promise<ClientDocument> => {
    return DatabaseService.getById<ClientDocument>(
      appwriteConfig.collections.clients,
      id
    )
  },

  // List all clients (returns ClientDocuments, need to transform for UI)
  list: (queries?: string[]): Promise<Models.DocumentList<ClientDocument>> => {
    return DatabaseService.list<ClientDocument>(
      appwriteConfig.collections.clients,
      queries
    )
  },

  // Transform ClientDocument to Client for UI (maps createdAt to joinDate, adds calculated fields)
  transformToUI: (doc: ClientDocument, calculated?: {
    totalEvents?: number
    numberOfFavorites?: number
    numberOfCheckIns?: number
    totalPoints?: number
  }): Client => {
    return {
      ...doc,
      joinDate: doc.$createdAt ? new Date(doc.$createdAt).toLocaleDateString() : undefined,
      totalEvents: calculated?.totalEvents ?? 0,
      numberOfFavorites: calculated?.numberOfFavorites ?? 0,
      numberOfCheckIns: calculated?.numberOfCheckIns ?? 0,
      totalPoints: calculated?.totalPoints ?? 0,
    }
  },

  // Update client
  update: async (
    id: string,
    formData: Partial<ClientFormData>,
    existingClient?: ClientDocument
  ): Promise<ClientDocument> => {
    // Upload new logo if provided
    let logoURL: string | undefined = undefined
    if (formData.logo) {
      logoURL = (await uploadFile(formData.logo)) || undefined
    } else if (existingClient?.logoURL) {
      // Keep existing logo if no new logo provided
      logoURL = existingClient.logoURL
    }

    // Use provided location or keep existing
    const location = formData.location !== undefined 
      ? formData.location 
      : existingClient?.location

    // Map UI fields to DB fields
    const dbData: Partial<Omit<ClientDocument, keyof Models.Document>> = {
      ...(formData.clientName !== undefined && { name: formData.clientName }),
      ...(logoURL !== undefined && { logoURL }),
      ...(formData.productTypes !== undefined && {
        productType: formData.productTypes.length > 0 ? formData.productTypes : undefined,
      }),
      ...(formData.city !== undefined && { city: formData.city || undefined }),
      ...(formData.address !== undefined && { address: formData.address || undefined }),
      ...(formData.state !== undefined && { state: formData.state || undefined }),
      ...(formData.zip !== undefined && { zip: formData.zip || undefined }),
      ...(location !== undefined && { location }),
    }

    return await DatabaseService.update<ClientDocument>(
      appwriteConfig.collections.clients,
      id,
      dbData
    )
  },

  // Delete client
  delete: (id: string): Promise<void> => {
    return DatabaseService.delete(appwriteConfig.collections.clients, id)
  },

  // Search clients by name
  search: (searchTerm: string, queries?: string[]): Promise<Models.DocumentList<ClientDocument>> => {
    return DatabaseService.search<ClientDocument>(
      appwriteConfig.collections.clients,
      searchTerm,
      ['name'], // Search in 'name' field (DB field)
      queries
    )
  },

  // Find client by name
  findByName: async (name: string): Promise<ClientDocument | null> => {
    try {
      const result = await DatabaseService.list<ClientDocument>(
        appwriteConfig.collections.clients,
        [Query.equal('name', name), Query.limit(1)]
      )
      return result.documents.length > 0 ? result.documents[0] : null
    } catch (error) {
      console.error('Error finding client by name:', error)
      return null
    }
  },
}

export const eventsService = {
  create: (data: any) =>
    DatabaseService.create(appwriteConfig.collections.events, data),
  getById: (id: string) =>
    DatabaseService.getById(appwriteConfig.collections.events, id),
  list: (queries?: string[]) =>
    DatabaseService.list(appwriteConfig.collections.events, queries),
  update: (id: string, data: any) =>
    DatabaseService.update(appwriteConfig.collections.events, id, data),
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.events, id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search(
      appwriteConfig.collections.events,
      searchTerm,
      ['name', 'description', 'location'],
      queries
    ),
}

// Category interface matching Appwrite Tables schema
export interface CategoryDocument extends Models.Document {
  title: string
}

// Categories service - using 'categories' table ID from Appwrite Tables
export const categoriesService = {
  // Create a new category
  create: (data: { title: string }): Promise<CategoryDocument> => {
    return DatabaseService.create<CategoryDocument>('categories', data)
  },

  // Get category by ID
  getById: (id: string): Promise<CategoryDocument> => {
    return DatabaseService.getById<CategoryDocument>('categories', id)
  },

  // List all categories
  list: (queries?: string[]): Promise<Models.DocumentList<CategoryDocument>> => {
    return DatabaseService.list<CategoryDocument>('categories', queries)
  },

  // Update category
  update: (id: string, data: { title: string }): Promise<CategoryDocument> => {
    return DatabaseService.update<CategoryDocument>('categories', id, data)
  },

  // Delete category
  delete: (id: string): Promise<void> => {
    return DatabaseService.delete('categories', id)
  },

  // Search categories by title
  search: (searchTerm: string, queries?: string[]): Promise<Models.DocumentList<CategoryDocument>> => {
    return DatabaseService.search<CategoryDocument>(
      'categories',
      searchTerm,
      ['title'],
      queries
    )
  },

  // Find category by title
  findByTitle: async (title: string): Promise<CategoryDocument | null> => {
    try {
      const result = await DatabaseService.list<CategoryDocument>('categories', [
        Query.equal('title', title),
        Query.limit(1),
      ])
      return result.documents.length > 0 ? result.documents[0] : null
    } catch (error) {
      console.error('Error finding category by title:', error)
      return null
    }
  },
}

export const triviaService = {
  create: (data: any) =>
    DatabaseService.create(appwriteConfig.collections.trivia, data),
  getById: (id: string) =>
    DatabaseService.getById(appwriteConfig.collections.trivia, id),
  list: (queries?: string[]) =>
    DatabaseService.list(appwriteConfig.collections.trivia, queries),
  update: (id: string, data: any) =>
    DatabaseService.update(appwriteConfig.collections.trivia, id, data),
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.trivia, id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search(
      appwriteConfig.collections.trivia,
      searchTerm,
      ['question'], // Only search in question field (client is a relationship, not searchable directly)
      queries
    ),
}

export const reviewsService = {
  create: (data: any) =>
    DatabaseService.create(appwriteConfig.collections.reviews, data),
  getById: (id: string) =>
    DatabaseService.getById(appwriteConfig.collections.reviews, id),
  list: (queries?: string[]) =>
    DatabaseService.list(appwriteConfig.collections.reviews, queries),
  update: (id: string, data: any) =>
    DatabaseService.update(appwriteConfig.collections.reviews, id, data),
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.reviews, id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search(
      appwriteConfig.collections.reviews,
      searchTerm,
      ['comment', 'userName'],
      queries
    ),
}

export const reportsService = {
  create: (data: any) =>
    DatabaseService.create(appwriteConfig.collections.reports, data),
  getById: (id: string) =>
    DatabaseService.getById(appwriteConfig.collections.reports, id),
  list: (queries?: string[]) =>
    DatabaseService.list(appwriteConfig.collections.reports, queries),
  update: (id: string, data: any) =>
    DatabaseService.update(appwriteConfig.collections.reports, id, data),
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.reports, id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search(
      appwriteConfig.collections.reports,
      searchTerm,
      ['title', 'description'],
      queries
    ),
}

export const notificationsService = {
  create: (data: any) =>
    DatabaseService.create(appwriteConfig.collections.notifications, data),
  getById: (id: string) =>
    DatabaseService.getById(appwriteConfig.collections.notifications, id),
  list: (queries?: string[]) =>
    DatabaseService.list(appwriteConfig.collections.notifications, queries),
  update: (id: string, data: any) =>
    DatabaseService.update(appwriteConfig.collections.notifications, id, data),
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.notifications, id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search(
      appwriteConfig.collections.notifications,
      searchTerm,
      ['title', 'message'],
      queries
    ),
}

// User interface for UI display
export interface AppUser extends UserProfile {
  // Additional fields from Auth user
  email?: string
  name?: string
  // UI display fields
  firstName?: string
  lastName?: string
  username?: string
  phoneNumber?: string
}

// User form data for creation
export interface UserFormData {
  email: string
  password: string
  firstName?: string
  lastName?: string
  username?: string
  phoneNumber?: string
  role: string
}

// Users service - handles creating Auth users and user_profiles
export const appUsersService = {
  // Create a new user (Auth + user_profiles)
  // Note: Creating users as admin requires server-side execution
  // This implementation uses account.create which may work if admin has permissions
  // For production, consider using a Cloud Function with server SDK
  create: async (userData: UserFormData): Promise<AppUser> => {
    const { account, ID } = await import('./appwrite')
    
    try {
      // Step 1: Create user in Auth
      const name = userData.firstName && userData.lastName 
        ? `${userData.firstName} ${userData.lastName}` 
        : userData.username || userData.email
      
      const authUser = await account.create({
        userId: ID.unique(),
        email: userData.email,
        password: userData.password,
        name: name,
      })

      // Step 2: Create user_profiles entry with authID
      const userProfile = await userProfilesService.create({
        authID: authUser.$id,
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        phoneNumber: userData.phoneNumber,
      })

      // Return combined user data
      return {
        ...userProfile,
        email: authUser.email,
        name: authUser.name,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        phoneNumber: userData.phoneNumber,
      }
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
  // This uses Query.search which works if fields are indexed for full-text search
  search: async (searchTerm: string, queries?: string[]): Promise<AppUser[]> => {
    try {
      // Use DatabaseService.search which handles search queries properly
      const result = await DatabaseService.search<AppUser>(
        appwriteConfig.collections.userProfiles,
        searchTerm,
        ['firstName', 'lastName', 'username', 'email'],
        queries
      )
      return result.documents
    } catch (error) {
      console.error('Error searching users:', error)
      throw error
    }
  },
}

