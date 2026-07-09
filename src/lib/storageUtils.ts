import { storage, appwriteConfig, ID } from './appwrite'

export interface UploadedImage {
  fileId: string
  fileUrl: string
}

/** Upload an image to the shared files bucket and return its id + public view URL. */
export const uploadImageToStorage = async (file: File): Promise<UploadedImage> => {
  if (!appwriteConfig.storage.bucketId) {
    throw new Error('Storage bucket ID is not configured')
  }
  const result = await storage.createFile({
    bucketId: appwriteConfig.storage.bucketId,
    fileId: ID.unique(),
    file,
  })
  const fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storage.bucketId}/files/${result.$id}/view?project=${appwriteConfig.projectId}`
  return { fileId: result.$id, fileUrl }
}

/** Best-effort delete; storage orphans must never block a save/delete flow. */
export const deleteStorageFile = async (fileId: string): Promise<void> => {
  if (!appwriteConfig.storage.bucketId || !fileId) return
  try {
    await storage.deleteFile({ bucketId: appwriteConfig.storage.bucketId, fileId })
  } catch (error) {
    console.warn('Failed to delete storage file:', fileId, error)
  }
}
