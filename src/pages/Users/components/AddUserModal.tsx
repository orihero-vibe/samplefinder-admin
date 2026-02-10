import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { tiersService, type TierDocument, appUsersService } from '../../../lib/services'
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges'
import { UnsavedChangesModal } from '../../../components'
import { Query } from '../../../lib/appwrite'

interface AddUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    username: string
    phoneNumber: string
    role: string
    tierLevel?: string
  }) => void
}

const AddUserModal = ({ isOpen, onClose, onSave }: AddUserModalProps) => {
  const initialFormData = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    username: '',
    phoneNumber: '',
    role: 'user', // Default role
    tierLevel: '',
  }
  
  const [formData, setFormData] = useState(initialFormData)
  const initialDataRef = useRef(initialFormData)

  const [showPassword, setShowPassword] = useState(false)
  const [tiers, setTiers] = useState<TierDocument[]>([])
  const [isLoadingTiers, setIsLoadingTiers] = useState(false)
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [usernameValidation, setUsernameValidation] = useState<{
    isChecking: boolean
    isAvailable: boolean | null
    message: string
  }>({
    isChecking: false,
    isAvailable: null,
    message: ''
  })
  const usernameCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const hasUnsavedChanges = useUnsavedChanges(formData, initialDataRef.current, isOpen)

  // Fetch tiers when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchTiers = async () => {
        setIsLoadingTiers(true)
        try {
          const tiersList = await tiersService.list()
          setTiers(tiersList)
          // Set default tier to the lowest tier (first in sorted list)
          if (tiersList.length > 0) {
            const newInitialData = { ...initialFormData, tierLevel: tiersList[0].name }
            setFormData(newInitialData)
            initialDataRef.current = newInitialData
          }
        } catch (error) {
          console.error('Error fetching tiers:', error)
        } finally {
          setIsLoadingTiers(false)
        }
      }
      fetchTiers()
    }
  }, [isOpen])

  // Check username availability with debounce
  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim()) {
      setUsernameValidation({
        isChecking: false,
        isAvailable: null,
        message: ''
      })
      return
    }

    setUsernameValidation({
      isChecking: true,
      isAvailable: null,
      message: 'Checking availability...'
    })

    try {
      const result = await appUsersService.listWithPagination([
        Query.equal('username', username.trim())
      ])

      if (result.users.length > 0) {
        setUsernameValidation({
          isChecking: false,
          isAvailable: false,
          message: 'Username already exists'
        })
      } else {
        setUsernameValidation({
          isChecking: false,
          isAvailable: true,
          message: 'Username is available'
        })
      }
    } catch (error) {
      console.error('Error checking username:', error)
      setUsernameValidation({
        isChecking: false,
        isAvailable: null,
        message: ''
      })
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current)
      }
    }
  }, [])

  if (!isOpen) return null

  // Format phone number to (XXX) XXX-XXXX
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '')
    
    // Limit to 10 digits
    const limitedNumber = phoneNumber.slice(0, 10)
    
    // Format based on length
    if (limitedNumber.length <= 3) {
      return limitedNumber
    } else if (limitedNumber.length <= 6) {
      return `(${limitedNumber.slice(0, 3)}) ${limitedNumber.slice(3)}`
    } else {
      return `(${limitedNumber.slice(0, 3)}) ${limitedNumber.slice(3, 6)}-${limitedNumber.slice(6)}`
    }
  }

  const handleInputChange = (field: string, value: string) => {
    // Format phone number automatically
    if (field === 'phoneNumber') {
      const formatted = formatPhoneNumber(value)
      setFormData((prev) => ({ ...prev, [field]: formatted }))
      return
    }
    
    setFormData((prev) => ({ ...prev, [field]: value }))
    
    // Real-time username validation with debounce
    if (field === 'username') {
      // Clear existing timeout
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current)
      }
      
      // Set new timeout
      usernameCheckTimeoutRef.current = setTimeout(() => {
        checkUsernameAvailability(value)
      }, 500) // 500ms debounce
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent submission if username is not available
    if (formData.username && usernameValidation.isAvailable === false) {
      return
    }
    
    setIsSubmitting(true)
    try {
      await onSave(formData)
      // Close unsaved changes modal if it's open
      setShowUnsavedChangesModal(false)
      // Reset form and validation state
      setFormData(initialFormData)
      setShowPassword(false)
      setUsernameValidation({
        isChecking: false,
        isAvailable: null,
        message: ''
      })
      onClose()
    } catch (error) {
      // Error handled by parent
      console.error('Error saving user:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges && !isSubmitting) {
      setShowUnsavedChangesModal(true)
    } else {
      // Reset form on close
      setFormData(initialFormData)
      setShowPassword(false)
      onClose()
    }
  }

  const handleDiscardChanges = () => {
    setShowUnsavedChangesModal(false)
    setFormData(initialFormData)
    setShowPassword(false)
    setUsernameValidation({
      isChecking: false,
      isAvailable: null,
      message: ''
    })
    onClose()
  }

  const handleSaveFromUnsavedModal = async () => {
    // Trigger form submission via ref
    const form = document.querySelector('form[data-user-form]') as HTMLFormElement
    if (form) {
      form.requestSubmit()
    }
  }

  return (
    <>
      <UnsavedChangesModal
        isOpen={showUnsavedChangesModal}
        onClose={() => setShowUnsavedChangesModal(false)}
        onDiscard={handleDiscardChanges}
        onSave={handleSaveFromUnsavedModal}
        isSaving={isSubmitting}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={isSubmitting ? undefined : handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add User</h2>
              <p className="text-sm text-gray-600 mt-1">
                Add a new user to the system.
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
          <form onSubmit={handleSubmit} data-user-form className="p-6">
          {/* Form Fields */}
          <div className="space-y-4 mb-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                placeholder="Enter Email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Icon
                    icon={showPassword ? 'mdi:eye-off' : 'mdi:eye'}
                    className="w-5 h-5"
                  />
                </button>
              </div>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                placeholder="Enter First Name"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                placeholder="Enter Last Name"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter Username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent ${
                    usernameValidation.isAvailable === false
                      ? 'border-red-500'
                      : usernameValidation.isAvailable === true
                      ? 'border-green-500'
                      : 'border-gray-300'
                  }`}
                />
                {usernameValidation.isChecking && (
                  <Icon
                    icon="mdi:loading"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin"
                  />
                )}
                {!usernameValidation.isChecking && usernameValidation.isAvailable === true && (
                  <Icon
                    icon="mdi:check-circle"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500"
                  />
                )}
                {!usernameValidation.isChecking && usernameValidation.isAvailable === false && (
                  <Icon
                    icon="mdi:close-circle"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500"
                  />
                )}
              </div>
              {usernameValidation.message && (
                <p
                  className={`mt-1 text-xs ${
                    usernameValidation.isAvailable === false
                      ? 'text-red-500'
                      : usernameValidation.isAvailable === true
                      ? 'text-green-500'
                      : 'text-gray-500'
                  }`}
                >
                  {usernameValidation.message}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="Enter Phone Number"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent appearance-none bg-white pr-10"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Tier Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tier Level <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.tierLevel}
                  onChange={(e) => handleInputChange('tierLevel', e.target.value)}
                  required
                  disabled={isLoadingTiers}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent appearance-none bg-white pr-10 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {isLoadingTiers ? (
                    <option value="">Loading tiers...</option>
                  ) : tiers.length === 0 ? (
                    <option value="">No tiers available</option>
                  ) : (
                    <>
                      <option value="">Select a tier</option>
                      {tiers.map((tier) => (
                        <option key={tier.$id} value={tier.name}>
                          {tier.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <Icon
                  icon="mdi:chevron-down"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting || (!!formData.username && usernameValidation.isAvailable === false)}
            >
              {isSubmitting && <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />}
              {isSubmitting ? 'Adding User...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

export default AddUserModal

