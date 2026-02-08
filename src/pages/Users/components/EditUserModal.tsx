import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { tiersService, type TierDocument } from '../../../lib/services'

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
}

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (userData: UserData) => void
  onAddToBlacklist?: () => void
  onDelete?: () => void
  initialData?: UserData
}

const EditUserModal = ({
  isOpen,
  onClose,
  onSave,
  onAddToBlacklist,
  onDelete,
  initialData,
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
  })

  const [showPassword, setShowPassword] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [tiers, setTiers] = useState<TierDocument[]>([])
  const [isLoadingTiers, setIsLoadingTiers] = useState(false)
  const wasOpenRef = useRef(false)

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
      }
      
      if (isNewOpen) {
        setFormData(newFormData)

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
          
          // After tiers are loaded, ensure tierLevel is set correctly from initialData
          if (initialData?.tierLevel && tiersList.length > 0) {
            // Verify the tierLevel exists in the tiers list (case-insensitive match)
            const tierExists = tiersList.some(tier => 
              tier.name.toLowerCase() === initialData.tierLevel?.toLowerCase()
            )
            if (tierExists) {
              // Find the exact tier name (to handle case differences)
              const matchingTier = tiersList.find(tier => 
                tier.name.toLowerCase() === initialData.tierLevel?.toLowerCase()
              )
              if (matchingTier) {
                setFormData(prev => ({
                  ...prev,
                  tierLevel: matchingTier.name // Use the exact tier name from database
                }))
              }
            } else if (initialData.tierLevel) {
              // If tierLevel doesn't match any tier, log a warning but keep the value
              console.warn(`Tier level "${initialData.tierLevel}" not found in tiers list`)
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

  if (!isOpen) return null

  const handleInputChange = (field: keyof UserData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
    onClose()
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
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
          >
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
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
                <input
                  type="text"
                  placeholder="Enter Username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
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

              {/* Trivias Won */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trivias Won <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Trivias Won"
                  value={formData.triviasWon}
                  onChange={(e) => handleInputChange('triviasWon', e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
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
                className={`px-4 py-2 rounded-lg transition-colors font-semibold flex items-center gap-2 ${
                  formData.isBlocked
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
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
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center gap-2"
              >
                <Icon icon="mdi:trash-can" className="w-5 h-5" />
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditUserModal

