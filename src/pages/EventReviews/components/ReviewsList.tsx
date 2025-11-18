import ReviewCard from './ReviewCard'

interface Reviewer {
  name: string
  initials: string
  email: string
  verified: boolean
}

interface Event {
  name: string
  brand: string
  location: string
  date: string
  time: string
}

interface Review {
  id: number
  reviewer: Reviewer
  event: Event
  rating: number
  sentiment: 'Positive' | 'Neutral' | 'Negative'
  sentimentColor: string
  reviewText: string
  helpfulCount: number
}

interface ReviewsListProps {
  reviews: Review[]
}

const ReviewsList = ({ reviews }: ReviewsListProps) => {
  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  )
}

export default ReviewsList

