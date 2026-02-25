import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import LocationPicker from '../../../components/LocationPicker'
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges'
import { useNotificationStore } from '../../../stores/notificationStore'
import { UnsavedChangesModal } from '../../../components'
import { trimFormStrings } from '../../../lib/formUtils'

interface EditLocationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (locationData: {
    name: string
    address: string
    city: string
    state: string
    zipCode: string
    latitude: string
    longitude: string
  }) => Promise<void>
  initialData?: {
    name: string
    address: string
    city: string
    state: string
    zipCode: string
    latitude: string
    longitude: string
  }
}

const EditLocationModal = ({ isOpen, onClose, onSave, initialData }: EditLocationModalProps) => {
  const { addNotification } = useNotificationStore()
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: '',
    longitude: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)
  const initialDataRef = useRef(formData)

  const hasUnsavedChanges = useUnsavedChanges(formData, initialDataRef.current, isOpen)

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (isOpen && initialData) {
      const initialFormData = {
        name: initialData.name || '',
        address: initialData.address || '',
        city: initialData.city || '',
        state: initialData.state || '',
        zipCode: initialData.zipCode || '',
        latitude: initialData.latitude || '',
        longitude: initialData.longitude || '',
      }
      setFormData(initialFormData)
      initialDataRef.current = initialFormData
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Prevent double submission
    if (isSubmitting) {
      return
    }

    const trimmed = trimFormStrings(formData)

    if (!trimmed.name) {
      addNotification({
        type: 'error',
        title: 'Location Name Required',
        message: 'Please enter a location name.',
      })
      return
    }

    // Set loading state immediately for instant UI feedback
    setIsSubmitting(true)

    try {
      await onSave({
        name: trimmed.name,
        address: trimmed.address,
        city: trimmed.city,
        state: trimmed.state,
        zipCode: trimmed.zipCode,
        latitude: trimmed.latitude,
        longitude: trimmed.longitude,
      })
      
      // Success - close modal
      setShowUnsavedChangesModal(false)
      onClose()
    } catch {
      // Error - keep modal open, error notification is handled by parent
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges && !isSubmitting) {
      setShowUnsavedChangesModal(true)
    } else {
      onClose()
    }
  }

  const handleDiscardChanges = () => {
    setShowUnsavedChangesModal(false)
    onClose()
  }

  return (
    <>
      <UnsavedChangesModal
        isOpen={showUnsavedChangesModal}
        onClose={() => setShowUnsavedChangesModal(false)}
        onDiscard={handleDiscardChanges}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={isSubmitting ? undefined : handleClose}
        />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Location</h2>
            <p className="text-sm text-gray-600 mt-1">
              Update location details below.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} data-location-form className="p-6">
          {/* Location Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter Location Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
            />
          </div>

          {/* Location Picker */}
          <div className="mb-6">
            <LocationPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onLocationChange={(lat, lng) => {
                handleInputChange('latitude', lat)
                handleInputChange('longitude', lng)
              }}
              onAddressFromCoords={(components) => {
                handleInputChange('address', components.address)
                handleInputChange('city', components.city)
                handleInputChange('state', components.state)
                handleInputChange('zipCode', components.zipCode)
              }}
              address={formData.address}
              city={formData.city}
              state={formData.state}
              zipCode={formData.zipCode}
              onAddressChange={(address) => handleInputChange('address', address)}
              onCityChange={(city) => handleInputChange('city', city)}
              onStateChange={(state) => handleInputChange('state', state)}
              onZipCodeChange={(zipCode) => handleInputChange('zipCode', zipCode)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !formData.name ||
                !formData.address ||
                !formData.city ||
                !formData.state ||
                !formData.zipCode
              }
              className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating location...' : 'Update Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

export default EditLocationModal
