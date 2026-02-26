import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { formatDateInAppTimezone } from '../../../lib/dateUtils'

interface SearchAndFilterProps {
  onDateFilterClick: () => void
  dateRange: { start: Date | null; end: Date | null }
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  sortBy: string
  onSortByChange: (value: string) => void
  appTimezone: string
}

const SearchAndFilter = ({
  onDateFilterClick,
  dateRange,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  appTimezone,
}: SearchAndFilterProps) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm)

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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="mdi:filter" className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Search & Filter</h2>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Icon
            icon="mdi:magnify"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by event name, city, address, state, or brand"
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="in_active">In Active</option>
          <option value="hidden">Hidden</option>
          <option value="archived">Archived</option>
        </select>
        <button
          onClick={onDateFilterClick}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
        >
          <Icon icon="mdi:calendar" className="w-5 h-5" />
          {dateRange.start && dateRange.end
            ? `${formatDateInAppTimezone(dateRange.start.toISOString(), appTimezone, 'medium')} - ${formatDateInAppTimezone(dateRange.end.toISOString(), appTimezone, 'medium')}`
            : 'Select Date'}
        </button>
        <select
          value={sortBy}
          onChange={handleSortChange}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
        >
          <option value="date-asc">Sort by: Date (Ascending)</option>
          <option value="date-desc">Sort by: Date (Descending)</option>
          <option value="name-asc">Sort by: Name (Ascending)</option>
          <option value="name-desc">Sort by: Name (Descending)</option>
          <option value="brand-asc">Sort by: Brand (Ascending)</option>
          <option value="brand-desc">Sort by: Brand (Descending)</option>
        </select>
      </div>
    </div>
  )
}

export default SearchAndFilter

