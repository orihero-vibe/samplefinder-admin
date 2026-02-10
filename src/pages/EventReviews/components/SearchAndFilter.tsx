import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'

interface SearchAndFilterProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  ratingFilter: string
  onRatingFilterChange: (value: string) => void
  sentimentFilter: string
  onSentimentFilterChange: (value: string) => void
}

const SearchAndFilter = ({
  searchTerm,
  onSearchChange,
  ratingFilter,
  onRatingFilterChange,
  sentimentFilter,
  onSentimentFilterChange,
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

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Icon
            icon="mdi:magnify"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search reviews, events, brands, or users..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Icon icon="mdi:star" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <select
            value={ratingFilter}
            onChange={(e) => onRatingFilterChange(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent appearance-none bg-white"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
        <div className="relative">
          <Icon icon="mdi:filter" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          <select
            value={sentimentFilter}
            onChange={(e) => onSentimentFilterChange(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent appearance-none bg-white"
          >
            <option value="all">All Sentiment</option>
            <option value="Positive">Positive</option>
            <option value="Neutral">Neutral</option>
            <option value="Negative">Negative</option>
          </select>
        </div>
      </div>
    </div>
  )
}

export default SearchAndFilter

