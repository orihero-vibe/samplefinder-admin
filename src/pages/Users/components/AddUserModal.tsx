import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { tiersService, type TierDocument, appUsersService } from '../../../lib/services'
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges'
import { UnsavedChangesModal } from '../../../components'
import { Query } from '../../../lib/appwrite'
import { trimFormStrings } from '../../../lib/formUtils'

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
    totalPoints?: number
    dob?: string
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
    dob: '',
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
  const [passwordError, setPasswordError] = useState('')
  const [firstNameError, setFirstNameError] = useState('')
  const [lastNameError, setLastNameError] = useState('')
  const [usernameError, setUsernameError] = useState('')
  
  const hasUnsavedChanges = useUnsavedChanges(formData, initialDataRef.current, isOpen)

  // Password validation: min 8 chars, at least one letter, one number, and one uppercase
  const validatePassword = (password: string): string => {
    if (!password) return 'Password is required'
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter'
    if (!/\d/.test(password)) return 'Password must contain at least one number'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    return ''
  }

  // Name validation: only alphabets, starting with capital letter
  const validateName = (name: string, fieldName: string): string => {
    if (!name) return `${fieldName} is required`
    if (!/^[A-Z][a-zA-Z]*$/.test(name)) {
      return `${fieldName} must start with a capital letter and contain only alphabets`
    }
    return ''
  }

  // Username validation: character limit
  const validateUsername = (username: string): string => {
    const maxLength = 20
    if (!username) return 'Username is required'
    if (username.length > maxLength) {
      return `Username must not exceed ${maxLength} characters`
    }
    return ''
  }

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
    
    // Filter out non-alphabetic characters for name fields and auto-capitalize
    if (field === 'firstName' || field === 'lastName') {
      // Only allow alphabetic characters (a-z, A-Z)
      const filteredValue = value.replace(/[^a-zA-Z]/g, '')
      // Auto-capitalize first letter
      const capitalizedValue = filteredValue.charAt(0).toUpperCase() + filteredValue.slice(1).toLowerCase()
      setFormData((prev) => ({ ...prev, [field]: capitalizedValue }))
      
      if (field === 'firstName') {
        setFirstNameError(validateName(capitalizedValue, 'First Name'))
      }
      
      if (field === 'lastName') {
        if (capitalizedValue.trim()) {
          setLastNameError(validateName(capitalizedValue, 'Last Name'))
        } else {
          setLastNameError('')
        }
      }
      return
    }
    
    // Limit username to 20 characters
    if (field === 'username') {
      const maxLength = 20
      const limitedValue = value.slice(0, maxLength)
      setFormData((prev) => ({ ...prev, [field]: limitedValue }))
      setUsernameError(validateUsername(limitedValue))
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current)
        usernameCheckTimeoutRef.current = null
      }
      if (!limitedValue.trim()) {
        setUsernameValidation({ isChecking: false, isAvailable: null, message: '' })
      } else {
        usernameCheckTimeoutRef.current = setTimeout(() => {
          checkUsernameAvailability(limitedValue)
        }, 500)
      }
      return
    }
    
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (field === 'password') {
      setPasswordError(validatePassword(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmed = trimFormStrings(formData)
    
    const pwdError = validatePassword(trimmed.password)
    const fnError = validateName(trimmed.firstName, 'First Name')
    const lnError = trimmed.lastName ? validateName(trimmed.lastName, 'Last Name') : ''
    const unError = validateUsername(trimmed.username)
    
    setPasswordError(pwdError)
    setFirstNameError(fnError)
    setLastNameError(lnError)
    setUsernameError(unError)
    
    if (pwdError || fnError || lnError || unError) return

    // Prevent submission if username is required but not available
    if (trimmed.username && usernameValidation.isAvailable === false) {
      return
    }
    
    setIsSubmitting(true)
    try {
      const selectedTier = tiers.find((t) => t.name === trimmed.tierLevel)
      const totalPoints = selectedTier?.requiredPoints ?? 100
      await onSave({ ...trimmed, totalPoints })
      // Close unsaved changes modal if it's open
      setShowUnsavedChangesModal(false)
      // Reset form and validation state
      setFormData(initialFormData)
      setShowPassword(false)
      setPasswordError('')
      setFirstNameError('')
      setLastNameError('')
      setUsernameError('')
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
      setPasswordError('')
      setFirstNameError('')
      setLastNameError('')
      setUsernameError('')
      setUsernameValidation({
        isChecking: false,
        isAvailable: null,
        message: ''
      })
      onClose()
    }
  }

  const handleDiscardChanges = () => {
    setShowUnsavedChangesModal(false)
    setFormData(initialFormData)
    setShowPassword(false)
    setPasswordError('')
    setFirstNameError('')
    setLastNameError('')
    setUsernameError('')
    setUsernameValidation({
      isChecking: false,
      isAvailable: null,
      message: ''
    })
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
                  placeholder="Enter Password (min 8 chars with letter, number, uppercase)"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent ${
                    passwordError ? 'border-red-500' : 'border-gray-300'
                  }`}
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
              {passwordError && (
                <p className="mt-1 text-xs text-red-500">{passwordError}</p>
              )}
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter First Name"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent ${
                  firstNameError ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {firstNameError && (
                <p className="mt-1 text-xs text-red-500">{firstNameError}</p>
              )}
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
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent ${
                  lastNameError ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {lastNameError && (
                <p className="mt-1 text-xs text-red-500">{lastNameError}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => handleInputChange('dob', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                <span>
                  Username <span className="text-red-500">*</span>
                </span>
                <span className="text-xs text-gray-500 font-normal">
                  {formData.username.length}/20 characters
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter Username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  maxLength={20}
                  required
                  className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent ${
                    formData.username.trim()
                      ? usernameValidation.isAvailable === false
                        ? 'border-red-500'
                        : usernameValidation.isAvailable === true
                        ? 'border-green-500'
                        : 'border-gray-300'
                      : 'border-gray-300'
                  }`}
                />
                {formData.username.trim() && usernameValidation.isChecking && (
                  <Icon
                    icon="mdi:loading"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin"
                  />
                )}
                {formData.username.trim() && !usernameValidation.isChecking && usernameValidation.isAvailable === true && (
                  <Icon
                    icon="mdi:check-circle"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500"
                  />
                )}
                {formData.username.trim() && !usernameValidation.isChecking && usernameValidation.isAvailable === false && (
                  <Icon
                    icon="mdi:close-circle"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500"
                  />
                )}
              </div>
              {usernameError && (
                <p className="mt-1 text-xs text-red-500">{usernameError}</p>
              )}
              {!usernameError && formData.username.trim() && usernameValidation.message && (
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
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="Enter Phone Number"
                value={formData.phoneNumber}
                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                required
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
              disabled={
                isSubmitting ||
                !!passwordError ||
                !!firstNameError ||
                !!lastNameError ||
                !!usernameError ||
                (!!formData.username.trim() && usernameValidation.isAvailable === false)
              }
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

