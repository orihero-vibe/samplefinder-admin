import { Icon } from '@iconify/react'

export type ConfirmationType = 'delete' | 'archive' | 'hide'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  type: ConfirmationType
  title?: string
  message?: string
  itemName?: string // e.g., "client", "event" - for dynamic titles
}

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  message,
  itemName = 'item',
}: ConfirmationModalProps) => {
  if (!isOpen) return null

  // Configuration for each type
  const configs = {
    delete: {
      icon: 'mdi:trash-can',
      iconColor: 'text-red-500',
      iconBg: 'bg-red-50',
      buttonBg: 'bg-red-500 hover:bg-red-600',
      defaultTitle: `Are you sure you want to delete ${itemName}?`,
      defaultMessage: `All information about ${itemName} will be lost.`,
      confirmText: 'Yes, delete',
    },
    archive: {
      icon: 'mdi:cloud-upload',
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-50',
      buttonBg: 'bg-orange-500 hover:bg-orange-600',
      defaultTitle: 'Are you sure you want to archive?',
      defaultMessage: 'All data about your event will be archived.',
      confirmText: 'Yes, archive',
    },
    hide: {
      icon: 'mdi:eye-off',
      iconColor: 'text-green-500',
      iconBg: 'bg-green-50',
      buttonBg: 'bg-[#1D0A74] hover:bg-[#15065c]',
      defaultTitle: 'Are you sure you want to hide?',
      defaultMessage: 'All data about your event will be hidden.',
      confirmText: 'Yes, hide',
    },
  }

  const config = configs[type]

  const handleConfirm = () => {
    onConfirm()
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
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <Icon icon={config.icon} className={`w-20 h-20 ${config.iconColor}`} />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            {title || config.defaultTitle}
          </h2>

          {/* Message */}
          <p className="text-sm text-gray-600 text-center mb-6">
            {message || config.defaultMessage}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`flex-1 px-6 py-3 ${config.buttonBg} text-white rounded-lg transition-colors font-semibold`}
            >
              {config.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationModal

