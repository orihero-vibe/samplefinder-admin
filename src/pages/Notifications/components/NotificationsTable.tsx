import { Icon } from '@iconify/react'

interface Notification {
  id: string
  title: string
  target: 'Targeted' | 'All'
  timing: string
  type: 'Event Reminder' | 'Promotional' | 'Engagement'
  recipients: number
  date: string
  status: 'Scheduled' | 'Sent'
}

interface NotificationsTableProps {
  notifications: Notification[]
  onEditClick: (notification: Notification) => void
  onDuplicateClick: (notification: Notification) => void
  onDeleteClick: (notification: Notification) => void
}

const NotificationsTable = ({
  notifications,
  onEditClick,
  onDuplicateClick,
  onDeleteClick,
}: NotificationsTableProps) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Event Reminder':
        return 'bg-red-100 text-red-800'
      case 'Promotional':
        return 'bg-green-100 text-green-800'
      case 'Engagement':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-red-100 text-red-800'
      case 'Sent':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:help-circle-outline" className="w-4 h-4" />
                  Notification
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:help-circle-outline" className="w-4 h-4" />
                  Target
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:help-circle-outline" className="w-4 h-4" />
                  Timing
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:help-circle-outline" className="w-4 h-4" />
                  Type
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:help-circle-outline" className="w-4 h-4" />
                  Recipients
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:help-circle-outline" className="w-4 h-4" />
                  Date
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:help-circle-outline" className="w-4 h-4" />
                  Status
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {notifications.map((notification) => (
              <tr key={notification.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {notification.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {notification.target}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {notification.timing}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                      notification.type
                    )}`}
                  >
                    {notification.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {notification.recipients}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {notification.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      notification.status
                    )}`}
                  >
                    {notification.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onEditClick(notification)}
                      className="hover:text-blue-600 transition-colors"
                      title="Edit"
                    >
                      <Icon icon="mdi:pencil" className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDuplicateClick(notification)}
                      className="hover:text-purple-600 transition-colors"
                      title="Duplicate"
                    >
                      <Icon icon="mdi:content-copy" className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDeleteClick(notification)}
                      className="hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Icon icon="mdi:trash-can" className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default NotificationsTable

