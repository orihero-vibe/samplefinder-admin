import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import type { PopupDocument } from '../../../lib/services'
import { uploadImageToStorage, deleteStorageFile } from '../../../lib/storageUtils'
import { useTimezoneStore } from '../../../stores/timezoneStore'
import {
  PopupFormFields,
  buildPopupPayload,
  initialPopupFormState,
  validatePopupForm,
} from './CreatePopupModal'
import type { PopupFormPayload, PopupFormState } from './CreatePopupModal'
import PreviewPopupModal from './PreviewPopupModal'

interface EditPopupModalProps {
  isOpen: boolean
  popup: PopupDocument | null
  onClose: () => void
  onSave: (id: string, data: PopupFormPayload) => Promise<void>
}

/** ISO datetime → YYYY-MM-DD date-input value in the app timezone. */
const isoToDateInput = (iso: string, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))

const EditPopupModal = ({ isOpen, popup, onClose, onSave }: EditPopupModalProps) => {
  const { appTimezone } = useTimezoneStore()
  const [form, setForm] = useState<PopupFormState>(initialPopupFormState)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    if (isOpen && popup) {
      setForm({
        title: popup.title ?? '',
        description: (popup.description as string | null | undefined) ?? '',
        link: popup.link ?? '',
        startDate: isoToDateInput(popup.startDate, appTimezone),
        endDate: isoToDateInput(popup.endDate, appTimezone),
        only21Plus: popup.only21Plus !== false,
        targetAudience: popup.targetAudience,
        selectedUserIds: popup.selectedUserIds ?? [],
        selectedZipCodes: popup.selectedZipCodes ?? [],
        newUsersTimeRange: popup.newUsersTimeRange ?? undefined,
      })
      setImageFile(null)
      setImagePreviewUrl(popup.imageUrl)
      setError(null)
    }
  }, [isOpen, popup, appTimezone])

  if (!isOpen || !popup) return null

  const handleImageSelected = (file: File) => {
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    const validationError = validatePopupForm(form, true) // an image always exists in edit
    if (validationError) {
      setError(validationError)
      return
    }
    isSubmittingRef.current = true
    setIsSubmitting(true)
    setError(null)
    try {
      const image = imageFile
        ? await uploadImageToStorage(imageFile)
        : { fileId: popup.imageFileId, fileUrl: popup.imageUrl }
      await onSave(popup.$id, buildPopupPayload(form, image, appTimezone))
      if (imageFile && popup.imageFileId && popup.imageFileId !== image.fileId) {
        await deleteStorageFile(popup.imageFileId)
      }
      onClose()
    } catch (err) {
      console.error('Error updating popup:', err)
      setError('Failed to update pop-up. Please try again.')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Pop-up</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full p-1 hover:bg-gray-100 disabled:opacity-50"
          >
            <Icon icon="mdi:close" className="h-6 w-6 text-gray-500" />
          </button>
        </div>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit}>
          <PopupFormFields
            form={form}
            setForm={setForm}
            imagePreviewUrl={imagePreviewUrl}
            onImageSelected={handleImageSelected}
          />
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="mr-auto rounded-lg border border-[#1D0A74] px-4 py-2 text-[#1D0A74] hover:bg-[#1D0A74]/5"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#1D0A74] px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
      <PreviewPopupModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={form.title}
        description={form.description}
        link={form.link}
        imageUrl={imagePreviewUrl}
      />
    </div>
  )
}

export default EditPopupModal
