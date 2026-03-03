import { Icon } from '@iconify/react'
import { Pagination } from '../../../components'

interface Notification {
  id: string
  title: string
  target: string
  timing: string
  type: 'Event Reminder' | 'Promotional' | 'Engagement'
  category?: 'AppPush' | 'SystemPush'
  recipients: number
  date: string
  status: 'Scheduled' | 'Sent' | 'Draft'
}

interface NotificationsTableProps {
  notifications: Notification[]
  isLoading?: boolean
  onEditClick: (notification: Notification) => void
  onDuplicateClick: (notification: Notification) => void
  onDeleteClick: (notification: Notification) => void
  currentPage?: number
  totalPages?: number
  totalNotifications?: number
  pageSize?: number
  onPageChange?: (page: number) => void
}

const NotificationsTable = ({
  notifications,
  isLoading = false,
  onEditClick,
  onDuplicateClick,
  onDeleteClick,
  currentPage = 1,
  totalPages = 0,
  totalNotifications = 0,
  pageSize = 25,
  onPageChange,
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
        return 'bg-yellow-100 text-yellow-800'
      case 'Sent':
        return 'bg-green-100 text-green-800'
      case 'Draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryBadge = (category?: string) => {
    if (category === 'SystemPush') {
      return { label: 'System Push', className: 'bg-purple-100 text-purple-800' }
    }
    return { label: 'App Push', className: 'bg-blue-100 text-blue-800' }
  }

  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'All':
        return 'All Users'
      case 'NewUsers':
        return 'New Users'
      case 'BrandAmbassadors':
        return 'Certified Brand Ambassadors (BA)'
      case 'Influencers':
        return 'Certified Influencers'
      case 'Tier1':
        return 'Tier 1 Users - NewbieSamplers'
      case 'Tier2':
        return 'Tier 2 Users - SampleFans'
      case 'Tier3':
        return 'Tier 3 Users - SuperSamplers'
      case 'Tier4':
        return 'Tier 4 Users - VIS'
      case 'Tier5':
        return 'Tier 5 Users - SampleMasters'
      case 'ZipCode':
        return 'Specific Zip Code Area'
      case 'Targeted':
        return 'Specific Users'
      default:
        return target
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
                  Category
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
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Icon icon="mdi:loading" className="w-6 h-6 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : (
            notifications.map((notification) => (
              <tr key={notification.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {notification.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {(() => {
                    const badge = getCategoryBadge(notification.category)
                    return (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    )
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getTargetLabel(notification.target)}
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
            )) )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {onPageChange && totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalNotifications}
          pageSize={pageSize}
          itemLabel="notifications"
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

export default NotificationsTable

