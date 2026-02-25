import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import type { Models } from 'appwrite'
import LocationAutocomplete from '../../../components/LocationAutocomplete'
import LocationPicker from '../../../components/LocationPicker'
import { ImageCropper, UnsavedChangesModal } from '../../../components'
import { generateUniqueCheckInCode } from '../../../lib/eventUtils'
import { settingsService, locationsService, type LocationDocument } from '../../../lib/services'
import { useNotificationStore } from '../../../stores/notificationStore'
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges'

interface Category extends Models.Document {
  title: string
}

interface Brand extends Models.Document {
  name: string
  productType?: string[]
  description?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventFormData = any

interface EventData {
  eventName?: string
  eventDate?: string
  startTime?: string
  endTime?: string
  city?: string
  address?: string
  state?: string
  zipCode?: string
  category?: string
  products?: string[]
  discount?: string
  discountImage?: File | string | null
  checkInCode?: string
  brandName?: string
  brandDescription?: string
  checkInPoints?: string
  reviewPoints?: string
  eventInfo?: string
  latitude?: string
  longitude?: string
}

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (eventData: EventFormData) => Promise<void>
  categories?: Category[]
  brands?: Brand[]
  initialData?: EventData
}

const AddEventModal = ({ isOpen, onClose, onSave, categories = [], brands = [], initialData }: AddEventModalProps) => {
  const { addNotification } = useNotificationStore()
  const initialFormData = {
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
    brandDescription: '',
    checkInPoints: '',
    reviewPoints: '',
    eventInfo: '',
    latitude: '',
    longitude: '',
  }
  
  const [formData, setFormData] = useState(initialFormData)
  const initialDataRef = useRef(initialFormData)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableProducts, setAvailableProducts] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [discountImagePreview, setDiscountImagePreview] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null)
  const [locationDisplayValue, setLocationDisplayValue] = useState('')
  const [showAddLocationFields, setShowAddLocationFields] = useState(false)
  const [locationName, setLocationName] = useState('')
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)
  
  const hasUnsavedChanges = useUnsavedChanges(formData, initialDataRef.current, isOpen)

  // Reset form when modal opens and fetch default points from settings
  useEffect(() => {
    if (isOpen) {
      // Fetch default points from global settings
      const fetchDefaults = async () => {
        try {
          const [defaultCheckInPoints, defaultReviewPoints, checkInCode] = await Promise.all([
            settingsService.getDefaultCheckInPoints(),
            settingsService.getDefaultReviewPoints(),
            generateUniqueCheckInCode(),
          ])
          
          // If initialData is provided (for duplicate), use it; otherwise use empty defaults
          const newInitialData = initialData ? {
            eventName: initialData.eventName || '',
            eventDate: initialData.eventDate || '',
            startTime: initialData.startTime || '',
            endTime: initialData.endTime || '',
            city: initialData.city || '',
            address: initialData.address || '',
            state: initialData.state || '',
            zipCode: initialData.zipCode || '',
            category: initialData.category || '',
            products: initialData.products || [],
            discount: initialData.discount || '',
            discountImage: null, // Don't copy the image for duplicates
            checkInCode: checkInCode, // Always generate new check-in code
            brandName: initialData.brandName || '',
            brandDescription: initialData.brandDescription || '',
            checkInPoints: initialData.checkInPoints || defaultCheckInPoints?.toString() || '',
            reviewPoints: initialData.reviewPoints || defaultReviewPoints?.toString() || '',
            eventInfo: initialData.eventInfo || '',
            latitude: initialData.latitude || '',
            longitude: initialData.longitude || '',
          } : {
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
            checkInCode: checkInCode,
            brandName: '',
            brandDescription: '',
            checkInPoints: defaultCheckInPoints?.toString() || '',
            reviewPoints: defaultReviewPoints?.toString() || '',
            eventInfo: '',
            latitude: '',
            longitude: '',
          }
          
          setFormData(newInitialData)
          initialDataRef.current = newInitialData
          
          // Set discount image preview if initialData has an image URL
          if (initialData?.discountImage && typeof initialData.discountImage === 'string') {
            setDiscountImagePreview(initialData.discountImage)
          } else {
            setDiscountImagePreview(null)
          }
          
          // Set location display value if address is provided
          if (initialData?.address) {
            setLocationDisplayValue(initialData.address)
          } else {
            setLocationDisplayValue('')
          }
        } catch (error) {
          console.error('Error fetching default points:', error)
          // Set form with empty defaults if fetch fails
          const newInitialData = {
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
            brandDescription: '',
            checkInPoints: '',
            reviewPoints: '',
            eventInfo: '',
            latitude: '',
            longitude: '',
          }
          
          setFormData(newInitialData)
          initialDataRef.current = newInitialData
          setDiscountImagePreview(null)
          setLocationDisplayValue('')
        }
      }
      
      fetchDefaults()
      setAvailableProducts([])
      setShowCropper(false)
      setTempImageForCrop(null)
      setShowAddLocationFields(false)
      setLocationName('')
      
      // Set available products immediately when initialData has a brand
      if (initialData?.brandName) {
        const selectedBrand = brands.find((brand) => brand.name === initialData.brandName)
        if (selectedBrand && selectedBrand.productType) {
          setAvailableProducts(selectedBrand.productType)
        }
      }
    }
  }, [isOpen, initialData, brands])

  // Track previous brand name to detect actual changes
  const prevBrandNameRef = useRef<string>('')

  // Update available products and brand description when brand changes
  useEffect(() => {
    // Only clear products when brand actually changed (not on initial load with initialData)
    const brandChanged = prevBrandNameRef.current !== '' && prevBrandNameRef.current !== formData.brandName
    const firstBrandSelection = prevBrandNameRef.current === '' && formData.brandName

    if (formData.brandName) {
      const selectedBrand = brands.find((brand) => brand.name === formData.brandName)
      if (selectedBrand) {
        // Set available products
        if (selectedBrand.productType) {
          setAvailableProducts(selectedBrand.productType)
        } else {
          setAvailableProducts([])
        }
        // Prefill brand description when user selects a brand (first time or switching)
        if (brandChanged) {
          setFormData((prev) => ({
            ...prev,
            products: [],
            brandDescription: selectedBrand.description || '',
          }))
        } else if (firstBrandSelection) {
          setFormData((prev) => ({ ...prev, brandDescription: selectedBrand.description || '' }))
        }
      } else {
        setAvailableProducts([])
        if (brandChanged) {
          setFormData((prev) => ({ ...prev, products: [], brandDescription: '' }))
        }
      }
      prevBrandNameRef.current = formData.brandName
    } else {
      setAvailableProducts([])
      // Only clear if brand was removed (not on initial load)
      if (prevBrandNameRef.current !== '') {
        setFormData((prev) => ({ ...prev, products: [], brandDescription: '' }))
      }
      prevBrandNameRef.current = ''
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

  // Get today's date in YYYY-MM-DD format for date input min attribute
  const getTodayDateString = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submission
    if (isSubmitting) {
      return
    }

    // Validate that event date is not in the past
    if (formData.eventDate) {
      const eventDate = new Date(formData.eventDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // Reset time to start of day for comparison
      eventDate.setHours(0, 0, 0, 0)

      if (eventDate < today) {
        addNotification({
          type: 'error',
          title: 'Invalid Event Date',
          message: 'Event date cannot be in the past. Please select today or a future date.',
        })
        return
      }
    }

    // Validate that start time is before end time
    if (formData.startTime && formData.endTime) {
      const [startHour, startMinute] = formData.startTime.split(':').map(Number)
      const [endHour, endMinute] = formData.endTime.split(':').map(Number)
      
      const startTimeInMinutes = startHour * 60 + startMinute
      const endTimeInMinutes = endHour * 60 + endMinute
      
      if (startTimeInMinutes >= endTimeInMinutes) {
        addNotification({
          type: 'error',
          title: 'Invalid Event Duration',
          message: 'Start time must be before end time. Please adjust the event times.',
        })
        return
      }
    }

    // Validate that products are not blank
    if (!formData.products || formData.products.length === 0) {
      addNotification({
        type: 'error',
        title: 'Products Required',
        message: 'Products field cannot be blank. Please select at least one product.',
      })
      return
    }

    // Validate that all selected products are valid for the selected brand
    if (formData.brandName && availableProducts.length > 0) {
      const invalidProducts = formData.products.filter(
        (product) => !availableProducts.includes(product)
      )
      if (invalidProducts.length > 0) {
        addNotification({
          type: 'error',
          title: 'Invalid Products',
          message: `Invalid products selected: ${invalidProducts.join(', ')}. Please select only products related to the selected brand.`,
        })
        return
      }
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
      // Close unsaved changes modal if it's open
      setShowUnsavedChangesModal(false)
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
      
      <UnsavedChangesModal
        isOpen={showUnsavedChangesModal}
        onClose={() => setShowUnsavedChangesModal(false)}
        onDiscard={handleDiscardChanges}
      />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
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
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} data-event-form className="p-6">
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
                {[...brands].sort((a, b) => a.name.localeCompare(b.name)).map((brand) => (
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
                {[...categories].sort((a, b) => a.title.localeCompare(b.title)).map((category) => (
                  <option key={category.$id} value={category.title}>
                    {category.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                min={getTodayDateString()}
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
              type="submit"
              className="w-full px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

