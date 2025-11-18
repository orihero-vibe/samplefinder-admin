import { Icon } from '@iconify/react'

interface SearchAndFilterProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  tierFilter: string
  onTierFilterChange: (value: string) => void
  sortBy: string
  onSortByChange: (value: string) => void
}

const SearchAndFilter = ({
  searchQuery,
  onSearchChange,
  tierFilter,
  onTierFilterChange,
  sortBy,
  onSortByChange,
}: SearchAndFilterProps) => {
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
            placeholder="Search by name or e-mail"
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
          <option>All Tiers</option>
          <option>Tier 1</option>
          <option>Tier 2</option>
          <option>Tier 3</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
        >
          <option>Sort by: Date</option>
          <option>Sort by: Name</option>
          <option>Sort by: Points</option>
        </select>
      </div>
    </div>
  )
}

export default SearchAndFilter

