import { Icon } from '@iconify/react'
import { useState, useEffect, useRef } from 'react'
import { DownloadModal } from '../../../components'
import type { DownloadFormat } from '../../../components'

interface ReportCardProps {
  name: string
  icon: string
  lastGenerated: string
  onPreview: () => void
  onExport: (format: DownloadFormat) => void
  isDownloading?: boolean
}

const ReportCard = ({ name, icon, lastGenerated, onPreview, onExport, isDownloading }: ReportCardProps) => {
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const wasDownloading = useRef(false)

  // Close modal when download completes
  useEffect(() => {
    if (wasDownloading.current && !isDownloading) {
      setIsDownloadModalOpen(false)
    }
    wasDownloading.current = isDownloading || false
  }, [isDownloading])

  const handleExportClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDownloadModalOpen(true)
  }

  const handleDownload = (format: DownloadFormat) => {
    onExport(format)
  }

  return (
    <>
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportClick}
              className="px-3 py-1.5 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors flex items-center gap-1.5 text-sm font-medium whitespace-nowrap"
            >
              <Icon icon="mdi:download" className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={onPreview}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-sm text-gray-700 font-medium whitespace-nowrap"
            >
              <Icon icon="mdi:eye" className="w-4 h-4" />
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => !isDownloading && setIsDownloadModalOpen(false)}
        onDownload={handleDownload}
        isLoading={isDownloading}
      />
    </>
  )
}

export default ReportCard


