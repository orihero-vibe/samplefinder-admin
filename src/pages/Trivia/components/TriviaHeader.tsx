import { Icon } from '@iconify/react'

interface TriviaHeaderProps {
  onCreateNew: () => void
}

const TriviaHeader = ({ onCreateNew }: TriviaHeaderProps) => {
  return (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trivia Management</h1>
        <p className="text-gray-600">Create, schedule, and track trivia quizzes sent to users.</p>
      </div>
      <button
        onClick={onCreateNew}
        className="px-4 py-2 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors flex items-center gap-2"
      >
        <Icon icon="mdi:plus" className="w-5 h-5" />
        Create New Trivia
      </button>
    </div>
  )
}

export default TriviaHeader

