import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { appUsersService, locationsService } from '../../../lib/services'
import type { AppUser, NotificationAudience } from '../../../lib/services'
import { uploadImageToStorage, deleteStorageFile } from '../../../lib/storageUtils'
import { appTimeToUTC } from '../../../lib/dateUtils'
import { useTimezoneStore } from '../../../stores/timezoneStore'
import PreviewPopupModal from './PreviewPopupModal'

export interface PopupFormPayload {
  title: string
  description: string | null
  imageUrl: string
  imageFileId: string
  link: string | null
  startDate: string // ISO 8601 UTC (00:00 app TZ)
  endDate: string // ISO 8601 UTC (23:59 app TZ)
  only21Plus: boolean
  targetAudience: NotificationAudience
  selectedUserIds: string[]
  selectedZipCodes: string[]
  newUsersTimeRange: number | null
}

interface CreatePopupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: PopupFormPayload) => Promise<void>
}

export interface PopupFormState {
  title: string
  description: string
  link: string
  startDate: string // YYYY-MM-DD in app TZ (date input value)
  endDate: string // YYYY-MM-DD in app TZ
  only21Plus: boolean
  targetAudience: NotificationAudience
  selectedUserIds: string[]
  selectedZipCodes: string[]
  newUsersTimeRange: number | undefined
}

// eslint-disable-next-line react-refresh/only-export-components -- shared form-state constant, reused by EditPopupModal
export const initialPopupFormState: PopupFormState = {
  title: '',
  description: '',
  link: '',
  startDate: '',
  endDate: '',
  only21Plus: true,
  targetAudience: 'All',
  selectedUserIds: [],
  selectedZipCodes: [],
  newUsersTimeRange: undefined,
}

// eslint-disable-next-line react-refresh/only-export-components -- shared helper, reused by EditPopupModal
export const getPopupUserDisplayName = (user: AppUser): string => {
  const name = [user.firstname, user.lastname].filter(Boolean).join(' ')
  return name || user.username || user.email || user.$id
}

/** Validate form fields shared by create/edit. Returns an error message or null. */
// eslint-disable-next-line react-refresh/only-export-components -- shared validator, reused by EditPopupModal
export const validatePopupForm = (
  form: PopupFormState,
  hasImage: boolean
): string | null => {
  if (!hasImage) return 'Please select a banner image.'
  if (form.link.trim()) {
    try {
      const url = new URL(form.link.trim())
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return 'Link must start with http:// or https://'
      }
    } catch {
      return 'Link must be a valid URL (e.g. https://example.com)'
    }
  }
  if (!form.startDate) return 'Please select a start date.'
  if (!form.endDate) return 'Please select an end date.'
  if (form.endDate < form.startDate) return 'End date must be on or after the start date.'
  if (form.targetAudience === 'Targeted' && form.selectedUserIds.length === 0) {
    return 'Please select at least one user.'
  }
  if (form.targetAudience === 'ZipCode' && form.selectedZipCodes.length === 0) {
    return 'Please select at least one zip code.'
  }
  return null
}

/** Shared form body used by both Create and Edit modals. */
export const PopupFormFields = ({
  form,
  setForm,
  imagePreviewUrl,
  onImageSelected,
}: {
  form: PopupFormState
  setForm: React.Dispatch<React.SetStateAction<PopupFormState>>
  imagePreviewUrl: string | null
  onImageSelected: (file: File) => void
}) => {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [availableZipCodes, setAvailableZipCodes] = useState<string[]>([])
  const [isLoadingZipCodes, setIsLoadingZipCodes] = useState(false)

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        setUsers(await appUsersService.listAll())
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoadingUsers(false)
      }
    }
    if (form.targetAudience === 'Targeted' && users.length === 0) {
      void fetchUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.targetAudience])

  useEffect(() => {
    const fetchZipCodes = async () => {
      setIsLoadingZipCodes(true)
      try {
        const locations = await locationsService.list()
        const zips = Array.from(
          new Set(
            (locations.documents || [])
              .map((loc) => (loc as { zipCode?: string }).zipCode)
              .filter((z): z is string => !!z)
          )
        ).sort()
        setAvailableZipCodes(zips)
      } catch (error) {
        console.error('Error fetching zip codes:', error)
      } finally {
        setIsLoadingZipCodes(false)
      }
    }
    if (form.targetAudience === 'ZipCode' && availableZipCodes.length === 0) {
      void fetchZipCodes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.targetAudience])

  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase()
    if (!q) return users.slice(0, 50)
    return users
      .filter((u) =>
        [u.firstname, u.lastname, u.username, u.email]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
      .slice(0, 50)
  }, [users, userSearchQuery])

  const inputClass =
    'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent'

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Title (shown on the pop-up)</label>
        <input
          type="text"
          maxLength={200}
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          className={inputClass}
          placeholder="e.g. Summer IPA Launch (optional)"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description (shown on the pop-up)</label>
        <textarea
          maxLength={1000}
          rows={3}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          className={`${inputClass} resize-y`}
          placeholder="Optional supporting text under the title"
        />
      </div>

      {/* Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Banner Image *</label>
        {imagePreviewUrl && (
          <img
            src={imagePreviewUrl}
            alt="Banner preview"
            className="mb-2 max-h-48 rounded-lg border border-gray-200 object-contain"
          />
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onImageSelected(file)
          }}
          className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#1D0A74] file:px-4 file:py-2 file:text-white"
        />
      </div>

      {/* Link */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Link (optional — opens in browser when the banner is tapped)
        </label>
        <input
          type="url"
          value={form.link}
          onChange={(e) => setForm((prev) => ({ ...prev, link: e.target.value }))}
          className={inputClass}
          placeholder="https://example.com/promo"
        />
      </div>

      {/* Schedule */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
          <input
            type="date"
            value={form.endDate}
            min={form.startDate || undefined}
            onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
            className={inputClass}
          />
        </div>
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        The pop-up shows each day of this range (inclusive), once per user per day.
      </p>

      {/* 21+ gate */}
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={form.only21Plus}
          onChange={(e) => setForm((prev) => ({ ...prev, only21Plus: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 text-[#1D0A74] focus:ring-[#1D0A74]"
        />
        <span className="text-sm font-medium text-gray-700">
          21+ only (show only to age-verified users — required for alcohol ads)
        </span>
      </label>

      {/* Audience (mirrors CreateNotificationModal) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
        <div className="relative">
          <select
            value={form.targetAudience}
            onChange={(e) => {
              const audience = e.target.value as NotificationAudience
              setForm((prev) => ({
                ...prev,
                targetAudience: audience,
                selectedUserIds: [],
                selectedZipCodes: [],
                newUsersTimeRange: undefined,
              }))
            }}
            className={`${inputClass} appearance-none bg-white pr-10`}
          >
            <option value="All">All Users</option>
            <option value="NewUsers">New Users</option>
            <option value="BrandAmbassadors">Certified Brand Ambassadors (BA)</option>
            <option value="Influencers">Certified Influencers</option>
            <option value="Tier1">Tier 1 Users - NewbieSamplers</option>
            <option value="Tier2">Tier 2 Users - SampleFans</option>
            <option value="Tier3">Tier 3 Users - SuperSamplers</option>
            <option value="Tier4">Tier 4 Users - VIS</option>
            <option value="Tier5">Tier 5 Users - SampleMasters</option>
            <option value="ZipCode">All Users within specific zip code area (multi-select)</option>
            <option value="Targeted">Specific Users</option>
          </select>
          <Icon
            icon="mdi:chevron-down"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
          />
        </div>
      </div>

      {form.targetAudience === 'NewUsers' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Users Time Range (days)
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={form.newUsersTimeRange ?? ''}
            onChange={(e) => {
              const val = e.target.value
                ? Math.max(1, Math.min(365, Number(e.target.value)))
                : undefined
              setForm((prev) => ({ ...prev, newUsersTimeRange: val }))
            }}
            className={inputClass}
            placeholder="e.g. 30"
          />
          <p className="text-xs text-gray-500 mt-1">
            Show to users who signed up within the last N days (default 30).
          </p>
        </div>
      )}

      {form.targetAudience === 'ZipCode' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Zip Codes</label>
          <select
            multiple
            value={form.selectedZipCodes}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions).map((o) => o.value)
              setForm((prev) => ({ ...prev, selectedZipCodes: options }))
            }}
            className={`${inputClass} min-h-[120px]`}
          >
            {isLoadingZipCodes && <option disabled>Loading zip codes...</option>}
            {!isLoadingZipCodes &&
              availableZipCodes.map((zip) => (
                <option key={zip} value={zip}>
                  {zip}
                </option>
              ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Hold Ctrl (Windows) or Command (Mac) to select multiple zip codes.
          </p>
        </div>
      )}

      {form.targetAudience === 'Targeted' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Users</label>
          {form.selectedUserIds.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {form.selectedUserIds.map((userId) => {
                const user = users.find((u) => u.$id === userId)
                if (!user) return null
                return (
                  <div
                    key={userId}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-[#1D0A74] text-white rounded-full text-sm"
                  >
                    <span>{getPopupUserDisplayName(user)}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          selectedUserIds: prev.selectedUserIds.filter((id) => id !== userId),
                        }))
                      }
                      className="hover:bg-white/20 rounded-full p-0.5"
                    >
                      <Icon icon="mdi:close" className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          <div className="relative popup-user-dropdown-container">
            <input
              type="text"
              placeholder="Search users by name, email or username..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              onFocus={() => setShowUserDropdown(true)}
              onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
              className={inputClass}
            />
            {showUserDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {loadingUsers ? (
                  <div className="px-4 py-3 text-center text-gray-500">
                    <Icon icon="mdi:loading" className="w-5 h-5 animate-spin mx-auto" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="px-4 py-3 text-center text-gray-500">No users found</div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = form.selectedUserIds.includes(user.$id)
                    return (
                      <div
                        key={user.$id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            selectedUserIds: isSelected
                              ? prev.selectedUserIds.filter((id) => id !== user.$id)
                              : [...prev.selectedUserIds, user.$id],
                          }))
                        }
                        className={`px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {getPopupUserDisplayName(user)}
                          </div>
                          {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                        </div>
                        {isSelected && <Icon icon="mdi:check" className="w-5 h-5 text-[#1D0A74]" />}
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Selected {form.selectedUserIds.length} user(s)
          </p>
        </div>
      )}
    </div>
  )
}

/** Convert the date-input form to the persisted payload (full-day UTC window). */
// eslint-disable-next-line react-refresh/only-export-components -- shared payload builder, reused by EditPopupModal
export const buildPopupPayload = (
  form: PopupFormState,
  image: { fileId: string; fileUrl: string },
  appTimezone: string
): PopupFormPayload => ({
  title: form.title.trim(),
  description: form.description.trim() ? form.description.trim() : null,
  imageUrl: image.fileUrl,
  imageFileId: image.fileId,
  link: form.link.trim() ? form.link.trim() : null,
  startDate: appTimeToUTC(form.startDate, '00:00', appTimezone).toISOString(),
  endDate: appTimeToUTC(form.endDate, '23:59', appTimezone).toISOString(),
  only21Plus: form.only21Plus,
  targetAudience: form.targetAudience,
  selectedUserIds: form.selectedUserIds,
  selectedZipCodes: form.selectedZipCodes,
  newUsersTimeRange: form.newUsersTimeRange ?? null,
})

const CreatePopupModal = ({ isOpen, onClose, onSave }: CreatePopupModalProps) => {
  const { appTimezone } = useTimezoneStore()
  const [form, setForm] = useState<PopupFormState>(initialPopupFormState)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    if (isOpen) {
      setForm(initialPopupFormState)
      setImageFile(null)
      setImagePreviewUrl(null)
      setError(null)
    }
  }, [isOpen])

  const handleImageSelected = (file: File) => {
    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    const validationError = validatePopupForm(form, imageFile !== null)
    if (validationError) {
      setError(validationError)
      return
    }
    isSubmittingRef.current = true
    setIsSubmitting(true)
    setError(null)
    try {
      const uploaded = await uploadImageToStorage(imageFile as File)
      try {
        await onSave(buildPopupPayload(form, uploaded, appTimezone))
      } catch (saveErr) {
        // Roll back the just-uploaded image so a failed create doesn't orphan a file
        // in the shared bucket (Edit already does the mirror-image cleanup on replace).
        await deleteStorageFile(uploaded.fileId)
        throw saveErr
      }
      onClose()
    } catch (err) {
      console.error('Error saving popup:', err)
      setError('Failed to save pop-up. Please try again.')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create Pop-up</h2>
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
              {isSubmitting ? 'Saving…' : 'Create Pop-up'}
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

export default CreatePopupModal
