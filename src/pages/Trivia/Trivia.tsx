import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DashboardLayout,
  ConfirmationModal,
  ShimmerPage,
} from '../../components'
import {
  TriviaHeader,
  StatsCards,
  SearchAndFilter,
  TriviaTable,
  CreateTriviaModal,
} from './components'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Date')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [triviaToDelete, setTriviaToDelete] = useState<TriviaQuiz | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const stats = [
    {
      label: 'Total Quizzes',
      value: '2,000',
      icon: 'mdi:check-circle',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Scheduled',
      value: '167',
      icon: 'mdi:star',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Active',
      value: '167',
      icon: 'mdi:trending-up',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
    },
    {
      label: 'Completed',
      value: '167',
      icon: 'mdi:trending-up',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
  ]

  const [triviaQuizzes, setTriviaQuizzes] = useState<TriviaQuiz[]>([
    {
      id: '1',
      question: 'Which brand la...',
      date: '05/15/2020 at...',
      responses: 1247,
      winners: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      view: 1200,
      skip: 47,
      incorrect: 200,
      winnersCount: 1000,
      status: 'Scheduled',
    },
    {
      id: '2',
      question: 'What year was...',
      date: '05/15/2020 at...',
      responses: 1247,
      winners: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      view: 1200,
      skip: 47,
      incorrect: 200,
      winnersCount: 1000,
      status: 'Scheduled',
    },
    {
      id: '3',
      question: 'Which music fe...',
      date: '05/15/2020 at...',
      responses: 1247,
      winners: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      view: 1200,
      skip: 47,
      incorrect: 200,
      winnersCount: 1000,
      status: 'Completed',
    },
    {
      id: '4',
      question: 'New Brand Par...',
      date: '05/15/2020 at...',
      responses: 1247,
      winners: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      view: 1200,
      skip: 47,
      incorrect: 200,
      winnersCount: 1000,
      status: 'Draft',
    },
    {
      id: '5',
      question: 'How many calo...',
      date: '05/15/2020 at...',
      responses: 1247,
      winners: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      view: 1200,
      skip: 47,
      incorrect: 200,
      winnersCount: 1000,
      status: 'Completed',
    },
    {
      id: '6',
      question: 'Which samplin...',
      date: '05/15/2020 at...',
      responses: 1247,
      winners: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      view: 1200,
      skip: 47,
      incorrect: 200,
      winnersCount: 1000,
      status: 'Draft',
    },
    {
      id: '7',
      question: 'Which brand la...',
      date: '05/15/2020 at...',
      responses: 1247,
      winners: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      view: 1200,
      skip: 47,
      incorrect: 200,
      winnersCount: 1000,
      status: 'Completed',
    },
    {
      id: '8',
      question: 'What year was...',
      date: '05/15/2020 at...',
      responses: 1247,
      winners: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8', 'user9', 'user10'],
      view: 1200,
      skip: 47,
      incorrect: 200,
      winnersCount: 1000,
      status: 'Scheduled',
    },
  ])

  const handleDeleteClick = (trivia: TriviaQuiz) => {
    setTriviaToDelete(trivia)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (triviaToDelete) {
      setTriviaQuizzes((prev) =>
        prev.filter((trivia) => trivia.id !== triviaToDelete.id)
      )
      setTriviaToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  const filteredTrivia = triviaQuizzes.filter((trivia) =>
    trivia.question.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        <StatsCards stats={stats} />
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
        onSave={(triviaData) => {
          console.log('Trivia data:', triviaData)
          // TODO: Implement save functionality
          // After successful save, you might want to refresh the trivia list
          setIsCreateModalOpen(false)
        }}
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

