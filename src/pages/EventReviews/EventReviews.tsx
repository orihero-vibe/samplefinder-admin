import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { DashboardLayout, ShimmerPage, DownloadModal } from '../../components'
import type { DownloadFormat } from '../../components'
import { EventReviewsHeader, SearchAndFilter, ReviewsList } from './components'
import { reviewsService, eventsService, clientsService, appUsersService, type ReviewDocument, type EventDocument, type ClientDocument } from '../../lib/services'
import { exportService } from '../../lib/exportService'
import { useNotificationStore } from '../../stores/notificationStore'
import { Query } from '../../lib/appwrite'

// UI Review interface
interface UIReview {
  id: string
  reviewer: {
    id?: string // user_profiles $id for link to profile
    name: string
    initials: string
    email: string
    verified: boolean
  }
  event: {
    id?: string
    name: string
    brand: string
    brandId?: string
    location: string
    date: string
    time: string
    endTime?: string
  }
  rating: number
  sentiment: 'Positive' | 'Neutral' | 'Negative'
  sentimentColor: string
  reviewText: string
  helpfulCount: number
  isHidden: boolean
  reviewedAt: string // when the review was submitted
  answers?: string // e.g. liked (staff, swag, sample, etc.)
}

const EventReviews = () => {
  const { eventId } = useParams<{ eventId?: string }>()
  const [isLoading, setIsLoading] = useState(true)
  const [reviews, setReviews] = useState<UIReview[]>([])
  const { addNotification } = useNotificationStore()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(25)
  const [totalReviews, setTotalReviews] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [showHiddenReviews, setShowHiddenReviews] = useState(true) // Show all reviews including hidden by default for admin
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [sentimentFilter, setSentimentFilter] = useState('all')
  const [eventName, setEventName] = useState<string>('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)

  // Helper function to get initials from name
  const getInitials = (firstName?: string, lastName?: string, username?: string): string => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }
    if (firstName) {
      return firstName.charAt(0).toUpperCase()
    }
    if (username) {
      return username.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  // Helper function to get full name
  const getFullName = (firstName?: string, lastName?: string, username?: string): string => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`
    }
    if (firstName) {
      return firstName
    }
    if (lastName) {
      return lastName
    }
    return username || 'Anonymous User'
  }

  // Helper function to determine sentiment from rating
  const getSentiment = (rating: number): { sentiment: 'Positive' | 'Neutral' | 'Negative'; color: string } => {
    if (rating >= 4) {
      return { sentiment: 'Positive', color: 'bg-green-100 text-green-800' }
    } else if (rating === 3) {
      return { sentiment: 'Neutral', color: 'bg-gray-100 text-gray-800' }
    } else {
      return { sentiment: 'Negative', color: 'bg-red-100 text-red-800' }
    }
  }

  // Helper function to format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    return `${month} ${day}, ${year}`
  }

  // Helper function to format time
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`
  }

  // Fetch reviews from Appwrite with pagination
  const fetchReviews = async (page: number = currentPage) => {
    try {
      setIsLoading(true)
      
      // Build pagination queries
      const queries = [
        Query.orderDesc('$createdAt'),
        Query.limit(pageSize),
        Query.offset((page - 1) * pageSize),
      ]
      
      // Filter by event ID if provided
      if (eventId) {
        queries.push(Query.equal('event', eventId))
      }
      
      // Fetch reviews with relationships populated
      const reviewsData = await reviewsService.list(queries)
      
      // Extract pagination metadata
      const total = reviewsData.total
      const totalPagesCount = Math.ceil(total / pageSize)
      setTotalReviews(total)
      setTotalPages(totalPagesCount)
      
      // Handle edge case: if current page exceeds total pages, reset to last valid page or page 1
      if (totalPagesCount > 0 && page > totalPagesCount) {
        const lastValidPage = totalPagesCount
        setCurrentPage(lastValidPage)
        if (page !== lastValidPage) {
          return fetchReviews(lastValidPage)
        }
      } else if (totalPagesCount === 0) {
        setCurrentPage(1)
      }

      // Map reviews to UI format
      const mappedReviews = await Promise.all(
        reviewsData.documents.map(async (reviewDoc: ReviewDocument) => {
          // Fetch user data
          let reviewerName = 'Anonymous User'
          let reviewerEmail = ''
          let reviewerInitials = 'U'
          let verified = false

          if (reviewDoc.user) {
            try {
              const user = await appUsersService.getById(reviewDoc.user as string)
              if (user) {
                reviewerName = getFullName(
                  user.firstname as string | undefined,
                  user.lastname as string | undefined,
                  user.username as string | undefined
                )
                reviewerInitials = getInitials(
                  user.firstname as string | undefined,
                  user.lastname as string | undefined,
                  user.username as string | undefined
                )
                reviewerEmail = user.email || ''
                // Consider verified if user has email and is not blocked
                verified = !!user.email && !user.isBlocked
              }
            } catch (err) {
              console.error('Error fetching user:', err)
            }
          }

          // Fetch event data
          let eventName = 'Unknown Event'
          let eventBrand = 'Unknown Brand'
          let eventLocation = 'Unknown Location'
          let eventDate = ''
          let eventTime = ''
          let eventEndTime = ''
          let eventId: string | undefined = undefined
          let brandId: string | undefined = undefined

          if (reviewDoc.event) {
            try {
              const event = await eventsService.getById(reviewDoc.event as string) as EventDocument
              if (event) {
                eventId = event.$id
                eventName = event.name || 'Unknown Event'
                eventDate = formatDate(event.date)
                eventTime = formatTime(event.startTime || event.date)
                eventEndTime = event.endTime ? formatTime(event.endTime) : ''

                // Build full address from event document (address, city, state, optional zipCode)
                const locationParts = [event.address, event.city, event.state].filter(Boolean) as string[]
                if (event.zipCode) locationParts.push(event.zipCode)
                eventLocation = locationParts.length > 0 ? locationParts.join(', ') : 'Unknown Location'

                // Fetch client/brand name
                if (event.client) {
                  try {
                    brandId = event.client as string
                    const client = await clientsService.getById(event.client as string) as ClientDocument
                    if (client) {
                      eventBrand = client.name || 'Unknown Brand'
                    }
                  } catch (err) {
                    console.error('Error fetching client:', err)
                  }
                }
              }
            } catch (err) {
              console.error('Error fetching event:', err)
            }
          }

          const sentimentData = getSentiment(reviewDoc.rating || 0)

          // Format "liked" (answers) for display
          const liked = reviewDoc.liked as string | undefined
          const answersDisplay = liked
            ? String(liked)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
                .join(', ')
            : undefined

          return {
            id: reviewDoc.$id,
            reviewer: {
              id: reviewDoc.user as string | undefined,
              name: reviewerName,
              initials: reviewerInitials,
              email: reviewerEmail,
              verified,
            },
            event: {
              id: eventId,
              name: eventName,
              brand: eventBrand,
              brandId: brandId,
              location: eventLocation,
              date: eventDate,
              time: eventTime,
              endTime: eventEndTime || undefined,
            },
            rating: reviewDoc.rating || 0,
            sentiment: sentimentData.sentiment,
            sentimentColor: sentimentData.color,
            reviewText: reviewDoc.review || 'No review text provided.',
            helpfulCount: reviewDoc.helpfulCount || 0,
            isHidden: reviewDoc.isHidden || false,
            reviewedAt: `${formatDate(reviewDoc.$createdAt)} ${formatTime(reviewDoc.$createdAt)}`,
            answers: answersDisplay,
          } as UIReview
        })
      )

      setReviews(mappedReviews)
      setCurrentPage(page)
    } catch (err) {
      console.error('Error fetching reviews:', err)
      addNotification({
        type: 'error',
        title: 'Error Loading Reviews',
        message: 'Failed to load reviews. Please refresh the page.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchReviews(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Handle hide review
  const handleHideReview = async (reviewId: string) => {
    try {
      await reviewsService.hideReview(reviewId)
      // Update local state
      setReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId ? { ...review, isHidden: true } : review
        )
      )
      addNotification({
        type: 'success',
        title: 'Review Hidden',
        message: 'The review has been hidden from users.',
      })
    } catch (err) {
      console.error('Error hiding review:', err)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to hide the review. Please try again.',
      })
    }
  }

  // Handle unhide review
  const handleUnhideReview = async (reviewId: string) => {
    try {
      await reviewsService.unhideReview(reviewId)
      // Update local state
      setReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId ? { ...review, isHidden: false } : review
        )
      )
      addNotification({
        type: 'success',
        title: 'Review Restored',
        message: 'The review is now visible to users.',
      })
    } catch (err) {
      console.error('Error unhiding review:', err)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to restore the review. Please try again.',
      })
    }
  }

  // Handle delete review
  const handleDeleteReview = async (reviewId: string) => {
    setDeleteConfirmId(reviewId)
  }

  // Confirm delete
  const confirmDelete = async () => {
    if (!deleteConfirmId) return
    
    try {
      await reviewsService.delete(deleteConfirmId)
      // Remove from local state
      setReviews((prev) => prev.filter((review) => review.id !== deleteConfirmId))
      setTotalReviews((prev) => prev - 1)
      addNotification({
        type: 'success',
        title: 'Review Deleted',
        message: 'The review has been permanently deleted.',
      })
    } catch (err) {
      console.error('Error deleting review:', err)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete the review. Please try again.',
      })
    } finally {
      setDeleteConfirmId(null)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
    fetchReviews(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  // Fetch event name when viewing a single event (for header and download filename)
  useEffect(() => {
    if (!eventId) {
      setEventName('')
      return
    }
    let cancelled = false
    eventsService
      .getById(eventId)
      .then((event) => {
        if (!cancelled && event) {
          setEventName((event as EventDocument).name || '')
        }
      })
      .catch(() => {
        if (!cancelled) setEventName('')
      })
    return () => {
      cancelled = true
    }
  }, [eventId])

  const handleDownloadEventReport = async (format: DownloadFormat) => {
    if (!eventId) return
    setIsDownloading(true)
    try {
      const timestamp = new Date().toISOString().split('T')[0]
      const safeName = (eventName || 'event').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
      const ext = format === 'csv' ? 'csv' : 'pdf'
      const filename = `event_reviews_${safeName}_${timestamp}.${ext}`
      await exportService.exportEventReviewsReport(eventId, eventName || 'Event', filename, format)
      addNotification({
        type: 'success',
        title: 'Download complete',
        message: `Event report has been downloaded as ${ext.toUpperCase()}.`,
      })
      setIsDownloadModalOpen(false)
    } catch (err) {
      console.error('Error downloading event report:', err)
      addNotification({
        type: 'error',
        title: 'Download failed',
        message: err instanceof Error ? err.message : 'Failed to download event report.',
      })
    } finally {
      setIsDownloading(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <ShimmerPage />
      </DashboardLayout>
    )
  }

  // Filter reviews based on search term, rating, sentiment, and hidden status
  const displayedReviews = reviews.filter((review) => {
    // Filter by hidden status
    if (!showHiddenReviews && review.isHidden) {
      return false
    }

    // Filter by search term (search in review text, event name, brand name, and user name)
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      const matchesSearch =
        (review.reviewText?.toLowerCase().includes(searchLower) ?? false) ||
        (review.event?.name?.toLowerCase().includes(searchLower) ?? false) ||
        (review.event?.brand?.toLowerCase().includes(searchLower) ?? false) ||
        (review.event?.location?.toLowerCase().includes(searchLower) ?? false) ||
        (review.reviewer?.name?.toLowerCase().includes(searchLower) ?? false) ||
        (review.reviewer?.email?.toLowerCase().includes(searchLower) ?? false)
      
      if (!matchesSearch) {
        return false
      }
    }

    // Filter by rating
    if (ratingFilter && ratingFilter !== 'all') {
      const filterRating = parseInt(ratingFilter, 10)
      if (!isNaN(filterRating) && review.rating !== filterRating) {
        return false
      }
    }

    // Filter by sentiment
    if (sentimentFilter && sentimentFilter !== 'all') {
      if (review.sentiment !== sentimentFilter) {
        return false
      }
    }

    return true
  })

  const hiddenCount = reviews.filter((review) => review.isHidden).length

  return (
    <DashboardLayout>
      <div className="p-8">
        <EventReviewsHeader
          eventId={eventId}
          eventName={eventName}
          onDownloadClick={() => setIsDownloadModalOpen(true)}
          isDownloading={isDownloading}
        />
        <SearchAndFilter
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          ratingFilter={ratingFilter}
          onRatingFilterChange={setRatingFilter}
          sentimentFilter={sentimentFilter}
          onSentimentFilterChange={setSentimentFilter}
        />
        
        {/* Moderation Controls */}
        <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {hiddenCount > 0 && (
                <span className="font-medium text-yellow-700">
                  {hiddenCount} hidden review{hiddenCount !== 1 ? 's' : ''}
                </span>
              )}
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showHiddenReviews}
              onChange={(e) => setShowHiddenReviews(e.target.checked)}
              className="w-4 h-4 text-[#1D0A74] bg-gray-100 border-gray-300 rounded focus:ring-[#1D0A74] focus:ring-2"
            />
            <span className="text-sm text-gray-700">Show hidden reviews</span>
          </label>
        </div>

        <ReviewsList
          reviews={displayedReviews}
          currentPage={currentPage}
          totalPages={totalPages}
          totalReviews={totalReviews}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onHideReview={handleHideReview}
          onUnhideReview={handleUnhideReview}
          onDeleteReview={handleDeleteReview}
        />
      </div>

      {/* Download Event Report Modal (CSV / PDF) */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => !isDownloading && setIsDownloadModalOpen(false)}
        onDownload={handleDownloadEventReport}
        isLoading={isDownloading}
        title="Download Event Report"
        description="Choose a file format to download the event reviews report."
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Review
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to permanently delete this review? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default EventReviews

