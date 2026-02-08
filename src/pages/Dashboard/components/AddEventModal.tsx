import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import type { Models } from 'appwrite'
import LocationAutocomplete from '../../../components/LocationAutocomplete'
import LocationPicker from '../../../components/LocationPicker'
import { ImageCropper } from '../../../components'
import { generateUniqueCheckInCode } from '../../../lib/eventUtils'
import { settingsService, locationsService, type LocationDocument } from '../../../lib/services'

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
    products: [] as string[],
    discount: '',
    discountImage: null as File | null,
    checkInCode: '',
    brandName: '',
    checkInPoints: '',
    reviewPoints: '',
    eventInfo: '',
    latitude: '',
    longitude: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [discountImagePreview, setDiscountImagePreview] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null)
  const [locationDisplayValue, setLocationDisplayValue] = useState('')
  const [showAddLocationFields, setShowAddLocationFields] = useState(false)
  const [locationName, setLocationName] = useState('')

  // Reset form when modal opens and fetch default points from settings
  useEffect(() => {
    if (isOpen) {
      // Generate unique check-in code asynchronously
      generateUniqueCheckInCode().then((code) => {
        setFormData((prev) => ({
          ...prev,
          checkInCode: code,
        }))
      })
      
      // Fetch default points from global settings
      const fetchDefaults = async () => {
        try {
          const [defaultCheckInPoints, defaultReviewPoints] = await Promise.all([
            settingsService.getDefaultCheckInPoints(),
            settingsService.getDefaultReviewPoints(),
          ])
          
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
            products: [],
            discount: '',
            discountImage: null,
            checkInCode: '',
            brandName: '',
            checkInPoints: defaultCheckInPoints?.toString() || '',
            reviewPoints: defaultReviewPoints?.toString() || '',
            eventInfo: '',
            latitude: '',
            longitude: '',
          })
        } catch (error) {
          console.error('Error fetching default points:', error)
          // Set form with empty defaults if fetch fails
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
            products: [],
            discount: '',
            discountImage: null,
            checkInCode: '',
            brandName: '',
            checkInPoints: '',
            reviewPoints: '',
            eventInfo: '',
            latitude: '',
            longitude: '',
          })
        }
      }
      
      fetchDefaults()
      setAvailableProducts([])
      setDiscountImagePreview(null)
      setShowCropper(false)
      setTempImageForCrop(null)
      setLocationDisplayValue('')
      setShowAddLocationFields(false)
      setLocationName('')
    }
  }, [isOpen])

  // Update available products when brand changes
  useEffect(() => {
    if (formData.brandName) {
      const selectedBrand = brands.find((brand) => brand.name === formData.brandName)
      if (selectedBrand && selectedBrand.productType) {
        setAvailableProducts(selectedBrand.productType)
      } else {
        setAvailableProducts([])
      }
      // Clear selected products when brand changes
      setFormData((prev) => ({ ...prev, products: [] }))
    } else {
      setAvailableProducts([])
      setFormData((prev) => ({ ...prev, products: [] }))
    }
  }, [formData.brandName, brands])

  if (!isOpen) return null

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleRemoveProduct = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((t) => t !== type),
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
    const isPng = croppedBlob.type === 'image/png'
    const extension = isPng ? 'png' : 'jpg'
    const croppedFile = new File([croppedBlob], `discount-image.${extension}`, { type: croppedBlob.type })
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
    
    // Prevent double submission
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      // If location name is filled, create location first
      if (showAddLocationFields && locationName.trim() && formData.address && formData.city && formData.state && formData.zipCode && formData.latitude && formData.longitude) {
        await locationsService.create({
          name: locationName,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          location: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
        })
      }
      
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

            {/* Check in Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Check in Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Auto-generated"
                value={formData.checkInCode}
                disabled
                required
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* Check In Points */}
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
            </div>
            {/* Discount */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount
              </label>
              <input
                type="text"
                placeholder="Enter discount"
                value={formData.discount}
                onChange={(e) => handleInputChange('discount', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* Discount Image Upload */}
            <div className='mt-6 mb-6'>
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
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
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

            {/* Products */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Products <span className="text-red-500">*</span>
              </label>
              <select
                value=""
                onChange={(e) => {
                  const selectedProduct = e.target.value
                  if (selectedProduct && !formData.products.includes(selectedProduct)) {
                    setFormData((prev) => ({
                      ...prev,
                      products: [...prev.products, selectedProduct],
                    }))
                  }
                }}
                disabled={!formData.brandName || availableProducts.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!formData.brandName 
                    ? 'Select a brand first' 
                    : availableProducts.length === 0 
                    ? 'No products available' 
                    : 'Choose Product'}
                </option>
                {availableProducts.map((product, index) => (
                  <option 
                    key={index} 
                    value={product}
                    disabled={formData.products.includes(product)}
                  >
                    {product}
                  </option>
                ))}
              </select>
              {/* Selected Products */}
              {formData.products.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.products.map((product, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#1D0A74]/10 text-[#1D0A74] rounded-full text-sm"
                    >
                      {product}
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(product)}
                        className="hover:text-[#1D0A74]/70"
                      >
                        <Icon icon="mdi:close" className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Review Points */}
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

          {/* Location Autocomplete Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Location <span className="text-red-500">*</span>
            </label>
            {!showAddLocationFields ? (
              <LocationAutocomplete
                value={locationDisplayValue}
                onChange={setLocationDisplayValue}
                onLocationSelect={(location: LocationDocument) => {
                  // Extract coordinates - handle both array format [longitude, latitude] and GeoJSON format {coordinates: [longitude, latitude]}
                  let latitude = ''
                  let longitude = ''
                  
                  if (location.location) {
                    let lat: number | undefined
                    let lng: number | undefined
                    
                    if (Array.isArray(location.location) && location.location.length >= 2) {
                      // Direct array format: [longitude, latitude]
                      lng = location.location[0]
                      lat = location.location[1]
                    } else if (
                      typeof location.location === 'object' &&
                      location.location !== null &&
                      'coordinates' in location.location &&
                      Array.isArray((location.location as { coordinates: number[] }).coordinates) &&
                      (location.location as { coordinates: number[] }).coordinates.length >= 2
                    ) {
                      // GeoJSON format: {coordinates: [longitude, latitude]}
                      const coords = (location.location as { coordinates: number[] }).coordinates
                      lng = coords[0]
                      lat = coords[1]
                    }
                    
                    // Validate coordinates are within valid ranges before using them
                    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
                      // Latitude: -90 to 90, Longitude: -180 to 180
                      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                        latitude = lat.toString()
                        longitude = lng.toString()
                      }
                    }
                  }
                  
                  // Populate all form fields from selected location
                  setFormData((prev) => ({
                    ...prev,
                    address: location.address || '',
                    city: location.city || '',
                    state: location.state || '',
                    zipCode: location.zipCode || '',
                    latitude,
                    longitude,
                  }))
                }}
                onAddLocationClick={() => {
                  setShowAddLocationFields(true)
                  setLocationDisplayValue('')
                }}
                placeholder="Search for a location..."
                required
              />
            ) : (
              <div className="space-y-4">
                {/* Location Name Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Location Name"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                  />
                </div>

                {/* Location Picker */}
                <LocationPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onLocationChange={(lat, lng) => {
                    setFormData((prev) => ({
                      ...prev,
                      latitude: lat,
                      longitude: lng,
                    }))
                  }}
                  onAddressFromCoords={(components) => {
                    setFormData((prev) => ({
                      ...prev,
                      address: components.address,
                      city: components.city,
                      state: components.state,
                      zipCode: components.zipCode,
                    }))
                  }}
                  address={formData.address}
                  city={formData.city}
                  state={formData.state}
                  zipCode={formData.zipCode}
                  onAddressChange={(address) => setFormData((prev) => ({ ...prev, address }))}
                  onCityChange={(city) => setFormData((prev) => ({ ...prev, city }))}
                  onStateChange={(state) => setFormData((prev) => ({ ...prev, state }))}
                  onZipCodeChange={(zipCode) => setFormData((prev) => ({ ...prev, zipCode }))}
                />

                {/* Cancel Add Location Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAddLocationFields(false)
                    setLocationName('')
                    setFormData((prev) => ({
                      ...prev,
                      address: '',
                      city: '',
                      state: '',
                      zipCode: '',
                      latitude: '',
                      longitude: '',
                    }))
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                >
                  <Icon icon="mdi:arrow-left" className="w-4 h-4" />
                  Cancel and search existing location
                </button>
              </div>
            )}
          </div>

          {/* Hidden inputs for validation */}
          <input type="hidden" value={formData.latitude} required={showAddLocationFields} />
          <input type="hidden" value={formData.longitude} required={showAddLocationFields} />

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

