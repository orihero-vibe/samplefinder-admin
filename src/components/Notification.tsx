import { Icon } from '@iconify/react'
import { useNotificationStore, type NotificationType } from '../stores/notificationStore'

const Notification = () => {
  const { notifications, removeNotification } = useNotificationStore()

  const getNotificationStyles = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'mdi:check-circle',
          iconColor: 'text-green-600',
          titleColor: 'text-green-900',
          messageColor: 'text-green-700',
        }
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'mdi:alert-circle',
          iconColor: 'text-red-600',
          titleColor: 'text-red-900',
          messageColor: 'text-red-700',
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'mdi:alert',
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-900',
          messageColor: 'text-yellow-700',
        }
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'mdi:information',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-900',
          messageColor: 'text-blue-700',
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'mdi:information',
          iconColor: 'text-gray-600',
          titleColor: 'text-gray-900',
          messageColor: 'text-gray-700',
        }
    }
  }

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {notifications.map((notification) => {
        const styles = getNotificationStyles(notification.type)
        return (
          <div
            key={notification.id}
            className={`${styles.bg} ${styles.border} border rounded-lg shadow-lg p-4 animate-slide-in`}
          >
            <div className="flex items-start gap-3">
              <div className={`${styles.iconColor} flex-shrink-0 mt-0.5`}>
                <Icon icon={styles.icon} className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`${styles.titleColor} font-semibold text-sm mb-1`}>
                  {notification.title}
                </h3>
                {notification.message && (
                  <p className={`${styles.messageColor} text-xs`}>
                    {notification.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className={`${styles.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
              >
                <Icon icon="mdi:close" className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Notification

