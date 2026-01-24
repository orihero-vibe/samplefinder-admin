import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import type { Models } from 'appwrite'

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
  productTypes?: string[]
  products?: string[]
  discount?: string
  discountImage?: File | string | null
  discountLink?: string
  checkInCode?: string
  brandName?: string
  checkInPoints?: string
  reviewPoints?: string
  eventInfo?: string
  radius?: string
}

interface Brand extends Models.Document {
  name: string
}

interface EditEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (eventData: any) => Promise<void>
  onArchive?: () => void
  onHide?: () => void
  onDelete?: () => void
  onShowArchiveConfirm?: () => void
  onShowHideConfirm?: () => void
  onShowDeleteConfirm?: () => void
  initialData?: EventData
  brands?: Brand[]
}

const EditEventModal = ({
  isOpen,
  onClose,
  onSave,
  onArchive: _onArchive,
  onHide: _onHide,
  onDelete: _onDelete,
  onShowArchiveConfirm,
  onShowHideConfirm,
  onShowDeleteConfirm,
  initialData,
  brands = [],
}: EditEventModalProps) => {
  const [formData, setFormData] = useState({
    eventName: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    city: 'New York',
    address: '',
    state: '',
    zipCode: '',
    category: 'Beverage',
    productTypes: [] as string[],
    products: [''] as string[],
    discount: '',
    discountImage: null as File | string | null,
    discountLink: '',
    checkInCode: '',
    brandName: '',
    checkInPoints: '',
    reviewPoints: '',
    eventInfo: '',
    radius: '',
  })

  const [_newProductType, setNewProductType] = useState('')
  const [isProductTypeDropdownOpen, setIsProductTypeDropdownOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const availableProductTypes = ['Product 1', 'Product 2', 'Product 3', 'Lana', 'Beauty', 'Fashion']
  const productTypeDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        productTypeDropdownRef.current &&
        !productTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProductTypeDropdownOpen(false)
      }
    }

    if (isProductTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isProductTypeDropdownOpen])

  useEffect(() => {
    if (initialData) {
      setFormData({
        eventName: initialData.eventName || '',
        eventDate: initialData.eventDate || '',
        startTime: initialData.startTime || '',
        endTime: initialData.endTime || '',
        city: initialData.city || 'New York',
        address: initialData.address || '',
        state: initialData.state || '',
        zipCode: initialData.zipCode || '',
        category: initialData.category || 'Beverage',
        productTypes: initialData.productTypes || [],
        products: initialData.products && initialData.products.length > 0 ? initialData.products : [''],
        discount: initialData.discount || '',
        discountImage: initialData.discountImage || null,
        discountLink: initialData.discountLink || '',
        checkInCode: initialData.checkInCode || '',
        brandName: initialData.brandName || '',
        checkInPoints: initialData.checkInPoints || '',
        reviewPoints: initialData.reviewPoints || '',
        eventInfo: initialData.eventInfo || '',
        radius: initialData.radius || '',
      })
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddProductType = (type: string) => {
    if (!formData.productTypes.includes(type)) {
      setFormData((prev) => ({
        ...prev,
        productTypes: [...prev.productTypes, type],
      }))
    }
    setIsProductTypeDropdownOpen(false)
    setNewProductType('')
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
      setFormData((prev) => ({ ...prev, discountImage: file }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submission
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(formData)
      // Only close on success - parent will handle closing
      onClose()
    } catch (error) {
      // Error is handled by parent component via notification
      // Keep modal open so user can fix and retry
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredProductTypes = availableProductTypes.filter(
    (type) => !formData.productTypes.includes(type)
  )

  return (
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
            <h2 className="text-2xl font-bold text-gray-900">Edit event</h2>
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

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter Address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter State"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              />
            </div>

            {/* ZIP Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ZIP Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter ZIP Code"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
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
                <option value="Beverage">Beverage</option>
                <option value="Beauty">Beauty</option>
                <option value="Fashion">Fashion</option>
                <option value="Food">Food</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Product Type */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Type <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={productTypeDropdownRef}>
                <div
                  className="flex flex-wrap gap-2 min-h-[42px] p-2 border border-gray-300 rounded-lg cursor-pointer"
                  onClick={() => setIsProductTypeDropdownOpen(!isProductTypeDropdownOpen)}
                >
                  {formData.productTypes.length > 0 ? (
                    formData.productTypes.map((type, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#1D0A74]/10 text-[#1D0A74] rounded-full text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {type}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveProductType(type)
                          }}
                          className="hover:text-[#1D0A74]/70"
                        >
                          <Icon icon="mdi:close" className="w-4 h-4" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">Select product types</span>
                  )}
                  <Icon
                    icon="mdi:chevron-down"
                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform ${
                      isProductTypeDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                {isProductTypeDropdownOpen && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredProductTypes.length > 0 ? (
                      filteredProductTypes.map((type) => (
                        <div
                          key={type}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleAddProductType(type)}
                        >
                          {type}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-400 text-sm">No more options</div>
                    )}
                  </div>
                )}
              </div>
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
                Discount
              </label>
              <select
                value={formData.discount}
                onChange={(e) => handleInputChange('discount', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
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
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Icon icon="mdi:cloud-upload" className="w-10 h-10 text-gray-400 mb-2" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">Your discount Image here</p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {formData.discountImage && (
              <p className="mt-2 text-sm text-gray-600">
                {typeof formData.discountImage === 'string'
                  ? formData.discountImage
                  : formData.discountImage.name}
              </p>
            )}
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

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
            {onShowArchiveConfirm && (
              <button
                type="button"
                onClick={onShowArchiveConfirm}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold flex items-center gap-2"
              >
                <Icon icon="mdi:folder" className="w-5 h-5" />
                Archive
              </button>
            )}
            {onShowHideConfirm && (
              <button
                type="button"
                onClick={onShowHideConfirm}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold flex items-center gap-2"
              >
                <Icon icon="mdi:eye-off" className="w-5 h-5" />
                Hide
              </button>
            )}
            {onShowDeleteConfirm && (
              <button
                type="button"
                onClick={onShowDeleteConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold flex items-center gap-2"
              >
                <Icon icon="mdi:trash-can" className="w-5 h-5" />
                Delete
              </button>
            )}
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
                  Updating Event...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditEventModal

