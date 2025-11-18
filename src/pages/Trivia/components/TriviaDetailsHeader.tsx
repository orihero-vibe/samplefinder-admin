import { Icon } from '@iconify/react'

interface TriviaDetailsHeaderProps {
  onBack: () => void
  onDownload: () => void
}

const TriviaDetailsHeader = ({ onBack, onDownload }: TriviaDetailsHeaderProps) => {
  return (
    <>
      {/* Breadcrumbs */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
        <button
          onClick={onBack}
          className="hover:text-gray-900 transition-colors flex items-center gap-1"
        >
          <Icon icon="mdi:arrow-left" className="w-4 h-4" />
          Back to Trivia
        </button>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Trivia Analytics</h1>
        <button
          onClick={onDownload}
          className="px-4 py-2 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors flex items-center gap-2"
        >
          <Icon icon="mdi:download" className="w-5 h-5" />
          Download Report
        </button>
      </div>
    </>
  )
}

export default TriviaDetailsHeader

