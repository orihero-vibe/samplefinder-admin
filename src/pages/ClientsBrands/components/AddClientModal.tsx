import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default marker icon in React-Leaflet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Component to handle map clicks
function MapClickHandler({ 
  onClick 
}: { 
  onClick: (lat: number, lng: number) => void 
}) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

interface AddClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (clientData: {
    logo: File | null
    clientName: string
    productTypes: string[]
    city?: string
    address?: string
    state?: string
    zip?: string
    location?: [number, number] // Point format: [longitude, latitude]
  }) => Promise<void>
}

const AddClientModal = ({ isOpen, onClose, onSave }: AddClientModalProps) => {
  const [formData, setFormData] = useState({
    logo: null as File | null,
    clientName: '',
    productTypes: [] as string[],
    city: '',
    address: '',
    state: '',
    zip: '',
  })

  const [newProductType, setNewProductType] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060])
  const [mapZoom] = useState(10)
  const [mapMarker, setMapMarker] = useState<[number, number] | null>(null)
  const [location, setLocation] = useState<[number, number] | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes using requestAnimationFrame to avoid cascading renders
      requestAnimationFrame(() => {
        setFormData({
          logo: null,
          clientName: '',
          productTypes: [],
          city: '',
          address: '',
          state: '',
          zip: '',
        })
        setNewProductType('')
        setLogoPreview(null)
        setMapMarker(null)
        setLocation(undefined)
        setIsSubmitting(false)
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleMapClick = (lat: number, lng: number) => {
    // Store as [longitude, latitude] point format
    const point: [number, number] = [lng, lat]
    setMapMarker([lat, lng]) // Map marker uses [lat, lng] for display
    setMapCenter([lat, lng])
    setLocation(point)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, logo: file }))
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
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
        city: formData.city || undefined,
        address: formData.address || undefined,
        state: formData.state || undefined,
        zip: formData.zip || undefined,
        location,
      })
      
      // Success - close modal and reset form
      onClose()
    } catch {
      // Error - keep modal open, error notification is handled by parent
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Reset is handled by useEffect
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
        <form onSubmit={handleSubmit} className="p-6">
          {/* Logo Upload Section */}
          <div className="mb-6">
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
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
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors mb-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      document.getElementById('logo-upload')?.click()
                    }}
                  >
                    Upload Logo
                  </button>
                  <p className="text-xs text-gray-500">Logo should be 1:1 ratio (square)</p>
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
              Client Name
            </label>
            <input
              type="text"
              placeholder="Enter Client Name"
              value={formData.clientName}
              onChange={(e) => handleInputChange('clientName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
            />
          </div>

          {/* Address Fields */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address Information
            </label>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="Enter street address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="Enter city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="Enter state"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  placeholder="Enter ZIP code"
                  value={formData.zip}
                  onChange={(e) => handleInputChange('zip', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <label className="block text-base font-semibold text-gray-900 mb-4">
              Location <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              <div className="relative w-full h-96 rounded-lg overflow-hidden border-2 border-gray-300 shadow-sm">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler onClick={handleMapClick} />
                  {mapMarker && <Marker position={mapMarker} />}
                </MapContainer>
                {mapMarker && (
                  <div className="absolute top-3 left-3 bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 z-[1000]">
                    <div className="text-sm font-semibold text-gray-900 mb-1">Selected Location</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Lat: <span className="font-mono font-medium">{mapMarker[0].toFixed(6)}</span></div>
                      <div>Lng: <span className="font-mono font-medium">{mapMarker[1].toFixed(6)}</span></div>
                    </div>
                  </div>
                )}
                {!mapMarker && (
                  <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-[#1D0A74] text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-[1000]">
                    Click on the map to set location
                  </div>
                )}
              </div>
              {location && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <Icon icon="mdi:check-circle" className="w-4 h-4 inline mr-1" />
                    Location set: {mapMarker?.[0].toFixed(6)}, {mapMarker?.[1].toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Product Type Multi-select */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Type <span className="text-red-500">*</span>
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
                placeholder={formData.productTypes.length === 0 ? 'Add product types...' : ''}
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
              <Icon icon="mdi:chevron-down" className="w-5 h-5 text-gray-400" />
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
                formData.productTypes.length === 0 ||
                !location
              }
              className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating client...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddClientModal

