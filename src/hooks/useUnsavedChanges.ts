import { useEffect, useRef, useState } from 'react'

/**
 * Hook to detect unsaved changes in a form
 * @param formData - Current form data
 * @param initialData - Initial form data to compare against
 * @param isOpen - Whether the modal/form is open
 * @returns hasUnsavedChanges - Whether there are unsaved changes
 */
export const useUnsavedChanges = <T extends Record<string, unknown>>(
  formData: T,
  initialData: T,
  isOpen: boolean
): boolean => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const initialDataRef = useRef<T>(initialData)

  // Update initial data reference when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      initialDataRef.current = initialData
      setHasUnsavedChanges(false)
    }
  }, [isOpen, initialData])

  // Check for changes whenever formData changes
  useEffect(() => {
    if (!isOpen) {
      setHasUnsavedChanges(false)
      return
    }

    const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialDataRef.current)
    setHasUnsavedChanges(hasChanges)
  }, [formData, isOpen])

  return hasUnsavedChanges
}
