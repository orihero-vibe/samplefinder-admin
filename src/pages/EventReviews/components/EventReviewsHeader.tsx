import { Link } from 'react-router-dom'
import { Icon } from '@iconify/react'

interface EventReviewsHeaderProps {
  eventId?: string
  eventName?: string
  onDownloadClick?: () => void
  isDownloading?: boolean
}

const EventReviewsHeader = ({ eventId, eventName, onDownloadClick, isDownloading }: EventReviewsHeaderProps) => {
  return (
    <div className="mb-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors no-underline"
      >
        <Icon icon="mdi:arrow-left" className="w-5 h-5" />
        <span>Back to Dashboard</span>
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">
          {eventId ? (eventName ? `Event Reviews: ${eventName}` : 'Event Reviews') : 'Event Reviews'}
        </h1>
        {eventId && onDownloadClick && (
          <button
            type="button"
            onClick={onDownloadClick}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1D0A74] text-white font-medium rounded-lg hover:bg-[#15065c] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <Icon icon="mdi:download" className="w-5 h-5" />
            <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default EventReviewsHeader

