import { useState } from 'react'
import { Icon } from '@iconify/react'
import DateFilterModal from '../../Dashboard/components/DateFilterModal'
import { useTimezoneStore } from '../../../stores/timezoneStore'
import { formatDateInAppTimezone } from '../../../lib/dateUtils'

interface DateRangeFilterProps {
  dateRange: { start: Date | null; end: Date | null }
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void
}

const DateRangeFilter = ({ dateRange, onDateRangeChange }: DateRangeFilterProps) => {
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const { appTimezone } = useTimezoneStore()

  const formatDateRange = () => {
    if (!dateRange.start || !dateRange.end) {
      return 'Select Date Range'
    }

    const start = formatDateInAppTimezone(dateRange.start.toISOString(), appTimezone, 'short')
    const end = formatDateInAppTimezone(dateRange.end.toISOString(), appTimezone, 'short')
    return `${start} - ${end}`
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-end gap-2">
        <button
          onClick={() => setIsDateFilterOpen(true)}
          className={`h-10 px-4 border rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
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
            className="h-10 px-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
            title="Clear date range"
          >
            <Icon icon="mdi:close" className="w-5 h-5 text-gray-600" />
          </button>
        )}
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

export default DateRangeFilter
