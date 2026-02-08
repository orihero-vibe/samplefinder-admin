import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'

interface SearchAndFilterProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  sortBy: string
  onSortByChange: (value: string) => void
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (order: 'asc' | 'desc') => void
}

const SearchAndFilter = ({
  searchTerm,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: SearchAndFilterProps) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm || '')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearchTerm)
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [localSearchTerm, onSearchChange])

  // Sync local search term with prop
  useEffect(() => {
    setLocalSearchTerm(searchTerm)
  }, [searchTerm])

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onSortByChange(value)
  }

  const handleSortOrderToggle = () => {
    onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  const getSortDisplayText = () => {
    const sortLabels: Record<string, string> = {
      name: 'Location Name',
      $createdAt: 'Created Date',
    }
    const orderIcon = sortOrder === 'asc' ? '↑' : '↓'
    return `${sortLabels[sortBy] || 'Sort'} ${orderIcon}`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="mdi:filter" className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Search & Sort</h2>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Icon
            icon="mdi:magnify"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by location name, address, city, state, or ZIP code"
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
          />
        </div>
        <select
          value={sortBy}
          onChange={handleSortChange}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
        >
          <option value="$createdAt">Sort by: Created Date</option>
          <option value="name">Sort by: Location Name</option>
        </select>
        <button
          onClick={handleSortOrderToggle}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
          title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
        >
          <Icon
            icon={sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'}
            className="w-5 h-5"
          />
          {getSortDisplayText()}
        </button>
      </div>
    </div>
  )
}

export default SearchAndFilter
