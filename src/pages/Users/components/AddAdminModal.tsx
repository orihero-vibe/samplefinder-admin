import { useState } from 'react'
import { Icon } from '@iconify/react'

interface AddAdminModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (adminData: {
    image: File | null
    firstName: string
    lastName: string
    email: string
    password: string
  }) => void
}

const AddAdminModal = ({ isOpen, onClose, onSave }: AddAdminModalProps) => {
  const [formData, setFormData] = useState({
    image: null as File | null,
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState('')

  // Password validation: no spaces, min 8 chars, at least one letter, one number, and one uppercase
  const validatePassword = (password: string): string => {
    if (!password) return 'Password is required'
    if (/\s/.test(password)) return 'Password cannot contain spaces'
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter'
    if (!/\d/.test(password)) return 'Password must contain at least one number'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    return ''
  }

  if (!isOpen) return null

  const handleInputChange = (field: string, value: string) => {
    // First/Last name: alphabets only, auto-capitalize
    if (field === 'firstName' || field === 'lastName') {
      const filtered = value.replace(/[^a-zA-Z]/g, '')
      const capitalized = filtered.charAt(0).toUpperCase() + filtered.slice(1).toLowerCase()
      setFormData((prev) => ({ ...prev, [field]: capitalized }))
      return
    }

    setFormData((prev) => ({ ...prev, [field]: value }))
    
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const pwdError = validatePassword(formData.password)
    setPasswordError(pwdError)
    if (pwdError) return
    
    onSave(formData)
    // Reset form
    setFormData({
      image: null,
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    })
    setImagePreview(null)
    setShowPassword(false)
    setPasswordError('')
    onClose()
  }

  const handleClose = () => {
    // Reset form on close
    setFormData({
      image: null,
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    })
    setImagePreview(null)
    setShowPassword(false)
    setPasswordError('')
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
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add Admin</h2>
            <p className="text-sm text-gray-600 mt-1">
              Add a new Admin to the system.
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
          {/* Image Upload Section */}
          <div className="mb-6">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              {imagePreview ? (
                <div className="flex flex-col items-center justify-center pt-5 pb-6 w-full h-full">
                  <img
                    src={imagePreview}
                    alt="Image preview"
                    className="max-w-full max-h-32 object-contain mb-2"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFormData((prev) => ({ ...prev, image: null }))
                      setImagePreview(null)
                      // Reset file input
                      const input = document.getElementById('admin-image-upload') as HTMLInputElement
                      if (input) input.value = ''
                    }}
                    className="mt-2 px-4 py-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Icon icon="mdi:cloud-upload" className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-sm font-medium text-gray-700 mb-1">Upload Image</p>
                  <p className="text-xs text-gray-500">Logo should be 1:1 ratio (square)</p>
                </div>
              )}
              <input
                id="admin-image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 mb-6">
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
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!!passwordError}
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddAdminModal

