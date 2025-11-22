import { databases, appwriteConfig, ID, Query } from './appwrite'
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
      data
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
      data
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

// Specific service functions for your collections
export const clientsService = {
  create: (data: any) =>
    DatabaseService.create(appwriteConfig.collections.clients, data),
  getById: (id: string) =>
    DatabaseService.getById(appwriteConfig.collections.clients, id),
  list: (queries?: string[]) =>
    DatabaseService.list(appwriteConfig.collections.clients, queries),
  update: (id: string, data: any) =>
    DatabaseService.update(appwriteConfig.collections.clients, id, data),
  delete: (id: string) =>
    DatabaseService.delete(appwriteConfig.collections.clients, id),
  search: (searchTerm: string, queries?: string[]) =>
    DatabaseService.search(
      appwriteConfig.collections.clients,
      searchTerm,
      ['clientName', 'brandName', 'email'],
      queries
    ),
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
      ['question', 'brandName'],
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

