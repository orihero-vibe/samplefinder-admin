import { useState } from 'react'
import { Icon } from '@iconify/react'
import DateFilterModal from '../../Dashboard/components/DateFilterModal'

interface SearchAndFilterProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  dateRange: { start: Date | null; end: Date | null }
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void
}

const SearchAndFilter = ({
  searchQuery,
  onSearchChange,
  dateRange,
  onDateRangeChange,
}: SearchAndFilterProps) => {
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)

  const formatDateRange = () => {
    if (!dateRange.start || !dateRange.end) {
      return 'Select Date Range'
    }
    const start = dateRange.start.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
    const end = dateRange.end.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
    return `${start} - ${end}`
  }

  return (
    <>
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
              placeholder="Search by report name"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setIsDateFilterOpen(true)}
                className={`px-4 py-2 border rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                  dateRange.start && dateRange.end
                    ? 'border-[#1D0A74] bg-[#1D0A74]/5 text-[#1D0A74] font-medium'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                title="Set date range for exported report data"
              >
                {formatDateRange()}
                <Icon icon="mdi:calendar" className="w-5 h-5" />
              </button>
              {dateRange.start && dateRange.end && (
                <button
                  onClick={() => onDateRangeChange({ start: null, end: null })}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
                  title="Clear date range"
                >
                  <Icon icon="mdi:close" className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>
            {dateRange.start && dateRange.end && (
              <p className="text-xs text-gray-500 italic">
                Date range will be applied when exporting reports
              </p>
            )}
          </div>
        </div>
      </div>

      <DateFilterModal
        isOpen={isDateFilterOpen}
        onClose={() => setIsDateFilterOpen(false)}
        onSelect={(startDate, endDate) => {
          onDateRangeChange({ start: startDate, end: endDate })
        }}
        initialStartDate={dateRange.start}
        initialEndDate={dateRange.end}
      />
    </>
  )
}

export default SearchAndFilter

