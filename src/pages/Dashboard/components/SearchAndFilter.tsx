import { Icon } from '@iconify/react'

interface SearchAndFilterProps {
  onDateFilterClick: () => void
  dateRange: { start: Date | null; end: Date | null }
}

const SearchAndFilter = ({ onDateFilterClick, dateRange }: SearchAndFilterProps) => {
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
            placeholder="Search by name or e-mail"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
          />
        </div>
        <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent">
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
          <option>Archived</option>
        </select>
        <button
          onClick={onDateFilterClick}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
        >
          <Icon icon="mdi:calendar" className="w-5 h-5" />
          {dateRange.start && dateRange.end
            ? `${dateRange.start.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })} - ${dateRange.end.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}`
            : 'Select Date'}
        </button>
        <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent">
          <option>Sort by: Date</option>
          <option>Sort by: Name</option>
          <option>Sort by: Brand</option>
        </select>
      </div>
    </div>
  )
}

export default SearchAndFilter

