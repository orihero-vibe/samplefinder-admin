import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import StarRating from './StarRating'

interface Reviewer {
  name: string
  initials: string
  email: string
  verified: boolean
}

interface Event {
  id?: string
  name: string
  brand: string
  brandId?: string
  location: string
  date: string
  time: string
}

interface Review {
  id: string
  reviewer: Reviewer
  event: Event
  rating: number
  sentiment: 'Positive' | 'Neutral' | 'Negative'
  sentimentColor: string
  reviewText: string
  helpfulCount: number
}

interface ReviewCardProps {
  review: Review
}

const ReviewCard = ({ review }: ReviewCardProps) => {
  const navigate = useNavigate()

  const handleEventClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (review.event.id) {
      navigate(`/event-reviews/${review.event.id}`)
    }
  }

  const handleBrandClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (review.event.brandId) {
      // Navigate to clients-brands page - if there's a details page later, we can update this
      navigate('/clients-brands')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Reviewer Info and Rating Row */}
      <div className="flex items-start justify-between mb-4">
        {/* Reviewer Info */}
        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-[#1D0A74] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {review.reviewer.initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{review.reviewer.name}</h3>
              {review.reviewer.verified && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                  Verified
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{review.reviewer.email}</p>
          </div>
        </div>

        {/* Rating and Sentiment */}
        <div className="flex flex-col items-end gap-2">
          <StarRating rating={review.rating} />
          <div className="flex items-center gap-2">
            {review.sentiment === 'Positive' && (
              <Icon icon="mdi:thumb-up" className="w-4 h-4 text-green-600" />
            )}
            {review.sentiment === 'Negative' && (
              <Icon icon="mdi:thumb-down" className="w-4 h-4 text-red-600" />
            )}
            {review.sentiment === 'Neutral' && (
              <Icon icon="mdi:minus-circle" className="w-4 h-4 text-gray-600" />
            )}
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${review.sentimentColor}`}>
              {review.sentiment}
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-4"></div>

      {/* Event Details */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:calendar" className="w-4 h-4" />
          {review.event.id ? (
            <button
              onClick={handleEventClick}
              className="font-medium text-[#1D0A74] hover:text-[#15065c] hover:underline transition-colors cursor-pointer"
            >
              {review.event.name}
            </button>
          ) : (
            <span className="font-medium">{review.event.name}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Icon icon="mdi:share-variant" className="w-4 h-4" />
          {review.event.brandId ? (
            <button
              onClick={handleBrandClick}
              className="text-[#1D0A74] hover:text-[#15065c] hover:underline transition-colors cursor-pointer"
            >
              {review.event.brand}
            </button>
          ) : (
            <span>{review.event.brand}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Icon icon="mdi:map-marker" className="w-4 h-4" />
          <span>{review.event.location}</span>
        </div>
        <span className="text-gray-400">
          {review.event.date}, {review.event.time}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 mb-4"></div>

      {/* Review Text */}
      <p className="text-gray-700 mb-4 leading-relaxed">{review.reviewText}</p>

      {/* Footer */}
      <div className="flex items-center pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1 text-gray-600">
          <Icon icon="mdi:thumb-up" className="w-4 h-4" />
          <span className="text-sm">{review.helpfulCount} found helpful</span>
        </div>
      </div>
    </div>
  )
}

export default ReviewCard

