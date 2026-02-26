import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DashboardLayout, ShimmerPage } from '../../components'
import TriviaDetailsHeader from './components/TriviaDetailsHeader'
import TriviaDetailsContent from './components/TriviaDetailsContent'
import { triviaService, userProfilesService, isCorrectTriviaResponse, type TriviaResponseDocument, type UserProfile } from '../../lib/services'
import type { TriviaWinner } from './components/TriviaTable'
import { useTimezoneStore } from '../../stores/timezoneStore'
import { formatDateTimeInAppTimezone } from '../../lib/dateUtils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface TriviaParticipant {
  id: string
  username?: string
  firstname?: string
  lastname?: string
  avatarURL?: string
  answerIndex: number
  isCorrect: boolean
  answeredAt?: string
}

interface TriviaQuiz {
  id: string
  question: string
  brandName: string
  date: string
  scheduledDateTime: string
  responses: number
  winners: TriviaWinner[]
  view: number
  skip: number
  incorrect: number
  winnersCount: number
  status: 'Scheduled' | 'Active' | 'Completed' | 'Draft'
  answers: { option: string; isCorrect: boolean; responseCount: number }[]
  totalParticipants: number
  engagementRate: number
  participants: TriviaParticipant[]
}

const TriviaDetails = () => {
  const navigate = useNavigate()
  const { triviaId } = useParams<{ triviaId: string }>()
  const { appTimezone } = useTimezoneStore()
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
        
        let status: 'Scheduled' | 'Active' | 'Completed' | 'Draft' = 'Draft'
        if (startDate && endDate) {
          if (now < startDate) {
            status = 'Scheduled'
          } else if (now > endDate) {
            status = 'Completed'
          } else {
            status = 'Active' // Between start and end date = Active
          }
        }

        // Format date (in app timezone)
        const date = triviaDoc.startDate
          ? formatDateTimeInAppTimezone(triviaDoc.startDate, appTimezone)
          : 'N/A'

        // Calculate response distribution per answer option (normalize to number; Appwrite may return integers as strings)
        const answers = triviaDoc.answers || []
        const answerStats = answers.map((answer: string, index: number) => {
          const responseCount = responses.filter((r: TriviaResponseDocument) => Number(r.answerIndex) === index).length
          return {
            option: answer,
            isCorrect: Number(triviaDoc.correctOptionIndex) === index,
            responseCount,
          }
        })

        // Get unique users who answered correctly (winners)
        const correctResponses = responses.filter((r: TriviaResponseDocument) =>
          isCorrectTriviaResponse(r, triviaDoc.correctOptionIndex)
        )
        // Handle both string IDs and expanded relationship objects
        const getUserId = (user: TriviaResponseDocument['user']): string | null => {
          if (typeof user === 'object' && user !== null && '$id' in user) {
            return (user as { $id: string }).$id
          }
          return user as string || null
        }
        
        const winnerIds = Array.from(new Set(correctResponses.map((r: TriviaResponseDocument) => 
          getUserId(r.user)
        ).filter(Boolean))).slice(0, 10) as string[]
        
        // Fetch user profiles for winners in parallel
        const winnerProfiles: TriviaWinner[] = await Promise.all(
          winnerIds.map(async (userId) => {
            try {
              const profile = await userProfilesService.getById(userId) as UserProfile | null
              if (profile) {
                return {
                  id: profile.$id,
                  username: profile.username || undefined,
                  firstname: profile.firstname || undefined,
                  lastname: profile.lastname || undefined,
                  avatarURL: profile.avatarURL || undefined,
                }
              }
            } catch {
              // Profile fetch failed, continue with fallback
            }
            // Fallback: return with just ID
            return { id: userId }
          })
        )

        // Get all participants with their response info
        const participantMap = new Map<string, { response: TriviaResponseDocument }>()
        responses.forEach((r: TriviaResponseDocument) => {
          const userId = getUserId(r.user)
          if (userId && !participantMap.has(userId)) {
            participantMap.set(userId, { response: r })
          }
        })

        // Fetch profiles for all participants
        const participantProfiles: TriviaParticipant[] = await Promise.all(
          Array.from(participantMap.entries()).map(async ([userId, { response }]) => {
            try {
              const profile = await userProfilesService.getById(userId) as UserProfile | null
              return {
                id: userId,
                username: profile?.username || undefined,
                firstname: profile?.firstname || undefined,
                lastname: profile?.lastname || undefined,
                avatarURL: profile?.avatarURL || undefined,
                answerIndex: Number(response.answerIndex),
                isCorrect: isCorrectTriviaResponse(response, triviaDoc.correctOptionIndex),
                answeredAt: response.$createdAt,
              }
            } catch {
              // Profile fetch failed, continue with fallback
              return {
                id: userId,
                answerIndex: Number(response.answerIndex),
                isCorrect: isCorrectTriviaResponse(response, triviaDoc.correctOptionIndex),
                answeredAt: response.$createdAt,
              }
            }
          })
        )

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
          winners: winnerProfiles,
          view: triviaDoc.views || 0, // Views from trivia document
          skip: triviaDoc.skips || 0, // Skips from trivia document
          incorrect: stats.incorrectResponses,
          winnersCount: stats.correctResponses,
          status,
          answers: answerStats,
          totalParticipants: uniqueParticipants,
          engagementRate: parseFloat(engagementRate),
          participants: participantProfiles,
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

  const handleDownloadReport = () => {
    if (!trivia) return

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    let yPos = 15

    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(29, 10, 116) // #1D0A74
    doc.text('Trivia Report', 14, yPos)
    yPos += 10

    // Generated date
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${formatDateTimeInAppTimezone(new Date().toISOString(), appTimezone)}`, 14, yPos)
    yPos += 12

    // Question Section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Trivia Question', 14, yPos)
    yPos += 8

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const questionLines = doc.splitTextToSize(trivia.question, pageWidth - 28)
    doc.text(questionLines, 14, yPos)
    yPos += questionLines.length * 5 + 8

    // Answers Section
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Answer Options:', 14, yPos)
    yPos += 6

    trivia.answers.forEach((answer, index) => {
      const optionLabel = String.fromCharCode(65 + index)
      doc.setFontSize(10)
      doc.setFont('helvetica', answer.isCorrect ? 'bold' : 'normal')
      doc.setTextColor(answer.isCorrect ? 34 : 0, answer.isCorrect ? 139 : 0, answer.isCorrect ? 34 : 0)
      const answerText = `${optionLabel}. ${answer.option}${answer.isCorrect ? ' (Correct Answer)' : ''}`
      doc.text(answerText, 18, yPos)
      yPos += 5
    })
    yPos += 6

    // Statistics Section
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Statistics', 14, yPos)
    yPos += 8

    const statsData = [
      ['Metric', 'Value'],
      ['Brand', trivia.brandName],
      ['Status', trivia.status],
      ['Sent Date', trivia.date],
      ['Total Participants', trivia.totalParticipants.toLocaleString()],
      ['Total Responses', trivia.responses.toLocaleString()],
      ['Correct Answers', trivia.winnersCount.toLocaleString()],
      ['Incorrect Answers', trivia.incorrect.toLocaleString()],
      ['Views', trivia.view.toLocaleString()],
      ['Skips', trivia.skip.toLocaleString()],
      ['Engagement Rate', `${trivia.engagementRate}%`],
    ]

    autoTable(doc, {
      startY: yPos,
      head: [statsData[0]],
      body: statsData.slice(1),
      theme: 'striped',
      headStyles: {
        fillColor: [29, 10, 116],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 80 },
      },
      margin: { left: 14, right: 14 },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 12

    // Response Breakdown Section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Response Breakdown', 14, yPos)
    yPos += 8

    const totalResponses = trivia.answers.reduce((sum, a) => sum + a.responseCount, 0)
    const responseData = trivia.answers.map((answer, index) => {
      const optionLabel = String.fromCharCode(65 + index)
      const percentage = totalResponses > 0 ? ((answer.responseCount / totalResponses) * 100).toFixed(1) : '0'
      return [
        `${optionLabel}. ${answer.option}`,
        answer.isCorrect ? 'Yes' : 'No',
        answer.responseCount.toLocaleString(),
        `${percentage}%`,
      ]
    })

    autoTable(doc, {
      startY: yPos,
      head: [['Answer', 'Correct', 'Responses', 'Percentage']],
      body: responseData,
      theme: 'striped',
      headStyles: {
        fillColor: [29, 10, 116],
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      margin: { left: 14, right: 14 },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yPos = (doc as any).lastAutoTable.finalY + 12

    // Check if we need a new page for participants
    if (yPos > 220) {
      doc.addPage()
      yPos = 15
    }

    // Participants Section
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`Participants (${trivia.participants.length})`, 14, yPos)
    yPos += 8

    if (trivia.participants.length > 0) {
      const participantsData = trivia.participants.map((p) => {
        const displayName = p.username || 
          (p.firstname && p.lastname ? `${p.firstname} ${p.lastname}` : p.firstname || p.id.slice(0, 8))
        const answerLabel = String.fromCharCode(65 + p.answerIndex)
        const answerText = trivia.answers[p.answerIndex]?.option || 'Unknown'
        const answeredAt = p.answeredAt
          ? formatDateTimeInAppTimezone(p.answeredAt, appTimezone)
          : 'N/A'
        return [displayName, `${answerLabel}. ${answerText}`, p.isCorrect ? 'Correct' : 'Incorrect', answeredAt]
      })

      autoTable(doc, {
        startY: yPos,
        head: [['User', 'Answer', 'Result', 'Answered At']],
        body: participantsData,
        theme: 'striped',
        headStyles: {
          fillColor: [29, 10, 116],
          textColor: 255,
          fontStyle: 'bold',
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 60 },
          2: { cellWidth: 25 },
          3: { cellWidth: 45 },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Footer with page numbers
          const pageCount = doc.getNumberOfPages()
          const pageSize = doc.internal.pageSize
          const pageHeight = pageSize.height || pageSize.getHeight()
          
          doc.setFontSize(8)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100, 100, 100)
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            pageSize.width / 2,
            pageHeight - 10,
            { align: 'center' }
          )
        },
      })
    } else {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(100, 100, 100)
      doc.text('No participants yet', 14, yPos)
    }

    // Save the PDF
    const sanitizedQuestion = trivia.question.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')
    doc.save(`trivia_report_${sanitizedQuestion}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

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
          onDownload={handleDownloadReport}
        />
        <TriviaDetailsContent trivia={trivia} />
      </div>
    </DashboardLayout>
  )
}

export default TriviaDetails

