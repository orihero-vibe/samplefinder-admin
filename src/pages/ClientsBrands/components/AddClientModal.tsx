import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { ImageCropper, UnsavedChangesModal } from '../../../components'
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges'

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (clientData: {
    logo: File | null
    clientName: string
    productTypes: string[]
    description: string
  }) => Promise<void>
}

const AddClientModal = ({ isOpen, onClose, onSave }: AddClientModalProps) => {
  const initialFormData = {
    logo: null as File | null,
    clientName: '',
    productTypes: [] as string[],
    description: '',
  }
  
  const [formData, setFormData] = useState(initialFormData)
  const initialDataRef = useRef(initialFormData)

  const [newProductType, setNewProductType] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)
  
  const hasUnsavedChanges = useUnsavedChanges(formData, initialDataRef.current, isOpen)

  // Reset form when modal closes
  useEffect(() => {
    if (isOpen) {
      initialDataRef.current = initialFormData
    } else {
      // Reset state when modal closes using requestAnimationFrame to avoid cascading renders
      requestAnimationFrame(() => {
        setFormData(initialFormData)
        setNewProductType('')
        setLogoPreview(null)
        setIsSubmitting(false)
        setShowCropper(false)
        setTempImageForCrop(null)
        setIsDragging(false)
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Read file and show cropper
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
    // Convert blob to file
    const isPng = croppedBlob.type === 'image/png'
    const extension = isPng ? 'png' : 'jpg'
    const croppedFile = new File([croppedBlob], `logo.${extension}`, { type: croppedBlob.type })
    setFormData((prev) => ({ ...prev, logo: croppedFile }))
    
    // Create preview from blob
    const previewUrl = URL.createObjectURL(croppedBlob)
    setLogoPreview(previewUrl)
    
    // Close cropper
    setShowCropper(false)
    setTempImageForCrop(null)
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setTempImageForCrop(null)
    // Reset file input
    const input = document.getElementById('logo-upload') as HTMLInputElement
    if (input) input.value = ''
  }

  const handleAddProductType = () => {
    if (newProductType.trim() && !formData.productTypes.includes(newProductType.trim())) {
      setFormData((prev) => ({
        ...prev,
        productTypes: [...prev.productTypes, newProductType.trim()],
      }))
      setNewProductType('')
    }
  }

  const handleRemoveProductType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      productTypes: prev.productTypes.filter((t) => t !== type),
    }))
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

  const handleSaveFromUnsavedModal = async () => {
    const form = document.querySelector('form[data-client-form]') as HTMLFormElement
    if (form) {
      form.requestSubmit()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submission
    if (isSubmitting) {
      return
    }

    // Set loading state immediately for instant UI feedback
    setIsSubmitting(true)

    try {
      await onSave({
        logo: formData.logo,
        clientName: formData.clientName,
        productTypes: formData.productTypes,
        description: formData.description,
      })
      
      // Success - close modals and reset form
      setShowUnsavedChangesModal(false)
      onClose()
    } catch {
      // Error - keep modal open, error notification is handled by parent
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
          aspectRatio={1}
        />
      )}
      
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
            <h2 className="text-2xl font-bold text-gray-900">Add Client</h2>
            <p className="text-sm text-gray-600 mt-1">
              Add a new client to your organization. Fill in the details below.
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
        <form onSubmit={handleSubmit} data-client-form className="p-6">
          {/* Logo Upload Section */}
          <div className="mb-6">
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
              {logoPreview ? (
                <div className="flex flex-col items-center justify-center pt-5 pb-6 w-full h-full">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-w-full max-h-32 object-contain mb-2"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setFormData((prev) => ({ ...prev, logo: null }))
                      setLogoPreview(null)
                      // Reset file input
                      const input = document.getElementById('logo-upload') as HTMLInputElement
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
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">Upload an image to crop into 1:1 ratio (square)</p>
                </div>
              )}
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Client Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Client Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Enter Client Name"
              value={formData.clientName}
              onChange={(e) => handleInputChange('clientName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
            />
          </div>

          {/* Description Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Brand Description
            </label>
            <textarea
              placeholder="Enter brand description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              maxLength={300}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">This description will be shown in the Favorites section.</p>
          </div>

          {/* Product Type Multi-select */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Products <span className="text-red-500">*</span> (Please press enter to add more products)
            </label>
            <div className="flex flex-wrap gap-2 min-h-[42px] p-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-[#1D0A74] focus-within:border-transparent">
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
              <input
                type="text"
                placeholder={formData.productTypes.length === 0 ? 'Add products...' : ''}
                value={newProductType}
                onChange={(e) => setNewProductType(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddProductType()
                  }
                }}
                onBlur={() => {
                  if (newProductType.trim()) {
                    handleAddProductType()
                  }
                }}
                className="flex-1 min-w-[120px] px-2 py-1 border-0 focus:outline-none"
              />
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
              disabled={
                isSubmitting ||
                !formData.clientName.trim() ||
                formData.productTypes.length === 0
              }
              className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating client...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

export default AddClientModal

