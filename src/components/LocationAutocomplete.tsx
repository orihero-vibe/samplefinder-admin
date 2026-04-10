import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Icon } from '@iconify/react'
import { Query } from '../lib/appwrite'
import { locationsService, type LocationDocument } from '../lib/services'
import { useNotificationStore } from '../stores/notificationStore'
import AddLocationModal from '../pages/Locations/components/AddLocationModal'

const LOCATION_PICKER_PAGE_SIZE = 2000
const LOCATION_SEARCH_FIELDS = ['name', 'address', 'city', 'state', 'zipCode'] as const

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
  onAddLocationClick?: () => void // Optional callback for "Add Location" button
}

const LocationAutocomplete = ({
  value,
  onChange,
  onLocationSelect,
  placeholder = 'Search for a location...',
  required = false,
  className = '',
  onAddLocationClick,
}: LocationAutocompleteProps) => {
  const [pickableLocations, setPickableLocations] = useState<LocationDocument[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isPickerListLoading, setIsPickerListLoading] = useState(false)
  const [pickerListError, setPickerListError] = useState(false)
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pickListFetchedRef = useRef(false)
  const { addNotification } = useNotificationStore()

  const filteredLocations = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return pickableLocations
    return pickableLocations.filter((doc) =>
      LOCATION_SEARCH_FIELDS.some((field) => {
        const fieldValue = (doc as Record<string, unknown>)[field]
        return typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(q)
      })
    )
  }, [pickableLocations, value])

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

  const loadPickableLocations = useCallback(async () => {
    setIsPickerListLoading(true)
    setPickerListError(false)
    try {
      const result = await locationsService.list([
        Query.orderAsc('name'),
        Query.limit(LOCATION_PICKER_PAGE_SIZE),
      ])
      setPickableLocations(result.documents)
    } catch (error) {
      console.error('Error loading locations:', error)
      setPickableLocations([])
      setPickerListError(true)
    } finally {
      setIsPickerListLoading(false)
      pickListFetchedRef.current = true
    }
  }, [])

  const openDropdown = useCallback(async () => {
    if (!pickListFetchedRef.current) {
      await loadPickableLocations()
    }
    setIsOpen(true)
  }, [loadPickableLocations])

  // Handle input change — filter is client-side via filteredLocations
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setIsOpen(true)
  }

  // Handle location selection
  const handleSelect = (location: LocationDocument) => {
    const displayValue = location.name || `${location.address}, ${location.city}`

    onChange(displayValue)
    onLocationSelect(location)
    setIsOpen(false)
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
    setIsOpen(false)
    inputRef.current?.focus()
  }

  // Set custom validation message
  useEffect(() => {
    if (inputRef.current && required) {
      inputRef.current.setCustomValidity(
        value.trim() === '' ? 'Input required' : ''
      )
    }
  }, [value, required])

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

      addNotification({
        type: 'success',
        title: 'Location Created',
        message: 'The location has been successfully created.',
      })

      setPickableLocations((prev) => {
        const next = [...prev, newLocation]
        next.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        return next
      })
      handleSelect(newLocation)
      setIsAddLocationModalOpen(false)
    } catch (error) {
      console.error('Error creating location:', error)

      addNotification({
        type: 'error',
        title: 'Failed to Create Location',
        message: extractErrorMessage(error),
      })

      throw error
    }
  }

  const showDropdown =
    isOpen &&
    (isPickerListLoading ||
      pickerListError ||
      filteredLocations.length > 0 ||
      value.trim().length > 0 ||
      (pickableLocations.length === 0 && !isPickerListLoading))

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
              void openDropdown()
            }}
            onKeyDown={handleKeyDown}
            onInvalid={(e) => {
              const target = e.target as HTMLInputElement
              if (target.value.trim() === '') {
                target.setCustomValidity('Input required')
              } else {
                target.setCustomValidity('')
              }
            }}
            placeholder={placeholder}
            required={required}
            className={`w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent ${className}`}
            autoComplete="off"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isPickerListLoading && (
              <Icon icon="mdi:loading" className="w-5 h-5 text-gray-400 animate-spin" />
            )}
            {value && !isPickerListLoading && (
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

        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute z-[9999] w-full mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {isPickerListLoading && pickableLocations.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-600">Loading locations…</div>
            ) : pickerListError ? (
              <div className="px-4 py-3 text-sm text-red-600">Could not load locations. Try again.</div>
            ) : filteredLocations.length > 0 ? (
              <>
                {filteredLocations.map((location) => (
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
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    if (onAddLocationClick) {
                      onAddLocationClick()
                    } else {
                      setIsAddLocationModalOpen(true)
                    }
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-[#1D0A74]/5 focus:bg-[#1D0A74]/5 focus:outline-none flex items-center gap-3 border-t-2 border-gray-200 bg-gray-50"
                >
                  <Icon icon="mdi:plus-circle" className="w-5 h-5 text-[#1D0A74] flex-shrink-0" />
                  <span className="font-semibold text-[#1D0A74] text-sm">
                    Create New Location
                  </span>
                </button>
              </>
            ) : value.trim().length > 0 ? (
              <div className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    if (onAddLocationClick) {
                      onAddLocationClick()
                    } else {
                      setIsAddLocationModalOpen(true)
                    }
                  }}
                  className="w-full px-4 py-3 text-left hover:bg-[#1D0A74]/5 focus:bg-[#1D0A74]/5 focus:outline-none flex items-center gap-3 border border-[#1D0A74] rounded-lg bg-white"
                >
                  <Icon icon="mdi:plus-circle" className="w-5 h-5 text-[#1D0A74] flex-shrink-0" />
                  <span className="font-semibold text-[#1D0A74] text-sm">
                    Create New Location
                  </span>
                </button>
              </div>
            ) : pickableLocations.length === 0 ? (
              <div className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    if (onAddLocationClick) {
                      onAddLocationClick()
                    } else {
                      setIsAddLocationModalOpen(true)
                    }
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

      <AddLocationModal
        isOpen={isAddLocationModalOpen}
        onClose={() => setIsAddLocationModalOpen(false)}
        onSave={handleCreateLocation}
      />
    </>
  )
}

export default LocationAutocomplete
