import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'

const EventReviewsHeader = () => {
  return (
    <div className="mb-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors no-underline"
      >
        <Icon icon="mdi:arrow-left" className="w-5 h-5" />
        <span>Back to Dashboard</span>
      </Link>
      <h1 className="text-3xl font-bold text-gray-900">Event Reviews</h1>
    </div>
  )
}

export default EventReviewsHeader

