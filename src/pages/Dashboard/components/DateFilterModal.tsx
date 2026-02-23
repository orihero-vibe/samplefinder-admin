import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'

interface DateFilterModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (startDate: Date | null, endDate: Date | null) => void
  initialStartDate?: Date | null
  initialEndDate?: Date | null
}

const DateFilterModal = ({
  isOpen,
  onClose,
  onSelect,
  initialStartDate,
  initialEndDate,
}: DateFilterModalProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(initialStartDate || null)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(initialEndDate || null)
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)

  useEffect(() => {
    if (initialStartDate) {
      setSelectedStartDate(initialStartDate)
      setCurrentMonth(new Date(initialStartDate))
    }
    if (initialEndDate) {
      setSelectedEndDate(initialEndDate)
    }
  }, [initialStartDate, initialEndDate, isOpen])

  if (!isOpen) return null

  const daysOfWeek = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sat', 'Su']

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    // Adjust to start from Monday (0 = Monday, 6 = Sunday)
    const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1

    const days: (Date | null)[] = []

    // Add previous month's trailing days
    const prevMonth = new Date(year, month - 1, 0)
    const prevMonthDays = prevMonth.getDate()
    for (let i = adjustedStartingDay - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthDays - i))
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    // Add next month's leading days to fill the grid
    const remainingDays = 42 - days.length // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i))
    }

    return days
  }

  const formatDateRange = () => {
    if (!selectedStartDate && !selectedEndDate) {
      return 'Select date range'
    }
    if (selectedStartDate && !selectedEndDate) {
      return selectedStartDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
    if (selectedStartDate && selectedEndDate) {
      const start = selectedStartDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const end = selectedEndDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      return `${start} - ${end}`
    }
    return 'Select date range'
  }

  const isSameDay = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const isDateInRange = (date: Date) => {
    if (!selectedStartDate || !selectedEndDate) return false
    return date >= selectedStartDate && date <= selectedEndDate
  }

  const isDateInSelection = (date: Date) => {
    if (selectedStartDate && selectedEndDate) {
      return isDateInRange(date)
    }
    return isSameDay(date, selectedStartDate) || isSameDay(date, selectedEndDate)
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth() && date.getFullYear() === currentMonth.getFullYear()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return isSameDay(date, today)
  }

  const handleDateClick = (date: Date) => {
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      // Start new selection
      setSelectedStartDate(date)
      setSelectedEndDate(null)
    } else if (selectedStartDate && !selectedEndDate) {
      // Complete the range
      if (date < selectedStartDate) {
        setSelectedEndDate(selectedStartDate)
        setSelectedStartDate(date)
      } else {
        setSelectedEndDate(date)
      }
    }
  }

  const handleToday = () => {
    const today = new Date()
    setSelectedStartDate(today)
    setSelectedEndDate(today)
    setCurrentMonth(today)
  }

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const handleSelect = () => {
    // Single day: use same date for start and end so it applies
    const end = selectedEndDate ?? selectedStartDate
    onSelect(selectedStartDate, end)
    onClose()
  }

  const handleCancel = () => {
    setSelectedStartDate(initialStartDate || null)
    setSelectedEndDate(initialEndDate || null)
    onClose()
  }

  const handleClear = () => {
    setSelectedStartDate(null)
    setSelectedEndDate(null)
    onSelect(null, null)
    onClose()
  }

  const calendarDays = getDaysInMonth(currentMonth)
  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900">Select Date</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon icon="mdi:chevron-left" className="w-5 h-5 text-gray-600" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900">{monthYear}</h3>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon icon="mdi:chevron-right" className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Selected Date Range */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">{formatDateRange()}</p>
            <div className="flex gap-2">
              {(selectedStartDate || selectedEndDate) && (
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleToday}
                className="px-3 py-1.5 text-sm font-medium text-[#1D0A74] hover:bg-[#1D0A74]/10 rounded-lg transition-colors"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              if (!date) return <div key={index} className="aspect-square" />

              const isSelected = isDateInSelection(date)
              const isStart = isSameDay(date, selectedStartDate)
              const isEnd = isSameDay(date, selectedEndDate)
              const isInRange = selectedStartDate && selectedEndDate && isDateInRange(date)
              const isOtherMonth = !isCurrentMonth(date)
              const isHovered = hoveredDate && isSameDay(date, hoveredDate)

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(date)}
                  onMouseEnter={() => setHoveredDate(date)}
                  onMouseLeave={() => setHoveredDate(null)}
                  className={`
                    aspect-square flex items-center justify-center text-sm font-medium rounded-lg transition-colors
                    ${isOtherMonth ? 'text-gray-300' : 'text-gray-900'}
                    ${isToday(date) && !isSelected ? 'bg-blue-50 text-blue-600' : ''}
                    ${isSelected ? 'bg-[#1D0A74] text-white' : ''}
                    ${isInRange && !isStart && !isEnd ? 'bg-[#1D0A74]/10' : ''}
                    ${!isSelected && !isOtherMonth ? 'hover:bg-gray-100' : ''}
                    ${isHovered && !isSelected ? 'ring-2 ring-[#1D0A74] ring-offset-1' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 p-6 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            className="flex-1 px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  )
}

export default DateFilterModal

