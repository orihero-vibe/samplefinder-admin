import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { DashboardLayout, ShimmerPage } from '../../components'
import TriviaDetailsHeader from './components/TriviaDetailsHeader'
import TriviaDetailsContent from './components/TriviaDetailsContent'

interface TriviaQuiz {
  id: string
  question: string
  brandName: string
  date: string
  scheduledDateTime: string
  responses: number
  winners: string[]
  view: number
  skip: number
  incorrect: number
  winnersCount: number
  status: 'Scheduled' | 'Completed' | 'Draft'
  answers: { option: string; isCorrect: boolean; responseCount: number }[]
  totalParticipants: number
  engagementRate: number
}

const TriviaDetails = () => {
  const navigate = useNavigate()
  const { triviaId } = useParams<{ triviaId: string }>()
  const [isLoading, setIsLoading] = useState(true)
  const [trivia, setTrivia] = useState<TriviaQuiz | null>(null)

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      // Mock data - in real app, fetch from API based on triviaId
      const mockTrivia: TriviaQuiz = {
        id: triviaId || '1',
        question: 'Which brand launched the first-ever energy drink?',
        brandName: 'Red Bull',
        date: 'October 25, 2025 at 10:00 AM',
        scheduledDateTime: '2025-10-25T10:00',
        responses: 1247,
        winners: [
          'user1',
          'user2',
          'user3',
          'user4',
          'user5',
          'user6',
          'user7',
          'user8',
          'user9',
          'user10',
        ],
        view: 1200,
        skip: 47,
        incorrect: 200,
        winnersCount: 892,
        status: 'Completed',
        totalParticipants: 1500,
        engagementRate: 83.1,
        answers: [
          { option: 'Red Bull', isCorrect: true, responseCount: 892 },
          { option: 'Monster', isCorrect: false, responseCount: 203 },
          { option: 'Rockstar', isCorrect: false, responseCount: 98 },
          { option: '5-hour Energy', isCorrect: false, responseCount: 54 },
        ],
      }
      setTrivia(mockTrivia)
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [triviaId])

  if (isLoading) {
    return (
      <DashboardLayout>
        <ShimmerPage />
      </DashboardLayout>
    )
  }

  if (!trivia) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="text-center py-12">
            <p className="text-gray-600">Trivia quiz not found</p>
            <button
              onClick={() => navigate('/trivia')}
              className="mt-4 px-4 py-2 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors"
            >
              Back to Trivia
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <TriviaDetailsHeader 
          onBack={() => navigate('/trivia')} 
          onDownload={() => console.log('Download report')}
        />
        <TriviaDetailsContent trivia={trivia} />
      </div>
    </DashboardLayout>
  )
}

export default TriviaDetails

