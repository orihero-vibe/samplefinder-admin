import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { tiersService, type TierDocument, appUsersService } from '../../../lib/services'
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges'
import { UnsavedChangesModal } from '../../../components'
import { Query } from '../../../lib/appwrite'
import { trimFormStrings } from '../../../lib/formUtils'

interface UserData {
  image?: string | File | null
  firstName?: string
  lastName?: string
  zipCode?: string
  phoneNumber?: string
  userPoints?: string
  baBadge?: string
  signUpDate?: string
  password?: string
  checkIns?: string
  tierLevel?: string
  username?: string
  email?: string
  checkInReviewPoints?: string
  influencerBadge?: string
  lastLogin?: string
  referralCode?: string
  reviews?: string
  triviasWon?: string
  isBlocked?: boolean
  dob?: string
}

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (userData: UserData) => void
  onAddToBlacklist?: () => void
  onDelete?: () => void
  initialData?: UserData
  userId?: string
}

const EditUserModal = ({
  isOpen,
  onClose,
  onSave,
  onAddToBlacklist,
  onDelete,
  initialData,
  userId,
}: EditUserModalProps) => {
  const [formData, setFormData] = useState<UserData>({
    image: null,
    firstName: '',
    lastName: '',
    zipCode: '',
    phoneNumber: '',
    userPoints: '',
    baBadge: '',
    signUpDate: '',
    password: '',
    checkIns: '',
    tierLevel: '',
    username: '',
    email: '',
    checkInReviewPoints: '',
    influencerBadge: '',
    lastLogin: '',
    referralCode: '',
    reviews: '',
    triviasWon: '',
    isBlocked: false,
    dob: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
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
  const wasOpenRef = useRef(false)
  const initialDataRef = useRef(formData)
  const [passwordError, setPasswordError] = useState('')
  
  const hasUnsavedChanges = useUnsavedChanges(formData as unknown as Record<string, unknown>, initialDataRef.current as unknown as Record<string, unknown>, isOpen)

  // Placeholder shown when editing (password not changed); do not validate as real password
  const isPasswordPlaceholder = (p: string) => p && /^\*+$/.test(p) && p.length >= 8

  // Password validation: no spaces, min 8 chars, at least one letter, one number, and one uppercase
  const validatePassword = (password: string): string => {
    if (!password) return 'Password is required'
    if (isPasswordPlaceholder(password)) return '' // editing: masked value = unchanged, skip validation
    if (/\s/.test(password)) return 'Password cannot contain spaces'
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter'
    if (!/\d/.test(password)) return 'Password must contain at least one number'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    return ''
  }

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (isOpen && initialData) {
      // Check if this is a new modal open (transition from closed to open)
      const isNewOpen = !wasOpenRef.current
      
      const newFormData = {
        image: initialData.image || null,
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        zipCode: initialData.zipCode || '',
        phoneNumber: initialData.phoneNumber || '',
        userPoints: initialData.userPoints || '',
        baBadge: initialData.baBadge || '',
        signUpDate: initialData.signUpDate || '',
        password: initialData.password || '',
        checkIns: initialData.checkIns || '',
        tierLevel: initialData.tierLevel || '', // Keep tierLevel from initialData
        username: initialData.username || '',
        email: initialData.email || '',
        checkInReviewPoints: initialData.checkInReviewPoints || '',
        influencerBadge: initialData.influencerBadge || '',
        lastLogin: initialData.lastLogin || '',
        referralCode: initialData.referralCode || '',
        reviews: initialData.reviews || '',
        triviasWon: initialData.triviasWon || '',
        isBlocked: initialData.isBlocked || false,
        dob: initialData.dob ?? '',
      }
      
      if (isNewOpen) {
        setFormData(newFormData)
        initialDataRef.current = newFormData

        // Set image preview if initial data has image
        if (initialData.image) {
          if (typeof initialData.image === 'string') {
            setImagePreview(initialData.image)
          } else if (initialData.image instanceof File) {
            const reader = new FileReader()
            reader.onloadend = () => {
              setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(initialData.image)
          }
        }
      } else {
        // Modal is already open, but initialData changed (e.g., different user selected)
        // Update form data, especially tierLevel
        setFormData(newFormData)
        initialDataRef.current = newFormData
      }
    }
    
    // Track modal open/close state
    wasOpenRef.current = isOpen
  }, [isOpen, initialData])
  
  // Separate effect to update only the isBlocked field without resetting form
  useEffect(() => {
    if (initialData && isOpen) {
      setFormData(prev => ({
        ...prev,
        isBlocked: initialData.isBlocked || false,
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.isBlocked, isOpen])

  // Fetch tiers when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchTiers = async () => {
        setIsLoadingTiers(true)
        try {
          const tiersList = await tiersService.list()
          setTiers(tiersList)
          
          // After tiers are loaded, sync tierLevel from initialData so dropdown shows correct selection
          const profileTier = (initialData?.tierLevel ?? '').trim()
          if (profileTier && tiersList.length > 0) {
            const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, '')
            const normalizedProfile = normalize(profileTier)
            const matchingTier = tiersList.find(
              (tier) => normalize(tier.name) === normalizedProfile
            )
            if (matchingTier) {
              setFormData((prev) => ({
                ...prev,
                tierLevel: matchingTier.name,
              }))
            }
          }
        } catch (error) {
          console.error('Error fetching tiers:', error)
        } finally {
          setIsLoadingTiers(false)
        }
      }
      fetchTiers()
    }
  }, [isOpen, initialData])

  // Check username availability with debounce (exclude current user)
  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim()) {
      setUsernameValidation({
        isChecking: false,
        isAvailable: null,
        message: ''
      })
      return
    }

    // If username hasn't changed from initial, don't check
    if (username === initialData?.username) {
      setUsernameValidation({
        isChecking: false,
        isAvailable: true,
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

      // Check if username exists for a different user (exclude current user)
      const duplicateUser = result.users.find(user => user.$id !== userId)
      
      if (duplicateUser) {
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

  const handleInputChange = (field: keyof UserData, value: string) => {
    // Format phone number automatically
    if (field === 'phoneNumber') {
      const formatted = formatPhoneNumber(value)
      setFormData((prev) => ({ ...prev, [field]: formatted }))
      return
    }

    // First/Last name: alphabets only, auto-capitalize
    if (field === 'firstName' || field === 'lastName') {
      const filtered = value.replace(/[^a-zA-Z]/g, '')
      const capitalized = filtered.charAt(0).toUpperCase() + filtered.slice(1).toLowerCase()
      setFormData((prev) => ({ ...prev, [field]: capitalized }))
      return
    }
    
    // Only allow numbers for specific fields
    if (['userPoints', 'checkIns', 'reviews', 'triviasWon', 'checkInReviewPoints'].includes(field)) {
      const numericValue = value.replace(/\D/g, '')
      setFormData((prev) => ({ ...prev, [field]: numericValue }))
      return
    }
    
    // Zip code - only numbers, max 6 characters
    if (field === 'zipCode') {
      const numericValue = value.replace(/\D/g, '').slice(0, 6)
      setFormData((prev) => ({ ...prev, [field]: numericValue }))
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

    if (field === 'password') {
      setPasswordError(validatePassword(value))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }))
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDeleteImage = () => {
    setFormData((prev) => ({ ...prev, image: null }))
    setImagePreview(null)
    const input = document.getElementById('user-image-upload') as HTMLInputElement
    if (input) input.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmed = trimFormStrings(formData)
    
    const pwdError = validatePassword(trimmed.password || '')
    setPasswordError(pwdError)
    if (pwdError) return
    
    // Prevent submission if username is not available
    if (trimmed.username && usernameValidation.isAvailable === false) {
      return
    }
    
    setIsSubmitting(true)
    try {
      await onSave(trimmed)
      setShowUnsavedChangesModal(false)
      setPasswordError('')
      setUsernameValidation({
        isChecking: false,
        isAvailable: null,
        message: ''
      })
      onClose()
    } catch (error) {
      console.error('Error saving user:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges && !isSubmitting) {
      setShowUnsavedChangesModal(true)
    } else {
      setPasswordError('')
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
    setPasswordError('')
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
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto m-4">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Edit and View User</h2>
              <p className="text-sm text-gray-600 mt-1">
                User detail information.
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
          {/* Blocked Status Banner */}
          {formData.isBlocked && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <Icon icon="mdi:alert-circle" className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-red-900">User is Currently Blocked</h3>
                <p className="text-xs text-red-700 mt-1">
                  This user is in the blacklist and cannot login. Click "Remove from Blacklist" below to unblock.
                </p>
              </div>
            </div>
          )}
          
          {/* Image Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image
            </label>
            <div className="flex items-center gap-4">
              <div className="relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="User profile"
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                    <Icon icon="mdi:account" className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <label className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer font-medium text-sm">
                  Change
                  <input
                    id="user-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Form Fields - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Left Column */}
            <div className="space-y-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
              </div>

              {/* Zip Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zip Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Zip Code"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
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

              {/* User Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Points <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter User Points"
                  value={formData.userPoints}
                  onChange={(e) => handleInputChange('userPoints', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
              </div>

              {/* BA Badge */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  BA Badge <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.baBadge}
                    onChange={(e) => handleInputChange('baBadge', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent appearance-none bg-white pr-10"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  <Icon
                    icon="mdi:chevron-down"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Sign-Up Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sign-Up Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.signUpDate}
                    onChange={(e) => handleInputChange('signUpDate', e.target.value)}
                    required
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                  />
                  <Icon
                    icon="mdi:calendar"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dob ?? ''}
                  onChange={(e) => handleInputChange('dob', e.target.value)}
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
                    placeholder="Enter Password (min 8 chars, letter, number, uppercase)"
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

              {/* Check Ins */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check Ins <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Check Ins"
                  value={formData.checkIns}
                  onChange={(e) => handleInputChange('checkIns', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
              </div>

              {/* Tier Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tier Level <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.tierLevel || ''}
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
                        {!formData.tierLevel && <option value="">Select a tier</option>}
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

            {/* Right Column */}
            <div className="space-y-4">
              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Last Name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter Username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    required
                    className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent ${
                      usernameValidation.isAvailable === false
                        ? 'border-red-500'
                        : usernameValidation.isAvailable === true && formData.username !== initialData?.username
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
                  {!usernameValidation.isChecking && usernameValidation.isAvailable === true && formData.username !== initialData?.username && (
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
                {usernameValidation.message && formData.username !== initialData?.username && (
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

              {/* Check-in/Review Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in/Review Points <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Points"
                  value={formData.checkInReviewPoints}
                  onChange={(e) => handleInputChange('checkInReviewPoints', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
              </div>

              {/* Influencer Badge */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Influencer Badge <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.influencerBadge}
                    onChange={(e) => handleInputChange('influencerBadge', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent appearance-none bg-white pr-10"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  <Icon
                    icon="mdi:chevron-down"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Last Login */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Login <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.lastLogin}
                    onChange={(e) => handleInputChange('lastLogin', e.target.value)}
                    required
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                  />
                  <Icon
                    icon="mdi:calendar"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Referral Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Referral Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Referral Code"
                  value={formData.referralCode}
                  onChange={(e) => handleInputChange('referralCode', e.target.value)}
                  required
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent bg-gray-100 cursor-not-allowed"
                />
              </div>

              {/* Reviews */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reviews <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Reviews"
                  value={formData.reviews}
                  onChange={(e) => handleInputChange('reviews', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
              </div>

              {/* Trivias Won (read-only: computed from trivia responses or stored value) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trivias Won <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Trivias Won"
                  value={formData.triviasWon}
                  disabled
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            {onAddToBlacklist && (
              <button
                type="button"
                onClick={() => {
                  onAddToBlacklist()
                }}
                className={`px-4 py-2 rounded-lg transition-colors font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  formData.isBlocked
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
                disabled={isSubmitting}
              >
                <Icon icon={formData.isBlocked ? 'mdi:lock-open' : 'mdi:lock'} className="w-5 h-5" />
                {formData.isBlocked ? 'Remove from Blacklist' : 'Add to Blacklist'}
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete()
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                <Icon icon="mdi:trash-can" className="w-5 h-5" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting || !!passwordError || (!!formData.username && usernameValidation.isAvailable === false)}
            >
              {isSubmitting && (
                <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
              )}
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

export default EditUserModal

