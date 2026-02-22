import { Icon } from '@iconify/react'

export type DownloadFormat = 'csv' | 'pdf'

interface DownloadModalProps {
  isOpen: boolean
  onClose: () => void
  onDownload: (format: DownloadFormat) => void
  title?: string
  description?: string
  isLoading?: boolean
}

const DownloadModal = ({
  isOpen,
  onClose,
  onDownload,
  title = 'Download Report',
  description = 'Choose a file format to download.',
  isLoading = false,
}: DownloadModalProps) => {
  if (!isOpen) return null

  const handleDownload = (format: DownloadFormat) => {
    onDownload(format)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isLoading ? onClose : undefined}
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
            disabled={isLoading}
            className={`text-gray-400 hover:text-gray-600 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Icon icon="mdi:close" className="w-6 h-6" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-6 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Icon icon="mdi:loading" className="w-10 h-10 text-[#1D0A74] animate-spin" />
              <p className="text-gray-600 font-medium">Generating report...</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleDownload('csv')}
                className="w-full px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icon icon="mdi:file-excel" className="w-5 h-5" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => handleDownload('pdf')}
                className="w-full px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icon icon="mdi:file-pdf-box" className="w-5 h-5" />
                Export PDF
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default DownloadModal

