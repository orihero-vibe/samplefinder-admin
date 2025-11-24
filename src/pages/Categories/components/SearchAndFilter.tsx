import { Icon } from '@iconify/react'

interface SearchAndFilterProps {
  searchTerm: string
  onSearchChange: (term: string) => void
}

const SearchAndFilter = ({ searchTerm, onSearchChange }: SearchAndFilterProps) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon icon="mdi:filter" className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Search & Filter</h2>
      </div>
      <div className="flex-1 relative">
        <Icon
          icon="mdi:magnify"
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search by category title..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
        />
      </div>
    </div>
  )
}

export default SearchAndFilter

