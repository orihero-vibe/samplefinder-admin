import { Icon } from '@iconify/react'

interface NotificationsHeaderProps {
  onCreateNotification: () => void
}

const NotificationsHeader = ({ onCreateNotification }: NotificationsHeaderProps) => {
  return (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification Settings</h1>
        <p className="text-gray-600">Manage your admin panel preferences.</p>
      </div>
      <button
        onClick={onCreateNotification}
        className="px-4 py-2 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors flex items-center gap-2"
      >
        <Icon icon="mdi:plus" className="w-4 h-4" />
        Create Notification
      </button>
    </div>
  )
}

export default NotificationsHeader

