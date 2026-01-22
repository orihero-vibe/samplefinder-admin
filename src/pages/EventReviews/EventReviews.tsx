import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { DashboardLayout, ShimmerPage } from '../../components'
import { EventReviewsHeader, SearchAndFilter, ReviewsList } from './components'
import { reviewsService, eventsService, clientsService, appUsersService, type ReviewDocument, type EventDocument, type ClientDocument } from '../../lib/services'
import { useNotificationStore } from '../../stores/notificationStore'
import { Query } from '../../lib/appwrite'

// UI Review interface
interface UIReview {
  id: string
  reviewer: {
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
  }
  rating: number
  sentiment: 'Positive' | 'Neutral' | 'Negative'
  sentimentColor: string
  reviewText: string
  helpfulCount: number
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
        queries.push(Query.equal('event', [eventId]))
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
                reviewerName = getFullName(user.firstname, user.lastname, user.username)
                reviewerInitials = getInitials(user.firstname, user.lastname, user.username)
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
                
                // Build location string
                const locationParts = []
                if (event.city) locationParts.push(event.city)
                if (event.state) locationParts.push(event.state)
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

          return {
            id: reviewDoc.$id,
            reviewer: {
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
            },
            rating: reviewDoc.rating || 0,
            sentiment: sentimentData.sentiment,
            sentimentColor: sentimentData.color,
            reviewText: reviewDoc.review || 'No review text provided.',
            helpfulCount: reviewDoc.helpfulCount || 0,
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

  useEffect(() => {
    setCurrentPage(1) // Reset to first page when eventId changes
    fetchReviews(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  if (isLoading) {
    return (
      <DashboardLayout>
        <ShimmerPage />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <EventReviewsHeader />
        <SearchAndFilter />
        <ReviewsList
          reviews={reviews}
          currentPage={currentPage}
          totalPages={totalPages}
          totalReviews={totalReviews}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>
    </DashboardLayout>
  )
}

export default EventReviews

