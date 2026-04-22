import { useState, useRef, useEffect } from 'react'
import { Icon } from '@iconify/react'

export interface DropdownOption {
  value: string
  label: string
  category?: string
}

interface MultiSelectDropdownProps {
  options: DropdownOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  maxHeight?: string
}

const MultiSelectDropdown = ({
  options,
  selectedValues,
  onChange,
  placeholder = 'Select columns...',
  searchPlaceholder = 'Search columns...',
  className = '',
  maxHeight = '400px',
}: MultiSelectDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.category && option.category.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Group options by category
  const groupedOptions = filteredOptions.reduce((acc, option) => {
    const category = option.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(option)
    return acc
  }, {} as Record<string, DropdownOption[]>)

  const handleToggleOption = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value]
    onChange(newValues)
  }

  const handleSelectAll = () => {
    onChange(options.map(opt => opt.value))
  }

  const handleClearAll = () => {
    onChange([])
  }

  const getSelectedLabel = () => {
    if (selectedValues.length === 0) return placeholder
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.value === selectedValues[0])
      return option?.label || placeholder
    }
    return `${selectedValues.length} columns selected`
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
      >
        <div className="flex items-center justify-between">
          <span className="text-gray-700">{getSelectedLabel()}</span>
          <Icon 
            icon={isOpen ? "mdi:chevron-up" : "mdi:chevron-down"} 
            className="text-gray-400 text-xl"
          />
        </div>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Icon 
                icon="mdi:magnify" 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="px-3 py-2 border-b border-gray-200 flex gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
            >
              Clear All
            </button>
            <span className="ml-auto text-sm text-gray-500">
              {selectedValues.length} of {options.length} selected
            </span>
          </div>

          {/* Options list */}
          <div 
            className="overflow-y-auto"
            style={{ maxHeight }}
          >
            {Object.keys(groupedOptions).length === 0 ? (
              <div className="px-3 py-4 text-gray-500 text-center">
                No columns found
              </div>
            ) : (
              Object.entries(groupedOptions).map(([category, categoryOptions]) => (
                <div key={category}>
                  {/* Category header */}
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">{category}</span>
                  </div>
                  {/* Category options */}
                  {categoryOptions.map(option => (
                    <label
                      key={option.value}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedValues.includes(option.value)}
                        onChange={() => handleToggleOption(option.value)}
                        className="mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiSelectDropdown