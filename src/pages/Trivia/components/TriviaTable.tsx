import { Icon } from '@iconify/react'
import { Pagination } from '../../../components'

// Winner object with user profile data
export interface TriviaWinner {
  id: string
  username?: string
  firstname?: string
  lastname?: string
  avatarURL?: string
}

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
  status: 'Scheduled' | 'Completed' | 'Draft'
}

interface TriviaTableProps {
  triviaQuizzes: TriviaQuiz[]
  onViewClick: (trivia: TriviaQuiz) => void
  onEditClick: (trivia: TriviaQuiz) => void
  onDeleteClick: (trivia: TriviaQuiz) => void
  currentPage?: number
  totalPages?: number
  totalTrivia?: number
  pageSize?: number
  onPageChange?: (page: number) => void
}

const TriviaTable = ({
  triviaQuizzes,
  onViewClick,
  onEditClick,
  onDeleteClick,
  currentPage = 1,
  totalPages = 0,
  totalTrivia = 0,
  pageSize = 25,
  onPageChange,
}: TriviaTableProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return 'text-red-600'
      case 'Completed':
        return 'text-green-600'
      case 'Draft':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const getInitials = (winner: TriviaWinner) => {
    // Try firstname + lastname first
    if (winner.firstname && winner.lastname) {
      return `${winner.firstname.charAt(0)}${winner.lastname.charAt(0)}`.toUpperCase()
    }
    // Try firstname only
    if (winner.firstname) {
      return winner.firstname.substring(0, 2).toUpperCase()
    }
    // Try lastname only
    if (winner.lastname) {
      return winner.lastname.substring(0, 2).toUpperCase()
    }
    // Try username
    if (winner.username) {
      return winner.username.substring(0, 2).toUpperCase()
    }
    // Fallback to ID (first 2 characters)
    if (winner.id) {
      return winner.id.substring(0, 2).toUpperCase()
    }
    return '??'
  }

  const getDisplayName = (winner: TriviaWinner) => {
    if (winner.firstname && winner.lastname) {
      return `${winner.firstname} ${winner.lastname}`
    }
    if (winner.firstname) {
      return winner.firstname
    }
    if (winner.lastname) {
      return winner.lastname
    }
    return winner.username || `User ${winner.id?.substring(0, 6) || 'Unknown'}`
  }

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-teal-500',
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:help-circle" className="w-4 h-4" />
                  Questions
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:account" className="w-4 h-4" />
                  Responses
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:trophy" className="w-4 h-4" />
                  List of Winners
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:eye" className="w-4 h-4" />
                  View
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Skip
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Incorrect
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:trophy" className="w-4 h-4" />
                  Winners
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {triviaQuizzes.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Icon icon="mdi:help-circle-outline" className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 text-lg font-medium">No trivia quizzes found</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Create your first trivia quiz to get started
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              triviaQuizzes.map((trivia) => (
                <tr key={trivia.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {trivia.question.length > 30 
                      ? `${trivia.question.substring(0, 30)}...` 
                      : trivia.question}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trivia.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trivia.responses.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {trivia.winners.length > 0 ? (
                        <>
                          <div className="flex -space-x-2">
                            {trivia.winners.slice(0, 5).map((winner, index) => (
                              winner.avatarURL ? (
                                <img
                                  key={winner.id}
                                  src={winner.avatarURL}
                                  alt={getDisplayName(winner)}
                                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                                  title={getDisplayName(winner)}
                                />
                              ) : (
                                <div
                                  key={winner.id}
                                  className={`w-8 h-8 rounded-full ${getAvatarColor(
                                    index
                                  )} flex items-center justify-center text-white text-xs font-semibold border-2 border-white`}
                                  title={getDisplayName(winner)}
                                >
                                  {getInitials(winner)}
                                </div>
                              )
                            ))}
                          </div>
                          {trivia.winners.length > 5 && (
                            <span className="text-sm text-gray-600">
                              +{trivia.winners.length - 5}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">No winners yet</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trivia.view.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trivia.skip.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trivia.incorrect.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trivia.winnersCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getStatusColor(trivia.status)}`}>
                      {trivia.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onViewClick(trivia)}
                        className="hover:text-blue-600 transition-colors"
                        title="View"
                      >
                        <Icon icon="mdi:eye" className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onEditClick(trivia)}
                        className="hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Icon icon="mdi:pencil" className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onDeleteClick(trivia)}
                        className="hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Icon icon="mdi:trash-can" className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {onPageChange && totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalTrivia}
          pageSize={pageSize}
          itemLabel="trivia quizzes"
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

export default TriviaTable

