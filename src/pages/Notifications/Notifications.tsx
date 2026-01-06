import { useState, useEffect } from 'react'
import { DashboardLayout, ShimmerPage, ConfirmationModal } from '../../components'
import type { ConfirmationType } from '../../components'
import {
  NotificationsHeader,
  StatsCards,
  SearchAndFilter,
  NotificationsTable,
  CreateNotificationModal,
} from './components'
import { statisticsService, notificationsService, type NotificationsStats, type NotificationDocument, type NotificationFormData } from '../../lib/services'
import { useNotificationStore } from '../../stores/notificationStore'
import { Query } from '../../lib/appwrite'

interface Notification {
  id: string
  title: string
  target: 'Targeted' | 'All' | 'Specific Segment'
  timing: string
  type: 'Event Reminder' | 'Promotional' | 'Engagement'
  recipients: number
  date: string
  status: 'Scheduled' | 'Sent' | 'Draft'
}

const Notifications = () => {
  const { addNotification } = useNotificationStore()
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [sortBy, setSortBy] = useState('Date')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [statistics, setStatistics] = useState<NotificationsStats | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean
    type: ConfirmationType
    onConfirm: () => void
    itemName?: string
  }>({
    isOpen: false,
    type: 'delete',
    onConfirm: () => {},
  })

  // Convert NotificationDocument to UI Notification format
  const convertNotification = (doc: NotificationDocument): Notification => {
    const date = doc.sentAt || doc.scheduledAt || doc.$createdAt
    const dateObj = new Date(date)
    const timing = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    
    // Map target audience for display
    let targetDisplay: 'Targeted' | 'All' | 'Specific Segment' = doc.targetAudience
    if (doc.targetAudience === 'Targeted') {
      targetDisplay = 'Targeted'
    } else if (doc.targetAudience === 'All') {
      targetDisplay = 'All'
    } else {
      targetDisplay = 'Specific Segment'
    }
    
    return {
      id: doc.$id,
      title: doc.title,
      target: targetDisplay,
      timing,
      type: doc.type,
      recipients: doc.recipients || 0,
      date: formattedDate,
      status: doc.status,
    }
  }

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const queries: string[] = []
      
      // Add type filter if not "All Types"
      if (typeFilter !== 'All Types') {
        queries.push(Query.equal('type', [typeFilter]))
      }
      
      // Order by creation date (newest first)
      queries.push(Query.orderDesc('$createdAt'))
      
      const response = await notificationsService.list(queries)
      
      // Filter by search query on client side (since search might not work with all Appwrite setups)
      let filteredDocs = response.documents
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        filteredDocs = response.documents.filter(
          (doc) =>
            doc.title.toLowerCase().includes(searchLower) ||
            doc.message.toLowerCase().includes(searchLower)
        )
      }
      
      const convertedNotifications = filteredDocs.map(convertNotification)
      setNotifications(convertedNotifications)
    } catch (err) {
      console.error('Error fetching notifications:', err)
      addNotification({
        type: 'error',
        title: 'Error Loading Notifications',
        message: 'Failed to load notifications. Please refresh the page.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const stats = await statisticsService.getStatistics<NotificationsStats>('notifications')
      setStatistics(stats)
    } catch (err) {
      console.error('Error fetching statistics:', err)
      addNotification({
        type: 'error',
        title: 'Error Loading Statistics',
        message: 'Failed to load notifications statistics. Please refresh the page.',
      })
    }
  }

  useEffect(() => {
    fetchStatistics()
    fetchNotifications()
  }, [])

  // Refetch notifications when search or filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchNotifications()
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchQuery, typeFilter])

  const stats = statistics
    ? [
        {
          label: 'Total Sent',
          value: statistics.totalSent.toLocaleString('en-US'),
          icon: 'mdi:file-document',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
        },
        {
          label: 'Avg. Open Rate',
          value: `${statistics.avgOpenRate}%`,
          icon: 'mdi:star-four-points',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
        },
        {
          label: 'Avg. Click Rate',
          value: `${statistics.avgClickRate}%`,
          icon: 'mdi:trending-up',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
        },
        {
          label: 'Scheduled',
          value: statistics.scheduled.toLocaleString('en-US'),
          icon: 'mdi:trending-up',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
        },
      ]
    : [
        {
          label: 'Total Sent',
          value: '0',
          icon: 'mdi:file-document',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
        },
        {
          label: 'Avg. Open Rate',
          value: '0%',
          icon: 'mdi:star-four-points',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
        },
        {
          label: 'Avg. Click Rate',
          value: '0%',
          icon: 'mdi:trending-up',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
        },
        {
          label: 'Scheduled',
          value: '0',
          icon: 'mdi:trending-up',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
        },
      ]

  // Handle save notification
  const handleSaveNotification = async (notificationData: NotificationFormData) => {
    try {
      setIsSaving(true)
      await notificationsService.create(notificationData)
      
      addNotification({
        type: 'success',
        title: 'Notification Created',
        message: notificationData.schedule === 'Send Immediately' 
          ? 'Notification has been sent successfully.' 
          : 'Notification has been scheduled successfully.',
      })
      
      // Refresh notifications and statistics
      await Promise.all([fetchNotifications(), fetchStatistics()])
      setIsCreateModalOpen(false)
    } catch (error: any) {
      console.error('Error creating notification:', error)
      addNotification({
        type: 'error',
        title: 'Error Creating Notification',
        message: error.message || 'Failed to create notification. Please try again.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete notification
  const handleDeleteNotification = async (notification: Notification) => {
    try {
      await notificationsService.delete(notification.id)
      
      addNotification({
        type: 'success',
        title: 'Notification Deleted',
        message: 'Notification has been deleted successfully.',
      })
      
      // Refresh notifications and statistics
      await Promise.all([fetchNotifications(), fetchStatistics()])
      setConfirmationModal({ ...confirmationModal, isOpen: false })
    } catch (error: any) {
      console.error('Error deleting notification:', error)
      addNotification({
        type: 'error',
        title: 'Error Deleting Notification',
        message: error.message || 'Failed to delete notification. Please try again.',
      })
      setConfirmationModal({ ...confirmationModal, isOpen: false })
    }
  }

  const sortedNotifications = [...notifications].sort((a, b) => {
    if (sortBy === 'Date') {
      // Parse date strings (MM/DD/YYYY format)
      // Handle date parsing more carefully
      const parseDate = (dateStr: string): Date => {
        const [month, day, year] = dateStr.split('/')
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
      const dateA = parseDate(a.date)
      const dateB = parseDate(b.date)
      return dateB.getTime() - dateA.getTime()
    }
    return 0
  })

  if (isLoading) {
    return (
      <DashboardLayout>
        <ShimmerPage />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <NotificationsHeader onCreateNotification={() => setIsCreateModalOpen(true)} />
        <StatsCards stats={stats} />
        <SearchAndFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />
        <NotificationsTable
          notifications={sortedNotifications}
          onEditClick={(notification) => {
            console.log('Edit notification:', notification)
            // TODO: Implement edit functionality
          }}
          onDuplicateClick={(notification) => {
            console.log('Duplicate notification:', notification)
            // TODO: Implement duplicate functionality
          }}
          onDeleteClick={(notification) => {
            setConfirmationModal({
              isOpen: true,
              type: 'delete',
              onConfirm: () => handleDeleteNotification(notification),
              itemName: `notification "${notification.title}"`,
            })
          }}
        />
      </div>

      {/* Create Notification Modal */}
      <CreateNotificationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveNotification}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
        onConfirm={confirmationModal.onConfirm}
        type={confirmationModal.type}
        itemName={confirmationModal.itemName}
      />
    </DashboardLayout>
  )
}

export default Notifications

