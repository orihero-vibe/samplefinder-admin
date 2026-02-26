import { useState } from 'react'
import { Icon } from '@iconify/react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TriviaWinner } from './TriviaTable'
import type { TriviaParticipant } from '../TriviaDetails'
import { useTimezoneStore } from '../../../stores/timezoneStore'
import { formatDateTimeInAppTimezone } from '../../../lib/dateUtils'

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

interface TriviaDetailsContentProps {
  trivia: TriviaQuiz
}

const TriviaDetailsContent = ({ trivia }: TriviaDetailsContentProps) => {
  const { appTimezone } = useTimezoneStore()
  const [participantsFilter, setParticipantsFilter] = useState<'all' | 'correct' | 'incorrect'>('all')
  const [participantsPage, setParticipantsPage] = useState(1)
  const participantsPerPage = 10

  // Calculate response distribution data for charts
  const totalResponses = trivia.answers.reduce((sum, answer) => sum + answer.responseCount, 0)
  
  const chartData = trivia.answers.map((answer, index) => {
    const optionLabel = String.fromCharCode(65 + index) // A, B, C, D
    const percentage = totalResponses > 0 ? ((answer.responseCount / totalResponses) * 100).toFixed(1) : '0'
    return {
      name: `Option ${optionLabel}`,
      option: optionLabel,
      value: answer.responseCount,
      percentage: parseFloat(percentage),
      label: answer.option,
      isCorrect: answer.isCorrect,
    }
  })

  // Colors for pie chart - matching screenshot
  const COLORS = ['#1D0A74', '#A78BFA', '#F472B6', '#FB923C']

  const stats = [
    {
      label: 'Total Participants',
      value: trivia.totalParticipants.toLocaleString(),
      icon: 'mdi:account-group',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Total Responses',
      value: trivia.responses.toLocaleString(),
      icon: 'mdi:clock',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Engagement Rate',
      value: `${trivia.engagementRate}%`,
      icon: 'mdi:trending-up',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Sent Date',
      value: trivia.date,
      icon: 'mdi:calendar',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Question and Answers Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Trivia Question</h2>
        <p className="text-lg text-gray-700 mb-6">{trivia.question}</p>
        <div className="space-y-3">
          {trivia.answers.map((answer, index) => {
            const optionLabel = String.fromCharCode(65 + index) // A, B, C, D
            return (
              <div
                key={index}
                className={`flex items-center gap-3 p-4 rounded-lg border-2 ${
                  answer.isCorrect
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    answer.isCorrect
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-700'
                  }`}
                >
                  {optionLabel}
                </div>
                <span className="flex-1 text-gray-900">{answer.option}</span>
                {answer.isCorrect && (
                  <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium flex items-center gap-1">
                    <Icon icon="mdi:check" className="w-4 h-4" />
                    Correct Answer
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.iconBg} p-3 rounded-lg`}>
                <Icon icon={stat.icon} className={`w-6 h-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Distribution Pie Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Response Distribution</h2>
          <p className="text-sm text-gray-600 mb-6">Percentage of responses per answer</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }: { percent?: number }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="percentage"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `${value}%`}
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {chartData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-gray-700">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Response Count Bar Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Response Count</h2>
          <p className="text-sm text-gray-600 mb-6">Number of responses per answer</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="option" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#1D0A74" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Response Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Detailed Response Breakdown</h2>
        <div className="space-y-4">
          {trivia.answers.map((answer, index) => {
            const optionLabel = String.fromCharCode(65 + index) // A, B, C, D
            const percentage = totalResponses > 0 ? ((answer.responseCount / totalResponses) * 100).toFixed(1) : '0'
            const progressWidth = totalResponses > 0 ? (answer.responseCount / totalResponses) * 100 : 0
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{optionLabel} {answer.option}</span>
                    {answer.isCorrect && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        Correct
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {answer.responseCount.toLocaleString()} responses
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-[#1D0A74] transition-all duration-300"
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Participants List */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Participants</h2>
            <p className="text-sm text-gray-600 mt-1">
              {trivia.participants.length} total participants
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setParticipantsFilter('all'); setParticipantsPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                participantsFilter === 'all'
                  ? 'bg-[#1D0A74] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setParticipantsFilter('correct'); setParticipantsPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                participantsFilter === 'correct'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Correct
            </button>
            <button
              onClick={() => { setParticipantsFilter('incorrect'); setParticipantsPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                participantsFilter === 'incorrect'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Incorrect
            </button>
          </div>
        </div>

        {/* Participants Table */}
        {(() => {
          const filteredParticipants = trivia.participants.filter(p => {
            if (participantsFilter === 'correct') return p.isCorrect
            if (participantsFilter === 'incorrect') return !p.isCorrect
            return true
          })
          const totalPages = Math.ceil(filteredParticipants.length / participantsPerPage)
          const paginatedParticipants = filteredParticipants.slice(
            (participantsPage - 1) * participantsPerPage,
            participantsPage * participantsPerPage
          )

          if (filteredParticipants.length === 0) {
            return (
              <div className="text-center py-8 text-gray-500">
                No participants found
              </div>
            )
          }

          return (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">User</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Answer</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Result</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Answered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedParticipants.map((participant) => {
                      const answerLabel = String.fromCharCode(65 + participant.answerIndex)
                      const answerText = trivia.answers[participant.answerIndex]?.option || 'Unknown'
                      const displayName = participant.username || 
                        (participant.firstname && participant.lastname 
                          ? `${participant.firstname} ${participant.lastname}` 
                          : participant.firstname || participant.id.slice(0, 8))

                      return (
                        <tr key={participant.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {participant.avatarURL ? (
                                <img
                                  src={participant.avatarURL}
                                  alt={displayName}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#1D0A74] flex items-center justify-center text-white text-sm font-medium">
                                  {(participant.firstname?.[0] || participant.username?.[0] || 'U').toUpperCase()}
                                </div>
                              )}
                              <span className="font-medium text-gray-900">{displayName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-gray-700">
                              <span className="font-semibold">{answerLabel}.</span> {answerText}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {participant.isCorrect ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                <Icon icon="mdi:check-circle" className="w-3 h-3" />
                                Correct
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                                <Icon icon="mdi:close-circle" className="w-3 h-3" />
                                Incorrect
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {participant.answeredAt
                              ? formatDateTimeInAppTimezone(participant.answeredAt, appTimezone)
                              : 'N/A'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <span className="text-sm text-gray-600">
                    Showing {(participantsPage - 1) * participantsPerPage + 1} to{' '}
                    {Math.min(participantsPage * participantsPerPage, filteredParticipants.length)} of{' '}
                    {filteredParticipants.length} participants
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setParticipantsPage(p => Math.max(1, p - 1))}
                      disabled={participantsPage === 1}
                      className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <Icon icon="mdi:chevron-left" className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-700">
                      Page {participantsPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setParticipantsPage(p => Math.min(totalPages, p + 1))}
                      disabled={participantsPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      <Icon icon="mdi:chevron-right" className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}

export default TriviaDetailsContent
