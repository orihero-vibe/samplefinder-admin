import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DashboardLayout, ShimmerPage } from '../../components'
import TriviaDetailsHeader from './components/TriviaDetailsHeader'
import TriviaDetailsContent from './components/TriviaDetailsContent'
import { triviaService, type TriviaResponseDocument } from '../../lib/services'

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
  const [error, setError] = useState<string | null>(null)
  const [trivia, setTrivia] = useState<TriviaQuiz | null>(null)

  useEffect(() => {
    const fetchTriviaDetails = async () => {
      if (!triviaId) {
        setError('Trivia ID is required')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch trivia with statistics
        const { trivia: triviaDoc, client, responses, statistics: stats } = await triviaService.getWithStatistics(triviaId)
        
        // Calculate status
        const now = new Date()
        const startDate = triviaDoc.startDate ? new Date(triviaDoc.startDate) : null
        const endDate = triviaDoc.endDate ? new Date(triviaDoc.endDate) : null
        
        let status: 'Scheduled' | 'Completed' | 'Draft' = 'Draft'
        if (startDate && endDate) {
          if (now < startDate) {
            status = 'Scheduled'
          } else if (now > endDate) {
            status = 'Completed'
          } else {
            status = 'Scheduled' // Active/Scheduled
          }
        }

        // Format date
        const date = triviaDoc.startDate
          ? new Date(triviaDoc.startDate).toLocaleString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'N/A'

        // Calculate response distribution per answer option
        const answers = triviaDoc.answers || []
        const answerStats = answers.map((answer: string, index: number) => {
          const responseCount = responses.filter((r: TriviaResponseDocument) => r.answerIndex === index).length
          return {
            option: answer,
            isCorrect: index === triviaDoc.correctOptionIndex,
            responseCount,
          }
        })

        // Get unique users who answered correctly (winners)
        const correctResponses = responses.filter(
          (r: TriviaResponseDocument) => r.answerIndex === triviaDoc.correctOptionIndex
        )
        const winners = Array.from(new Set(correctResponses.map((r: TriviaResponseDocument) => r.user).filter(Boolean))) as string[]

        // Calculate engagement rate (responses / unique participants)
        const uniqueParticipants = new Set(responses.map((r: TriviaResponseDocument) => r.user).filter(Boolean)).size
        const engagementRate = uniqueParticipants > 0 
          ? ((stats.totalResponses / uniqueParticipants) * 100).toFixed(1)
          : '0'

        const triviaData: TriviaQuiz = {
          id: triviaDoc.$id,
          question: triviaDoc.question,
          brandName: client?.name || 'Unknown Brand',
          date,
          scheduledDateTime: triviaDoc.startDate || '',
          responses: stats.totalResponses,
          winners: winners.slice(0, 10), // First 10 winners
          view: stats.totalResponses, // Using responses as proxy
          skip: 0, // Not tracked
          incorrect: stats.incorrectResponses,
          winnersCount: stats.correctResponses,
          status,
          answers: answerStats,
          totalParticipants: uniqueParticipants,
          engagementRate: parseFloat(engagementRate),
        }

        setTrivia(triviaData)
      } catch (err) {
        console.error('Error fetching trivia details:', err)
        setError('Failed to load trivia quiz details. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchTriviaDetails()
  }, [triviaId])

  if (isLoading) {
    return (
      <DashboardLayout>
        <ShimmerPage />
      </DashboardLayout>
    )
  }

  if (error || !trivia) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="text-center py-12">
            <p className="text-gray-600">{error || 'Trivia quiz not found'}</p>
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

