import { Icon } from '@iconify/react'
import type { TierDocument } from '../../../lib/services'

interface SearchAndFilterProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  tierFilter: string
  onTierFilterChange: (value: string) => void
  tiers: TierDocument[]
  sortBy: string
  onSortByChange: (value: string) => void
  sortOrder: 'asc' | 'desc'
  onSortOrderChange: (order: 'asc' | 'desc') => void
}

const SearchAndFilter = ({
  searchQuery,
  onSearchChange,
  tierFilter,
  onTierFilterChange,
  tiers,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: SearchAndFilterProps) => {
  const getSortDisplayText = () => {
    const sortLabels: Record<string, string> = {
      createdAt: 'Date',
      name: 'Name',
      points: 'Points',
      events: 'Check Ins',
      reviews: 'Reviews',
      email: 'Email',
      tierLevel: 'Tier Level',
      dob: 'Date of Birth',
    }
    return `Sort by: ${sortLabels[sortBy] || 'Date'}`
  }
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="mdi:menu" className="w-5 h-5 text-gray-600" />
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
            placeholder="Search by name, username, email, or phone"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => onTierFilterChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
        >
          <option value="All Tiers">All Tiers</option>
          {tiers.map((tier) => {
            const name = String(tier.name ?? '').trim()
            if (!name) return null
            return (
              <option key={tier.$id} value={name}>
                {name}
              </option>
            )
          })}
        </select>
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
        >
          <option value="createdAt">Sort by: Date</option>
          <option value="name">Sort by: Name</option>
          <option value="email">Sort by: Email</option>
          <option value="tierLevel">Sort by: Tier Level</option>
          <option value="dob">Sort by: Date of Birth</option>
          <option value="points">Sort by: Points</option>
          <option value="events">Sort by: Check Ins</option>
          <option value="reviews">Sort by: Reviews</option>
        </select>
        <button
          onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
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

