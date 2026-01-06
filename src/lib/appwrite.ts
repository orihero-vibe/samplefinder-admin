import { Client, Account, Databases, Storage, Functions, Query, ID, ExecutionMethod } from 'appwrite'

// Appwrite configuration
// Note: In Vite, use import.meta.env instead of process.env
// Environment variables must be prefixed with VITE_ to be exposed to the client
export const appwriteConfig = {
  endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1',
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID || '',
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID || '69217af50038b9005a61', // Tables DB ID
  collections: {
    userProfiles: import.meta.env.VITE_APPWRITE_COLLECTION_USER_PROFILES || 'user_profiles',
    clients: import.meta.env.VITE_APPWRITE_COLLECTION_CLIENTS || 'clients', // Table ID
    events: import.meta.env.VITE_APPWRITE_COLLECTION_EVENTS || 'events', // Table ID
    trivia: import.meta.env.VITE_APPWRITE_COLLECTION_TRIVIA || 'trivia', // Table ID
    triviaResponses: import.meta.env.VITE_APPWRITE_COLLECTION_TRIVIA_RESPONSES || 'trivia_responses', // Table ID
    reviews: import.meta.env.VITE_APPWRITE_COLLECTION_REVIEWS || 'reviews', // Table ID
    reports: import.meta.env.VITE_APPWRITE_COLLECTION_REPORTS || '',
    notifications: import.meta.env.VITE_APPWRITE_COLLECTION_NOTIFICATIONS || 'notifications', // Table ID
    categories: import.meta.env.VITE_APPWRITE_COLLECTION_CATEGORIES || 'categories', // Table ID
  },
  storage: {
    bucketId: import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID || '',
  },
  functions: {
    statisticsFunctionId: import.meta.env.VITE_APPWRITE_STATISTICS_FUNCTION_ID || '',
    notificationFunctionId: import.meta.env.VITE_APPWRITE_NOTIFICATION_FUNCTION_ID || '',
  },
}

// Initialize Appwrite client
// Note: Appwrite SDK v21+ automatically handles cookies for authentication
// The client must be configured with the correct endpoint and project ID
export const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)

// Initialize Appwrite services
export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)
export const functions = new Functions(client)

// Helper function to check if Appwrite is configured
export const isAppwriteConfigured = () => {
  return !!(
    appwriteConfig.endpoint &&
    appwriteConfig.projectId &&
    appwriteConfig.databaseId
  )
}

// Export Query and ExecutionMethod for use in services
export { Query, ID, ExecutionMethod }

