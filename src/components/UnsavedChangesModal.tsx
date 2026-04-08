import { Icon } from '@iconify/react'

interface UnsavedChangesModalProps {
  isOpen: boolean
  onDiscard: () => void
  onSave?: () => void
  onCancel?: () => void
  title?: string
  message?: string
  saveLabel?: string
  discardLabel?: string
  cancelLabel?: string
}

const UnsavedChangesModal = ({
  isOpen,
  onDiscard,
  onSave,
  onCancel,
  title = 'Unsaved Changes',
  message = 'You have unsaved changes. What would you like to do?',
  saveLabel = 'Save',
  discardLabel = 'Discard',
  cancelLabel = 'Continue Editing',
}: UnsavedChangesModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <Icon icon="mdi:alert-circle" className="w-20 h-20 text-orange-500" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            {title}
          </h2>

          {/* Message */}
          <p className="text-sm text-gray-600 text-center mb-6">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                className="w-full px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold"
              >
                {saveLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onDiscard}
              className="w-full px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
            >
              {discardLabel}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UnsavedChangesModal
