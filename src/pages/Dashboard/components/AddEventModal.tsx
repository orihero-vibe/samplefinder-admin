import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import type { Models } from 'appwrite'
import LocationPicker from '../../../components/LocationPicker'
import { ImageCropper } from '../../../components'

interface Category extends Models.Document {
  title: string
}

interface Brand extends Models.Document {
  name: string
  productType?: string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventFormData = any

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (eventData: EventFormData) => Promise<void>
  categories?: Category[]
  brands?: Brand[]
}

const AddEventModal = ({ isOpen, onClose, onSave, categories = [], brands = [] }: AddEventModalProps) => {
  const [formData, setFormData] = useState({
    eventName: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    city: '',
    address: '',
    state: '',
    zipCode: '',
    category: '',
    productTypes: [] as string[],
    products: [''] as string[],
    discount: '',
    discountImage: null as File | null,
    discountLink: '',
    checkInCode: '',
    brandName: '',
    checkInPoints: '',
    reviewPoints: '',
    eventInfo: '',
    radius: '',
    latitude: '',
    longitude: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableProductTypes, setAvailableProductTypes] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [discountImagePreview, setDiscountImagePreview] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        eventName: '',
        eventDate: '',
        startTime: '',
        endTime: '',
        city: '',
        address: '',
        state: '',
        zipCode: '',
        category: '',
        productTypes: [],
        products: [''],
        discount: '',
        discountImage: null,
        discountLink: '',
        checkInCode: '',
        brandName: '',
        checkInPoints: '',
        reviewPoints: '',
        eventInfo: '',
        radius: '',
        latitude: '',
        longitude: '',
      })
      setAvailableProductTypes([])
      setDiscountImagePreview(null)
      setShowCropper(false)
      setTempImageForCrop(null)
    }
  }, [isOpen])

  // Update available product types when brand changes
  useEffect(() => {
    if (formData.brandName) {
      const selectedBrand = brands.find((brand) => brand.name === formData.brandName)
      if (selectedBrand && selectedBrand.productType) {
        setAvailableProductTypes(selectedBrand.productType)
      } else {
        setAvailableProductTypes([])
      }
      // Clear selected product types when brand changes
      setFormData((prev) => ({ ...prev, productTypes: [] }))
    } else {
      setAvailableProductTypes([])
      setFormData((prev) => ({ ...prev, productTypes: [] }))
    }
  }, [formData.brandName, brands])

  if (!isOpen) return null

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleRemoveProductType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      productTypes: prev.productTypes.filter((t) => t !== type),
    }))
  }

  const handleAddProduct = () => {
    setFormData((prev) => ({
      ...prev,
      products: [...prev.products, ''],
    }))
  }

  const handleRemoveProduct = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setTempImageForCrop(reader.result as string)
        setShowCropper(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setTempImageForCrop(reader.result as string)
        setShowCropper(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], 'discount-image.jpg', { type: 'image/jpeg' })
    setFormData((prev) => ({ ...prev, discountImage: croppedFile }))
    setDiscountImagePreview(URL.createObjectURL(croppedBlob))
    setShowCropper(false)
    setTempImageForCrop(null)
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setTempImageForCrop(null)
  }

  const handleRemoveDiscountImage = () => {
    setFormData((prev) => ({ ...prev, discountImage: null }))
    setDiscountImagePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('AddEventModal - Submitting form data:', formData)
    console.log('AddEventModal - productTypes being submitted:', formData.productTypes)
    
    // Prevent double submission
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(formData)
      // Only close on success - parent will handle closing
      onClose()
    } catch {
      // Error is handled by parent component via notification
      // Keep modal open so user can fix and retry
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {showCropper && tempImageForCrop && (
        <ImageCropper
          image={tempImageForCrop}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={3 / 1}
        />
      )}
      
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={isSubmitting ? undefined : onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add Event</h2>
            <p className="text-sm text-gray-600 mt-1">
              Add a new event to your organization. Fill in the details below.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Event Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter Event Name"
                value={formData.eventName}
                onChange={(e) => handleInputChange('eventName', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* Event Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.eventDate}
                onChange={(e) => handleInputChange('eventDate', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              >
                <option value="">Choose Category</option>
                {categories.map((category) => (
                  <option key={category.$id} value={category.title}>
                    {category.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Name <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.brandName}
                onChange={(e) => handleInputChange('brandName', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              >
                <option value="">Choose Brand Name</option>
                {brands.map((brand) => (
                  <option key={brand.$id} value={brand.name}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Type <span className="text-red-500">*</span>
              </label>
              <select
                value=""
                onChange={(e) => {
                  const selectedType = e.target.value
                  if (selectedType && !formData.productTypes.includes(selectedType)) {
                    setFormData((prev) => ({
                      ...prev,
                      productTypes: [...prev.productTypes, selectedType],
                    }))
                  }
                }}
                disabled={!formData.brandName || availableProductTypes.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!formData.brandName 
                    ? 'Select a brand first' 
                    : availableProductTypes.length === 0 
                    ? 'No product types available' 
                    : 'Choose Product Type'}
                </option>
                {availableProductTypes.map((type, index) => (
                  <option 
                    key={index} 
                    value={type}
                    disabled={formData.productTypes.includes(type)}
                  >
                    {type}
                  </option>
                ))}
              </select>
              {/* Selected Product Types */}
              {formData.productTypes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.productTypes.map((type, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#1D0A74]/10 text-[#1D0A74] rounded-full text-sm"
                    >
                      {type}
                      <button
                        type="button"
                        onClick={() => handleRemoveProductType(type)}
                        className="hover:text-[#1D0A74]/70"
                      >
                        <Icon icon="mdi:close" className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Products Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Products
            </label>
            {formData.products.map((product, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Enter Product"
                  value={product}
                  onChange={(e) => {
                    const newProducts = [...formData.products]
                    newProducts[index] = e.target.value
                    setFormData((prev) => ({ ...prev, products: newProducts }))
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
                {formData.products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(index)}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Icon icon="mdi:close" className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddProduct}
              className="text-[#1D0A74] hover:text-[#15065c] font-medium flex items-center gap-2"
            >
              <Icon icon="mdi:plus" className="w-5 h-5" />
              Add Product
            </button>
          </div>

          {/* Discount Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount (%)
              </label>
              <input
                type="number"
                placeholder="Enter discount percentage"
                value={formData.discount}
                onChange={(e) => handleInputChange('discount', e.target.value)}
                min="0"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Link
              </label>
              <input
                type="text"
                placeholder="Enter Discount Link"
                value={formData.discountLink}
                onChange={(e) => handleInputChange('discountLink', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>
          </div>

          {/* Discount Image Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Discount Image Upload
            </label>
            <label 
              className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isDragging 
                  ? 'border-[#1D0A74] bg-[#1D0A74]/5' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {discountImagePreview ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <img
                    src={discountImagePreview}
                    alt="Discount"
                    className="max-h-28 max-w-full object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleRemoveDiscountImage()
                    }}
                    className="mt-3 text-[#1D0A74] hover:text-[#15065c] font-medium text-sm"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Icon icon="mdi:cloud-upload" className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">Image will be cropped to 3:1 ratio</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check in Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter Check in Code"
                value={formData.checkInCode}
                onChange={(e) => handleInputChange('checkInCode', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check In Points <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="Enter point"
                value={formData.checkInPoints}
                onChange={(e) => handleInputChange('checkInPoints', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Points <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="Enter point"
                value={formData.reviewPoints}
                onChange={(e) => handleInputChange('reviewPoints', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Radius <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="Enter radius"
                value={formData.radius}
                onChange={(e) => handleInputChange('radius', e.target.value)}
                required
                min="0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>
          </div>

          {/* Event Info */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Info <span className="text-red-500">*</span>
            </label>
            <textarea
              placeholder="Enter event information"
              value={formData.eventInfo}
              onChange={(e) => handleInputChange('eventInfo', e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent resize-none"
            />
          </div>

          {/* Location Picker Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Location <span className="text-red-500">*</span>
            </label>
            <LocationPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onLocationChange={(lat, lng) => {
                setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))
              }}
              onAddressFromCoords={(components) => {
                setFormData((prev) => ({
                  ...prev,
                  address: components.address || prev.address,
                  city: components.city || prev.city,
                  state: components.state || prev.state,
                  zipCode: components.zipCode, // Always update, even if empty
                }))
              }}
              address={formData.address}
              city={formData.city}
              state={formData.state}
              zipCode={formData.zipCode}
              onCityChange={(value) => handleInputChange('city', value)}
              onStateChange={(value) => handleInputChange('state', value)}
              onZipCodeChange={(value) => handleInputChange('zipCode', value)}
              onAddressChange={(value) => handleInputChange('address', value)}
            />
          </div>

          {/* Hidden inputs for validation */}
          <input type="hidden" value={formData.latitude} required />
          <input type="hidden" value={formData.longitude} required />

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                  Creating Event...
                </>
              ) : (
                'Save Event'
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </>
  )
}

export default AddEventModal

