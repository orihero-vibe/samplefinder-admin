import { Icon } from '@iconify/react'

interface ReportCardProps {
  name: string
  icon: string
  lastGenerated: string
  onPreview: () => void
}

const ReportCard = ({ name, icon, lastGenerated, onPreview }: ReportCardProps) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon icon={icon} className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">Last generated: {lastGenerated}</p>
        <button
          onClick={onPreview}
          className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-sm text-gray-700 font-medium whitespace-nowrap"
        >
          <Icon icon="mdi:eye" className="w-4 h-4" />
          Preview
        </button>
      </div>
    </div>
  )
}

export default ReportCard


