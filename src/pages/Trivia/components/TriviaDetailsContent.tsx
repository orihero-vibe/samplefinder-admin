import { Icon } from '@iconify/react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

interface TriviaDetailsContentProps {
  trivia: TriviaQuiz
}

const TriviaDetailsContent = ({ trivia }: TriviaDetailsContentProps) => {
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
                label={(props: any) => `${props.percentage}%`}
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
    </div>
  )
}

export default TriviaDetailsContent
