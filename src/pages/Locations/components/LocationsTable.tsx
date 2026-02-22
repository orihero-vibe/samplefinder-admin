import { Icon } from '@iconify/react'
import { Pagination } from '../../../components'

interface Location {
  id?: string
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  location?: [number, number] // [longitude, latitude]
}

interface LocationsTableProps {
  locations: Location[]
  isLoading?: boolean
  onEditClick: (location: Location) => void
  onDeleteClick: (location: Location) => void
  currentPage?: number
  totalPages?: number
  totalLocations?: number
  pageSize?: number
  onPageChange?: (page: number) => void
}

const LocationsTable = ({
  locations,
  isLoading = false,
  onEditClick,
  onDeleteClick,
  currentPage = 1,
  totalPages = 0,
  totalLocations = 0,
  pageSize = 25,
  onPageChange,
}: LocationsTableProps) => {
  const formatCoordinates = (location?: [number, number]): string => {
    if (!location || location.length !== 2) return 'N/A'
    return `${location[1].toFixed(6)}, ${location[0].toFixed(6)}`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Location Name
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Address
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  City
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  State
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  ZIP Code
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Coordinates
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Icon icon="mdi:loading" className="w-6 h-6 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : locations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  No locations found. Click "Add Location" to create one.
                </td>
              </tr>
            ) : (
              locations.map((location) => (
                <tr key={location.id || location.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {location.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {location.address}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.city}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.state}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.zipCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono text-xs">
                    {formatCoordinates(location.location)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditClick(location)
                        }}
                        className="hover:text-blue-600 transition-colors"
                      >
                        <Icon icon="mdi:pencil" className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteClick(location)
                        }}
                        className="hover:text-red-600 transition-colors"
                      >
                        <Icon icon="mdi:trash-can" className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {onPageChange && totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalLocations}
          pageSize={pageSize}
          itemLabel="locations"
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

export default LocationsTable
