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
} from './components'
import { triviaService } from '../../lib/services'

// Database Trivia Document interface - matches Appwrite schema exactly
interface TriviaDocument extends Models.Document {
  client?: string // Relationship to clients table (client ID)
  question: string // Required
  answers?: string[] // Array of answer option strings
  correctOptionIndex: number // Required, 0-100, index of correct answer in answers array
  startDate: string // Required, datetime (ISO 8601)
  endDate: string // Required, datetime (ISO 8601)
  points: number // Required, 0-1000
}

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
}

const Trivia = () => {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Date')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [triviaToDelete, setTriviaToDelete] = useState<TriviaQuiz | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [triviaQuizzes, setTriviaQuizzes] = useState<TriviaQuiz[]>([])

  // Transform TriviaDocument to TriviaQuiz for UI
  const transformToUITrivia = (doc: TriviaDocument): TriviaQuiz => {
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

    // These fields don't exist in DB, so we set defaults
    // In the future, these might be calculated from user responses/trivia_answers table
    return {
      id: doc.$id,
      question: doc.question || 'No question',
      date,
      responses: 0, // TODO: Calculate from trivia_answers table
      winners: [], // TODO: Fetch from trivia_answers where correct = true
      view: 0, // TODO: Calculate from views/impressions
      skip: 0, // TODO: Calculate from user actions
      incorrect: 0, // TODO: Calculate from trivia_answers
      winnersCount: 0, // TODO: Count of winners
      status,
    }
  }

  // Fetch trivia from Appwrite
  const fetchTrivia = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      let result
      if (searchQuery.trim()) {
        // Use search if there's a query
        result = await triviaService.search(searchQuery.trim())
      } else {
        // Otherwise fetch all
        result = await triviaService.list()
      }

      // Apply sorting
      let documents = result.documents as TriviaDocument[]
      if (sortBy === 'Date') {
        documents = [...documents].sort((a, b) => {
          const dateA = new Date(a.startDate || a.$createdAt || 0).getTime()
          const dateB = new Date(b.startDate || b.$createdAt || 0).getTime()
          return dateB - dateA // Newest first
        })
      } else if (sortBy === 'Status') {
        documents = [...documents].sort((a, b) => {
          // Calculate status for sorting
          const now = new Date()
          const getStatus = (doc: TriviaDocument) => {
            if (!doc.startDate || !doc.endDate) return 'Draft'
            const start = new Date(doc.startDate)
            const end = new Date(doc.endDate)
            if (now < start) return 'Scheduled'
            if (now > end) return 'Completed'
            return 'Scheduled'
          }
          const statusA = getStatus(a)
          const statusB = getStatus(b)
          return statusA.localeCompare(statusB)
        })
      } else if (sortBy === 'Responses') {
        // For now, all have 0 responses, but keeping the sort structure
        documents = [...documents].sort((a, b) => {
          return 0 // TODO: Sort by actual responses when available
        })
      }

      const transformedTrivia = documents.map(transformToUITrivia)
      setTriviaQuizzes(transformedTrivia)
    } catch (err) {
      console.error('Error fetching trivia:', err)
      setError('Failed to load trivia quizzes. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTrivia()
  }, [searchQuery, sortBy])

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
          onEditClick={(trivia) => console.log('Edit trivia:', trivia)}
          onDeleteClick={handleDeleteClick}
        />
      </div>

      {/* Create Trivia Modal */}
      <CreateTriviaModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateTrivia}
      />

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

