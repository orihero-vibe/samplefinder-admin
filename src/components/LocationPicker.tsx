import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import { Icon } from '@iconify/react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon in react-leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

interface LocationPickerProps {
  latitude: string
  longitude: string
  onLocationChange: (lat: string, lng: string) => void
  address?: string
}

// Component to handle map clicks and update position
function LocationMarker({ 
  position, 
  setPosition 
}: { 
  position: [number, number] | null
  setPosition: (pos: [number, number]) => void 
}) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
    },
  })

  return position ? <Marker position={position} /> : null
}

// Component to update map view when position changes externally
function MapUpdater({ position }: { position: [number, number] | null }) {
  const map = useMap()
  
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom())
    }
  }, [position, map])
  
  return null
}

const LocationPicker = ({ latitude, longitude, onLocationChange, address }: LocationPickerProps) => {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const mapRef = useRef<L.Map | null>(null)

  // Default center (New York City)
  const defaultCenter: [number, number] = [40.7128, -74.0060]

  // Initialize position from props
  useEffect(() => {
    if (latitude && longitude) {
      const lat = parseFloat(latitude)
      const lng = parseFloat(longitude)
      if (!isNaN(lat) && !isNaN(lng)) {
        setPosition([lat, lng])
      }
    }
  }, [latitude, longitude])

  // Update parent when position changes
  const handlePositionChange = (newPosition: [number, number]) => {
    setPosition(newPosition)
    onLocationChange(newPosition[0].toString(), newPosition[1].toString())
  }

  // Geocode address using Nominatim (OpenStreetMap)
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('Please enter an address to search')
      return
    }

    setIsSearching(true)
    setSearchError('')

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      )
      const data = await response.json()

      if (data && data.length > 0) {
        const { lat, lon } = data[0]
        const newPosition: [number, number] = [parseFloat(lat), parseFloat(lon)]
        handlePositionChange(newPosition)
        setSearchError('')
      } else {
        setSearchError('Location not found. Please try a different search.')
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      setSearchError('Failed to search location. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  // Search on Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  // Use current location
  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPosition: [number, number] = [
            position.coords.latitude,
            position.coords.longitude
          ]
          handlePositionChange(newPosition)
        },
        (error) => {
          console.error('Geolocation error:', error)
          setSearchError('Unable to get current location. Please enable location services.')
        }
      )
    } else {
      setSearchError('Geolocation is not supported by your browser.')
    }
  }

  // Geocode from address prop if provided
  useEffect(() => {
    if (address && !latitude && !longitude) {
      setSearchQuery(address)
    }
  }, [address, latitude, longitude])

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search for an address or place..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
          />
          <Icon 
            icon="mdi:magnify" 
            className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" 
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSearching ? (
            <>
              <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Icon icon="mdi:magnify" className="w-5 h-5" />
              Search
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          title="Use my current location"
        >
          <Icon icon="mdi:crosshairs-gps" className="w-5 h-5" />
          My Location
        </button>
      </div>

      {/* Error Message */}
      {searchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <Icon icon="mdi:alert-circle" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{searchError}</p>
        </div>
      )}

      {/* Map */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <MapContainer
          center={position || defaultCenter}
          zoom={13}
          style={{ height: '400px', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={handlePositionChange} />
          <MapUpdater position={position} />
        </MapContainer>
      </div>

      {/* Coordinates Display */}
      {position && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm">
            <Icon icon="mdi:map-marker" className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800 font-medium">
              Selected Location: 
            </span>
            <span className="text-blue-700">
              {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-sm text-gray-700">
          <Icon icon="mdi:information" className="inline w-4 h-4 mr-1" />
          Click anywhere on the map to set the event location, or search for an address above.
        </p>
      </div>
    </div>
  )
}

export default LocationPicker
