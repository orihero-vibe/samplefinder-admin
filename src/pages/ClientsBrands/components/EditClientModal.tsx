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

interface EditClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (clientData: {
    logo: File | null
    clientName: string
    productTypes: string[]
    latitude?: number
    longitude?: number
  }) => void
  initialData?: {
    clientName: string
    productTypes: string[]
    logoUrl?: string
    latitude?: number
    longitude?: number
  }
}

const EditClientModal = ({ isOpen, onClose, onSave, initialData }: EditClientModalProps) => {
  const [formData, setFormData] = useState({
    logo: null as File | null,
    clientName: '',
    productTypes: [] as string[],
    latitude: '',
    longitude: '',
  })

  const [newProductType, setNewProductType] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'input' | 'map'>('input') // Default: input
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060])
  const [mapZoom, setMapZoom] = useState(10)
  const [mapMarker, setMapMarker] = useState<[number, number] | null>(null)

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        logo: null,
        clientName: initialData.clientName || '',
        productTypes: initialData.productTypes || [],
        latitude: initialData.latitude?.toString() || '',
        longitude: initialData.longitude?.toString() || '',
      })
      setLogoPreview(initialData.logoUrl || null)
      setNewProductType('')
      
      // Set map initial position if lat/lng exists
      if (initialData.latitude && initialData.longitude) {
        setMapMarker([initialData.latitude, initialData.longitude])
        setMapCenter([initialData.latitude, initialData.longitude])
        setMapZoom(12)
      }
    }
  }, [isOpen, initialData])

  // Sync map marker with input fields
  useEffect(() => {
    if (formData.latitude && formData.longitude) {
      const lat = parseFloat(formData.latitude)
      const lng = parseFloat(formData.longitude)
      if (!isNaN(lat) && !isNaN(lng)) {
        // Use requestAnimationFrame to avoid cascading renders
        requestAnimationFrame(() => {
          setMapMarker([lat, lng])
          setMapCenter([lat, lng])
        })
      }
    }
  }, [formData.latitude, formData.longitude])

  if (!isOpen) return null

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Update map marker when lat/lng inputs change
    if (field === 'latitude' || field === 'longitude') {
      const lat = field === 'latitude' ? parseFloat(value) : parseFloat(formData.latitude)
      const lng = field === 'longitude' ? parseFloat(value) : parseFloat(formData.longitude)
      if (!isNaN(lat) && !isNaN(lng)) {
        setMapMarker([lat, lng])
        setMapCenter([lat, lng])
      }
    }
  }

  const handleMapClick = (lat: number, lng: number) => {
    setMapMarker([lat, lng])
    setMapCenter([lat, lng])
    setFormData((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }))
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const latitude = formData.latitude ? parseFloat(formData.latitude) : undefined
    const longitude = formData.longitude ? parseFloat(formData.longitude) : undefined
    
    onSave({
      ...formData,
      latitude: !isNaN(latitude ?? 0) ? latitude : undefined,
      longitude: !isNaN(longitude ?? 0) ? longitude : undefined,
    })
    onClose()
  }

  const handleClose = () => {
    onClose()
  }

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, logo: null }))
    setLogoPreview(null)
    // Reset file input
    const input = document.getElementById('logo-upload-edit') as HTMLInputElement
    if (input) input.value = ''
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
            <h2 className="text-2xl font-bold text-gray-900">Edit Client</h2>
            <p className="text-sm text-gray-600 mt-1">
              Edit client information. Fill in the details below.
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
          {/* Image Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image
            </label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Client"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <Icon icon="mdi:close" className="w-4 h-4" />
                    </button>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      id="logo-upload-edit"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium inline-block">
                      Change Image
                    </span>
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Icon icon="mdi:cloud-upload" className="w-12 h-12 text-gray-400 mb-3" />
                      <button
                        type="button"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors mb-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          document.getElementById('logo-upload-edit')?.click()
                        }}
                      >
                        Upload Logo
                      </button>
                      <p className="text-xs text-gray-500">Logo should be 1:1 ratio (square)</p>
                    </div>
                  </div>
                  <input
                    id="logo-upload-edit"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
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

          {/* Location Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-base font-semibold text-gray-900">
                Location <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'input' ? 'map' : 'input')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-[#1D0A74] transition-colors shadow-sm"
              >
                <Icon 
                  icon={viewMode === 'input' ? 'mdi:map' : 'mdi:keyboard'} 
                  className="w-5 h-5" 
                />
                {viewMode === 'input' ? 'Switch to Map View' : 'Switch to Input View'}
              </button>
            </div>

            {viewMode === 'input' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Latitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g., 40.7128"
                      value={formData.latitude}
                      onChange={(e) => handleInputChange('latitude', e.target.value)}
                      required
                      className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-[#1D0A74] bg-white"
                    />
                    <p className="mt-1 text-xs text-gray-500">Range: -90 to 90</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Longitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g., -74.0060"
                      value={formData.longitude}
                      onChange={(e) => handleInputChange('longitude', e.target.value)}
                      required
                      className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-[#1D0A74] bg-white"
                    />
                    <p className="mt-1 text-xs text-gray-500">Range: -180 to 180</p>
                  </div>
                </div>
                {(formData.latitude || formData.longitude) && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <Icon icon="mdi:information" className="w-4 h-4 inline mr-1" />
                      Coordinates: {formData.latitude || 'Not set'}, {formData.longitude || 'Not set'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
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
                {(formData.latitude || formData.longitude) && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <Icon icon="mdi:check-circle" className="w-4 h-4 inline mr-1" />
                      Location set: {formData.latitude || 'N/A'}, {formData.longitude || 'N/A'}
                    </p>
                  </div>
                )}
              </div>
            )}
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
                formData.productTypes.length === 0 ||
                !formData.latitude ||
                !formData.longitude
              }
              className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditClientModal

