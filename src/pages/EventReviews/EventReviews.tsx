import { useState, useEffect } from 'react'
import { DashboardLayout, ShimmerPage } from '../../components'
import { EventReviewsHeader, SearchAndFilter, ReviewsList } from './components'

const EventReviews = () => {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const reviews = [
    {
      id: 1,
      reviewer: {
        name: 'Sarah Johnson',
        initials: 'SJ',
        email: 'sarah.j@email.com',
        verified: true,
      },
      event: {
        name: 'Summer Beauty Launch',
        brand: 'Glossier',
        location: 'New York',
        date: 'Oct 26, 2025',
        time: '02:30 PM',
      },
      rating: 4.5,
      sentiment: 'Positive' as const,
      sentimentColor: 'bg-green-100 text-green-800',
      reviewText: "Absolutely loved this event! The product samples were amazing and the staff was so knowledgeable. Learned so much about skincare routines and got to try products I've been eyeing for months.",
      helpfulCount: 24,
    },
    {
      id: 2,
      reviewer: {
        name: 'Michael Chen',
        initials: 'MC',
        email: 'michael.c@email.com',
        verified: true,
      },
      event: {
        name: 'Fall Fragrance Event',
        brand: 'Chanel',
        location: 'Los Angeles',
        date: 'Oct 29, 2025',
        time: '10:15 AM',
      },
      rating: 4.5,
      sentiment: 'Positive' as const,
      sentimentColor: 'bg-green-100 text-green-800',
      reviewText: 'Great event overall. The venue was beautiful and the fragrance collection was impressive. Only downside was the long wait times at the sampling stations.',
      helpfulCount: 18,
    },
    {
      id: 3,
      reviewer: {
        name: 'Emily Rodriguez',
        initials: 'ER',
        email: 'emily.r@email.com',
        verified: true,
      },
      event: {
        name: 'Summer Beauty Launch',
        brand: 'Glossier',
        location: 'New York',
        date: 'Oct 26, 2025',
        time: '04:45 PM',
      },
      rating: 5,
      sentiment: 'Positive' as const,
      sentimentColor: 'bg-green-100 text-green-800',
      reviewText: "This was my first beauty event and it exceeded all expectations! The makeup artists were so talented and gave personalized recommendations. Can't wait for the next one!",
      helpfulCount: 31,
    },
    {
      id: 4,
      reviewer: {
        name: 'James Anderson',
        initials: 'JA',
        email: 'james.a@email.com',
        verified: true,
      },
      event: {
        name: 'Skincare Workshop',
        brand: 'The Ordinary',
        location: 'Chicago',
        date: 'Nov 3, 2025',
        time: '11:20 AM',
      },
      rating: 3,
      sentiment: 'Neutral' as const,
      sentimentColor: 'bg-gray-100 text-gray-800',
      reviewText: 'The workshop was informative but felt a bit rushed. Would have appreciated more time for Q&A. The product selection was good though.',
      helpfulCount: 12,
    },
    {
      id: 5,
      reviewer: {
        name: 'Jessica Taylor',
        initials: 'JT',
        email: 'jessica.t@email.com',
        verified: true,
      },
      event: {
        name: 'Skincare Workshop',
        brand: 'The Ordinary',
        location: 'Chicago',
        date: 'Nov 3, 2025',
        time: '01:15 PM',
      },
      rating: 1,
      sentiment: 'Negative' as const,
      sentimentColor: 'bg-red-100 text-red-800',
      reviewText: "Unfortunately, the event was overcrowded and I couldn't hear the presenter well. The samples ran out quickly too. Disappointed given the hype.",
      helpfulCount: 8,
    },
  ]

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
        <ReviewsList reviews={reviews} />
      </div>
    </DashboardLayout>
  )
}

export default EventReviews

