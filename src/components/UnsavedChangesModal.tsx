import { Icon } from '@iconify/react'

interface UnsavedChangesModalProps {
  isOpen: boolean
  onClose: () => void
  onDiscard: () => void
}

const UnsavedChangesModal = ({
  isOpen,
  onClose,
  onDiscard,
}: UnsavedChangesModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div 
        className="relative bg-white rounded-lg shadow-xl w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <Icon icon="mdi:alert-circle" className="w-20 h-20 text-orange-500" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            Unsaved Changes
          </h2>

          {/* Message */}
          <p className="text-sm text-gray-600 text-center mb-6">
            You have unsaved changes. Do you want to save them before closing?
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onDiscard}
              className="w-full px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Continue Editing
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UnsavedChangesModal
