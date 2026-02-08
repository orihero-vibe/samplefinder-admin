import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon } from '@iconify/react'
import { locationsService, type LocationDocument } from '../lib/services'
import { useNotificationStore } from '../stores/notificationStore'
import AddLocationModal from '../pages/Locations/components/AddLocationModal'

// Helper function to extract error message from Appwrite error
const extractErrorMessage = (error: unknown): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'An unexpected error occurred. Please try again.'
}

interface LocationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onLocationSelect: (location: LocationDocument) => void
  placeholder?: string
  required?: boolean
  className?: string
}

const LocationAutocomplete = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = 'Search for a location...',
  required = false,
  className = '',
}: LocationAutocompleteProps) => {
  const [locations, setLocations] = useState<LocationDocument[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { addNotification } = useNotificationStore()

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch locations from database
  const fetchLocations = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setLocations([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await locationsService.search(searchTerm.trim())
      setLocations(result.documents)
      setIsOpen(result.documents.length > 0 || searchTerm.trim().length > 0)
    } catch (error) {
      console.error('Error fetching locations:', error)
      setLocations([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (newValue.trim().length >= 1) {
      debounceTimerRef.current = setTimeout(() => {
        fetchLocations(newValue)
      }, 300)
    } else {
      setLocations([])
      setIsOpen(false)
    }
  }

  // Handle location selection
  const handleSelect = (location: LocationDocument) => {
    // Format display value: "Location Name - Address, City, State ZIP"
    const displayValue = location.name
      ? `${location.name} - ${location.address}, ${location.city}, ${location.state} ${location.zipCode}`
      : `${location.address}, ${location.city}, ${location.state} ${location.zipCode}`
    
    onChange(displayValue)
    onLocationSelect(location)
    setIsOpen(false)
    setLocations([])
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Clear input
  const handleClear = () => {
    onChange('')
    setLocations([])
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // Handle location creation
  const handleCreateLocation = async (locationData: {
    name: string
    address: string
    city: string
    state: string
    zipCode: string
    latitude: string
    longitude: string
  }) => {
    try {
      // Create location in database
      const newLocation = await locationsService.create({
        name: locationData.name,
        address: locationData.address,
        city: locationData.city,
        state: locationData.state,
        zipCode: locationData.zipCode,
        location: locationData.latitude && locationData.longitude
          ? [parseFloat(locationData.longitude), parseFloat(locationData.latitude)]
          : undefined,
      })

      // Show success notification
      addNotification({
        type: 'success',
        title: 'Location Created',
        message: 'The location has been successfully created.',
      })

      // Select the newly created location
      handleSelect(newLocation)
      setIsAddLocationModalOpen(false)
    } catch (error) {
      console.error('Error creating location:', error)
      
      // Show error notification
      addNotification({
        type: 'error',
        title: 'Failed to Create Location',
        message: extractErrorMessage(error),
      })
      
      // Re-throw to let modal handle it (keep modal open)
      throw error
    }
  }

  return (
    <>
      <div className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={() => {
              if (value.trim().length > 0 || locations.length > 0) {
                setIsOpen(true)
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            required={required}
            className={`w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent ${className}`}
            autoComplete="off"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isLoading && (
              <Icon icon="mdi:loading" className="w-5 h-5 text-gray-400 animate-spin" />
            )}
            {value && !isLoading && (
              <button
                type="button"
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Icon icon="mdi:close" className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Locations Dropdown */}
        {isOpen && (locations.length > 0 || value.trim().length > 0) && (
          <div
            ref={dropdownRef}
            className="absolute z-[9999] w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {locations.length > 0 ? (
              <>
                {locations.map((location) => (
                  <button
                    key={location.$id}
                    type="button"
                    onClick={() => handleSelect(location)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-start gap-3 border-b border-gray-100 last:border-b-0"
                  >
                    <Icon icon="mdi:map-marker" className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      {location.name && (
                        <div className="font-semibold text-gray-900 text-sm mb-1">
                          {location.name}
                        </div>
                      )}
                      <div className="text-sm text-gray-600">
                        {location.address}, {location.city}, {location.state} {location.zipCode}
                      </div>
                    </div>
                  </button>
                ))}
                {/* Create New Location Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setIsAddLocationModalOpen(true)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-[#1D0A74]/5 focus:bg-[#1D0A74]/5 focus:outline-none flex items-center gap-3 border-t-2 border-gray-200 bg-gray-50"
                >
                  <Icon icon="mdi:plus-circle" className="w-5 h-5 text-[#1D0A74] flex-shrink-0" />
                  <span className="font-semibold text-[#1D0A74] text-sm">
                    Create New Location
                  </span>
                </button>
              </>
            ) : value.trim().length > 0 && !isLoading ? (
              <div className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setIsAddLocationModalOpen(true)
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-[#1D0A74]/5 focus:bg-[#1D0A74]/5 focus:outline-none flex items-center gap-3 border border-[#1D0A74] rounded-lg bg-white"
                >
                  <Icon icon="mdi:plus-circle" className="w-5 h-5 text-[#1D0A74] flex-shrink-0" />
                  <span className="font-semibold text-[#1D0A74] text-sm">
                    Create New Location
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Add Location Modal */}
      <AddLocationModal
        isOpen={isAddLocationModalOpen}
        onClose={() => setIsAddLocationModalOpen(false)}
        onSave={handleCreateLocation}
      />
    </>
  )
}

export default LocationAutocomplete
