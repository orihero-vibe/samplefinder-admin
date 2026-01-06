import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Models } from 'appwrite'
import {
  DashboardLayout,
  ConfirmationModal,
  ShimmerPage,
} from '../../components'
import {
  TriviaHeader,
  SearchAndFilter,
  TriviaTable,
  CreateTriviaModal,
  EditTriviaModal,
  StatsCards,
} from './components'
import { triviaService, triviaResponsesService, clientsService, statisticsService, type TriviaStats, type TriviaDocument as ServiceTriviaDocument, type ClientDocument } from '../../lib/services'
import { useNotificationStore } from '../../stores/notificationStore'

// Use ServiceTriviaDocument from services.ts
type TriviaDocument = ServiceTriviaDocument

// UI Trivia Quiz interface (for display)
interface TriviaQuiz {
  id: string
  question: string
  date: string
  responses: number
  winners: string[]
  view: number
  skip: number
  incorrect: number
  winnersCount: number
  status: 'Scheduled' | 'Completed' | 'Draft'
  clientName?: string
}

const Trivia = () => {
  const navigate = useNavigate()
  const { addNotification } = useNotificationStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Date')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [triviaToDelete, setTriviaToDelete] = useState<TriviaQuiz | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [triviaToEdit, setTriviaToEdit] = useState<TriviaQuiz | null>(null)
  const [triviaQuizzes, setTriviaQuizzes] = useState<TriviaQuiz[]>([])
  const [statistics, setStatistics] = useState<TriviaStats | null>(null)
  const [clientsMap, setClientsMap] = useState<Map<string, ClientDocument>>(new Map())

  // Fetch clients map for displaying client names
  const fetchClients = async () => {
    try {
      const result = await clientsService.list()
      const map = new Map<string, ClientDocument>()
      result.documents.forEach((client) => {
        map.set(client.$id, client)
      })
      setClientsMap(map)
    } catch (err) {
      console.error('Error fetching clients:', err)
    }
  }

  // Transform TriviaDocument to TriviaQuiz for UI with statistics
  const transformToUITrivia = async (doc: TriviaDocument, responses: any[]): Promise<TriviaQuiz> => {
    // Calculate status from dates
    const now = new Date()
    const startDate = doc.startDate ? new Date(doc.startDate) : null
    const endDate = doc.endDate ? new Date(doc.endDate) : null
    
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

    // Format date from startDate or createdAt
    const date = doc.startDate
      ? new Date(doc.startDate).toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : doc.$createdAt
      ? new Date(doc.$createdAt).toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'N/A'

    // Calculate statistics from responses
    const correctResponses = responses.filter(
      (response) => response.answerIndex === doc.correctOptionIndex
    )
    const incorrectResponses = responses.filter(
      (response) => response.answerIndex !== doc.correctOptionIndex
    )
    const uniqueUsers = new Set(responses.map((r) => r.user).filter(Boolean))
    
    // Get client name
    const clientName = doc.client && clientsMap.has(doc.client) 
      ? clientsMap.get(doc.client)!.name 
      : undefined

    return {
      id: doc.$id,
      question: doc.question || 'No question',
      date,
      responses: responses.length,
      winners: Array.from(uniqueUsers).slice(0, 10) as string[], // First 10 unique users
      view: responses.length, // Using responses as proxy for views
      skip: 0, // Not tracked in current schema
      incorrect: incorrectResponses.length,
      winnersCount: correctResponses.length,
      status,
      clientName,
    }
  }

  // Fetch trivia from Appwrite with statistics
  const fetchTrivia = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Fetch clients first if not already loaded
      if (clientsMap.size === 0) {
        await fetchClients()
      }
      
      let result
      if (searchQuery.trim()) {
        // Use search if there's a query
        result = await triviaService.search(searchQuery.trim())
      } else {
        // Otherwise fetch all
        result = await triviaService.list()
      }

      // Fetch responses for all trivia in parallel
      const documents = result.documents as TriviaDocument[]
      const responsesPromises = documents.map((doc) => 
        triviaResponsesService.getByTriviaId(doc.$id).catch(() => [])
      )
      const responsesArrays = await Promise.all(responsesPromises)

      // Transform with statistics
      const transformedPromises = documents.map((doc, index) => 
        transformToUITrivia(doc, responsesArrays[index])
      )
      const transformedTrivia = await Promise.all(transformedPromises)

      // Apply sorting - sort by original document dates, not formatted strings
      let sortedTrivia = [...transformedTrivia]
      if (sortBy === 'Date') {
        // Sort using original documents before transformation
        const triviaWithDates = documents.map((doc, index) => ({
          trivia: transformedTrivia[index],
          date: doc.startDate ? new Date(doc.startDate).getTime() : (doc.$createdAt ? new Date(doc.$createdAt).getTime() : 0)
        }))
        triviaWithDates.sort((a, b) => b.date - a.date)
        sortedTrivia = triviaWithDates.map(item => item.trivia)
      } else if (sortBy === 'Status') {
        sortedTrivia.sort((a, b) => {
          return a.status.localeCompare(b.status)
        })
      } else if (sortBy === 'Responses') {
        sortedTrivia.sort((a, b) => {
          return b.responses - a.responses // Most responses first
        })
      }

      setTriviaQuizzes(sortedTrivia)
    } catch (err) {
      console.error('Error fetching trivia:', err)
      setError('Failed to load trivia quizzes. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const stats = await statisticsService.getStatistics<TriviaStats>('trivia')
      setStatistics(stats)
    } catch (err) {
      console.error('Error fetching statistics:', err)
      addNotification({
        type: 'error',
        title: 'Error Loading Statistics',
        message: 'Failed to load trivia statistics. Please refresh the page.',
      })
    }
  }

  useEffect(() => {
    fetchTrivia()
    fetchStatistics()
  }, [searchQuery, sortBy])

  useEffect(() => {
    // Fetch clients on mount
    fetchClients()
  }, [])

  const handleDeleteClick = (trivia: TriviaQuiz) => {
    setTriviaToDelete(trivia)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (triviaToDelete?.id) {
      try {
        await triviaService.delete(triviaToDelete.id)
        await fetchTrivia() // Refresh list
        setTriviaToDelete(null)
        setIsDeleteModalOpen(false)
      } catch (err) {
        console.error('Error deleting trivia:', err)
        setError('Failed to delete trivia quiz. Please try again.')
        setIsDeleteModalOpen(false)
      }
    }
  }

  const handleEditClick = (trivia: TriviaQuiz) => {
    setTriviaToEdit(trivia)
    setIsEditModalOpen(true)
  }

  const handleUpdateTrivia = async () => {
    await fetchTrivia() // Refresh list after update
  }

  const handleCreateTrivia = async (triviaData: {
    client: string // Client ID from relationship
    question: string
    answers: string[] // Array of answer strings
    correctOptionIndex: number // Index of correct answer
    startDate: string // ISO 8601 datetime string
    endDate: string // ISO 8601 datetime string
    points: number // Points for correct answer
  }) => {
    try {
      setError(null)
      // Map UI form data to DB structure - matching Appwrite schema exactly
      const dbData: Omit<TriviaDocument, keyof Models.Document> = {
        client: triviaData.client || undefined,
        question: triviaData.question,
        answers: triviaData.answers,
        correctOptionIndex: triviaData.correctOptionIndex,
        startDate: triviaData.startDate,
        endDate: triviaData.endDate,
        points: triviaData.points,
      }
      await triviaService.create(dbData)
      await fetchTrivia() // Refresh list
      setIsCreateModalOpen(false)
    } catch (err) {
      console.error('Error creating trivia:', err)
      setError('Failed to create trivia quiz. Please try again.')
    }
  }

  const filteredTrivia = triviaQuizzes

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
        <TriviaHeader onCreateNew={() => setIsCreateModalOpen(true)} />
        {statistics && (
          <StatsCards
            stats={[
              {
                label: 'Total Quizzes',
                value: statistics.totalQuizzes.toLocaleString('en-US'),
                icon: 'mdi:format-list-bulleted',
                iconBg: 'bg-green-100',
                iconColor: 'text-green-600',
              },
              {
                label: 'Scheduled',
                value: statistics.scheduled.toLocaleString('en-US'),
                icon: 'mdi:star-four-points',
                iconBg: 'bg-red-100',
                iconColor: 'text-red-600',
              },
              {
                label: 'Active',
                value: statistics.active.toLocaleString('en-US'),
                icon: 'mdi:trending-up',
                iconBg: 'bg-orange-100',
                iconColor: 'text-orange-600',
              },
              {
                label: 'Completed',
                value: statistics.completed.toLocaleString('en-US'),
                icon: 'mdi:trending-up',
                iconBg: 'bg-blue-100',
                iconColor: 'text-blue-600',
              },
            ]}
          />
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}
        <SearchAndFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
        <TriviaTable
          triviaQuizzes={filteredTrivia}
          onViewClick={(trivia) => navigate(`/trivia/${trivia.id}`)}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
        />
      </div>

      {/* Create Trivia Modal */}
      <CreateTriviaModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateTrivia}
      />

      {/* Edit Trivia Modal */}
      {triviaToEdit && (
        <EditTriviaModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setTriviaToEdit(null)
          }}
          triviaId={triviaToEdit.id}
          onUpdate={handleUpdateTrivia}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setTriviaToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        type="delete"
        itemName="trivia quiz"
      />
    </DashboardLayout>
  )
}

export default Trivia

