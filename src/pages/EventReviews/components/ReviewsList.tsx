import ReviewCard from './ReviewCard'
import { Pagination } from '../../../components'

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
  endTime?: string
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
  isHidden?: boolean
}

interface ReviewsListProps {
  reviews: Review[]
  currentPage?: number
  totalPages?: number
  totalReviews?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onHideReview?: (reviewId: string) => void
  onUnhideReview?: (reviewId: string) => void
  onDeleteReview?: (reviewId: string) => void
}

const ReviewsList = ({
  reviews,
  currentPage = 1,
  totalPages = 0,
  totalReviews = 0,
  pageSize = 25,
  onPageChange,
  onHideReview,
  onUnhideReview,
  onDeleteReview,
}: ReviewsListProps) => {
  return (
    <div>
      <div className="space-y-4 mb-6">
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No reviews found.
          </div>
        ) : (
          reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onHide={onHideReview}
              onUnhide={onUnhideReview}
              onDelete={onDeleteReview}
            />
          ))
        )}
      </div>
      {/* Pagination */}
      {onPageChange && totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalReviews}
          pageSize={pageSize}
          itemLabel="reviews"
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

export default ReviewsList

