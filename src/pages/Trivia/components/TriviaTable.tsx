import { Icon } from '@iconify/react'

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

interface TriviaTableProps {
  triviaQuizzes: TriviaQuiz[]
  onViewClick: (trivia: TriviaQuiz) => void
  onEditClick: (trivia: TriviaQuiz) => void
  onDeleteClick: (trivia: TriviaQuiz) => void
}

const TriviaTable = ({
  triviaQuizzes,
  onViewClick,
  onEditClick,
  onDeleteClick,
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

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase()
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
            {triviaQuizzes.map((trivia) => (
              <tr key={trivia.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {trivia.question}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {trivia.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {trivia.responses.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {trivia.winners.slice(0, 5).map((winner, index) => (
                        <div
                          key={index}
                          className={`w-8 h-8 rounded-full ${getAvatarColor(
                            index
                          )} flex items-center justify-center text-white text-xs font-semibold border-2 border-white`}
                          title={winner}
                        >
                          {getInitials(winner)}
                        </div>
                      ))}
                    </div>
                    {trivia.winners.length > 5 && (
                      <span className="text-sm text-gray-600">
                        +{trivia.winners.length - 5}
                      </span>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TriviaTable

