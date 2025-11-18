import { Icon } from '@iconify/react'

export type DownloadFormat = 'csv' | 'pdf'

interface DownloadModalProps {
  isOpen: boolean
  onClose: () => void
  onDownload: (format: DownloadFormat) => void
  title?: string
  description?: string
}

const DownloadModal = ({
  isOpen,
  onClose,
  onDownload,
  title = 'Download Report',
  description = 'Choose a file format to download.',
}: DownloadModalProps) => {
  if (!isOpen) return null

  const handleDownload = (format: DownloadFormat) => {
    onDownload(format)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleDownload('csv')}
            className="w-full px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <Icon icon="mdi:file-excel" className="w-5 h-5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => handleDownload('pdf')}
            className="w-full px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <Icon icon="mdi:file-pdf-box" className="w-5 h-5" />
            Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default DownloadModal

