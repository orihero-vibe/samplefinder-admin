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
import { triviaService, triviaResponsesService, clientsService, statisticsService, userProfilesService, type TriviaStats, type TriviaDocument as ServiceTriviaDocument, type ClientDocument, type UserProfile } from '../../lib/services'
import type { TriviaWinner } from './components/TriviaTable'
import { useNotificationStore } from '../../stores/notificationStore'
import { Query } from '../../lib/appwrite'

// Use ServiceTriviaDocument from services.ts
type TriviaDocument = ServiceTriviaDocument

// UI Trivia Quiz interface (for display)
interface TriviaQuiz {
  id: string
  question: string
  date: string
  responses: number
  winners: TriviaWinner[]
  view: number
  skip: number
  incorrect: number
  winnersCount: number
  status: 'Scheduled' | 'Active' | 'Completed' | 'Draft'
  clientName?: string
}

const Trivia = () => {
  const navigate = useNavigate()
  const { addNotification } = useNotificationStore()
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isListLoading, setIsListLoading] = useState(false)
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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(25)
  const [totalTrivia, setTotalTrivia] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformToUITrivia = async (doc: TriviaDocument, responses: any[]): Promise<TriviaQuiz> => {
    // Calculate status from dates
    const now = new Date()
    const startDate = doc.startDate ? new Date(doc.startDate) : null
    const endDate = doc.endDate ? new Date(doc.endDate) : null
    
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
    
    // Get unique users who answered correctly (winners)
    // Handle both string IDs and expanded relationship objects
    const uniqueWinnerData = Array.from(
      new Set(correctResponses.map((r) => {
        const user = r.user
        // If user is already an expanded object, extract the ID
        if (typeof user === 'object' && user !== null && '$id' in user) {
          return (user as { $id: string }).$id
        }
        return user as string
      }).filter(Boolean))
    ).slice(0, 10) as string[]
    
    // Fetch user profiles for winners in parallel for better performance
    const winnerProfiles: TriviaWinner[] = await Promise.all(
      uniqueWinnerData.map(async (userId) => {
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
        // Fallback: return with just ID if profile not found or fetch failed
        return { id: userId }
      })
    )
    
    // Get client name
    const clientName = doc.client && clientsMap.has(doc.client) 
      ? clientsMap.get(doc.client)!.name 
      : undefined

    return {
      id: doc.$id,
      question: doc.question || 'No question',
      date,
      responses: responses.length,
      winners: winnerProfiles,
      view: doc.views || 0, // Views from trivia document
      skip: doc.skips || 0, // Skips from trivia document
      incorrect: incorrectResponses.length,
      winnersCount: correctResponses.length,
      status,
      clientName,
    }
  }

  // Fetch trivia from Appwrite with statistics and pagination
  const fetchTrivia = async (page: number = currentPage, isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setIsInitialLoading(true)
      } else {
        setIsListLoading(true)
      }
      setError(null)
      
      // Fetch clients first if not already loaded
      if (clientsMap.size === 0) {
        await fetchClients()
      }
      
      // Build pagination queries
      const paginationQueries = [
        Query.limit(pageSize),
        Query.offset((page - 1) * pageSize),
        Query.orderDesc('startDate'), // Most recent trivia first
      ]
      
      let result
      if (searchQuery.trim()) {
        // Use search if there's a query (search already includes pagination)
        result = await triviaService.search(searchQuery.trim(), paginationQueries)
      } else {
        // Otherwise fetch with pagination
        result = await triviaService.list(paginationQueries)
      }
      
      // Extract pagination metadata
      const total = result.total
      const totalPagesCount = Math.ceil(total / pageSize)
      setTotalTrivia(total)
      setTotalPages(totalPagesCount)
      
      // Handle edge case: if current page exceeds total pages, reset to last valid page or page 1
      if (totalPagesCount > 0 && page > totalPagesCount) {
        const lastValidPage = totalPagesCount
        setCurrentPage(lastValidPage)
        if (page !== lastValidPage) {
          return fetchTrivia(lastValidPage, false)
        }
      } else if (totalPagesCount === 0) {
        setCurrentPage(1)
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
      setCurrentPage(page)
    } catch (err) {
      console.error('Error fetching trivia:', err)
      setError('Failed to load trivia quizzes. Please try again.')
    } finally {
      if (isInitial) {
        setIsInitialLoading(false)
      } else {
        setIsListLoading(false)
      }
    }
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchTrivia(page, false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
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

  // Initial load
  useEffect(() => {
    const initialLoad = async () => {
      await fetchClients()
      await fetchTrivia(1, true)
      await fetchStatistics()
    }
    initialLoad()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reset to page 1 when search or sort changes (not initial load)
  useEffect(() => {
    if (!isInitialLoading) {
      setCurrentPage(1)
      fetchTrivia(1, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, sortBy])

  const handleDeleteClick = (trivia: TriviaQuiz) => {
    setTriviaToDelete(trivia)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (triviaToDelete?.id) {
      try {
        await triviaService.delete(triviaToDelete.id)
        // Check if we need to go back a page if current page becomes empty
        if (triviaQuizzes.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1)
          await fetchTrivia(currentPage - 1, false)
        } else {
          await fetchTrivia(currentPage, false) // Refresh list
        }
        addNotification({
          type: 'success',
          title: 'Trivia Deleted',
          message: 'The trivia quiz has been successfully deleted.',
        })
        setTriviaToDelete(null)
        setIsDeleteModalOpen(false)
      } catch (err) {
        console.error('Error deleting trivia:', err)
        addNotification({
          type: 'error',
          title: 'Delete Failed',
          message: 'Failed to delete trivia quiz. Please try again.',
        })
        setIsDeleteModalOpen(false)
      }
    }
  }

  const handleEditClick = (trivia: TriviaQuiz) => {
    setTriviaToEdit(trivia)
    setIsEditModalOpen(true)
  }

  const handleUpdateTrivia = async () => {
    await fetchTrivia(currentPage, false) // Refresh list after update
    addNotification({
      type: 'success',
      title: 'Trivia Updated',
      message: 'The trivia quiz has been successfully updated.',
    })
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
      setIsCreateModalOpen(false)
      setCurrentPage(1)
      await fetchTrivia(1, false) // Refresh list - reset to page 1
      addNotification({
        type: 'success',
        title: 'Trivia Created',
        message: 'The trivia quiz has been successfully created.',
      })
    } catch (err) {
      console.error('Error creating trivia:', err)
      addNotification({
        type: 'error',
        title: 'Create Failed',
        message: 'Failed to create trivia quiz. Please try again.',
      })
    }
  }

  const filteredTrivia = triviaQuizzes

  if (isInitialLoading) {
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
          currentPage={currentPage}
          totalPages={totalPages}
          totalTrivia={totalTrivia}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onViewClick={(trivia) => navigate(`/trivia/${trivia.id}`)}
          onEditClick={handleEditClick}
          onDeleteClick={handleDeleteClick}
          isLoading={isListLoading}
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

