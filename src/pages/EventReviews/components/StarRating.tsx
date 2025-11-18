import { Icon } from '@iconify/react'

interface StarRatingProps {
  rating: number
}

const StarRating = ({ rating }: StarRatingProps) => {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 !== 0
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <Icon key={i} icon="mdi:star" className="w-4 h-4 text-yellow-400 fill-current" />
      ))}
      {hasHalfStar && (
        <Icon icon="mdi:star-half-full" className="w-4 h-4 text-yellow-400 fill-current" />
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <Icon key={i} icon="mdi:star-outline" className="w-4 h-4 text-gray-300" />
      ))}
    </div>
  )
}

export default StarRating

