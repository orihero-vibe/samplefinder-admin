import { Icon } from '@iconify/react'

interface UnsavedChangesModalProps {
  isOpen: boolean
  onClose: () => void
  onDiscard: () => void
  onSave: () => void
  isSaving?: boolean
}

const UnsavedChangesModal = ({
  isOpen,
  onClose,
  onDiscard,
  onSave,
  isSaving = false,
}: UnsavedChangesModalProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={isSaving ? undefined : onClose}
      />

      {/* Modal */}
      <div 
        className="relative bg-white rounded-lg shadow-xl w-full max-w-md m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            {isSaving ? (
              <Icon icon="mdi:loading" className="w-20 h-20 text-orange-500 animate-spin" />
            ) : (
              <Icon icon="mdi:alert-circle" className="w-20 h-20 text-orange-500" />
            )}
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
              onClick={onSave}
              disabled={isSaving}
              className="w-full px-6 py-3 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving && <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onDiscard}
              disabled={isSaving}
              className="w-full px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-full px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
