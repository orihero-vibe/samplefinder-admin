import { useState, useEffect, useCallback } from 'react'
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
import { Pagination } from '../../components'

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
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(25)
  const [totalNotifications, setTotalNotifications] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
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

  // Fetch notifications with pagination
  const fetchNotifications = useCallback(async (page: number = currentPage) => {
    try {
      setIsLoading(true)
      const queries: string[] = []
      
      // Add type filter if not "All Types"
      if (typeFilter !== 'All Types') {
        queries.push(Query.equal('type', [typeFilter]))
      }
      
      // Order by creation date (newest first)
      queries.push(Query.orderDesc('$createdAt'))
      
      // Add pagination queries
      queries.push(Query.limit(pageSize))
      queries.push(Query.offset((page - 1) * pageSize))
      
      const response = await notificationsService.list(queries)
      
      // Extract pagination metadata (before client-side filtering)
      const total = response.total
      const totalPagesCount = Math.ceil(total / pageSize)
      setTotalNotifications(total)
      setTotalPages(totalPagesCount)
      
      // Handle edge case: if current page exceeds total pages, reset to last valid page or page 1
      if (totalPagesCount > 0 && page > totalPagesCount) {
        const lastValidPage = totalPagesCount
        setCurrentPage(lastValidPage)
        if (page !== lastValidPage) {
          return fetchNotifications(lastValidPage)
        }
      } else if (totalPagesCount === 0) {
        setCurrentPage(1)
      }
      
      // Filter by search query on client side (since search might not work with all Appwrite setups)
      // Note: This filters the paginated results, so pagination shows pages of filtered results
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
      setCurrentPage(page)
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
  }, [typeFilter, searchQuery, addNotification, currentPage, pageSize])

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchNotifications(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
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
  }, [addNotification])

  useEffect(() => {
    fetchStatistics()
  }, [fetchStatistics])

  // Reset to page 1 and refetch notifications when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
    const timeoutId = setTimeout(() => {
      fetchNotifications(1)
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchQuery, typeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

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
      await notificationsService.create(notificationData)
      
      addNotification({
        type: 'success',
        title: 'Notification Created',
        message: notificationData.schedule === 'Send Immediately' 
          ? 'Notification has been sent successfully.' 
          : 'Notification has been scheduled successfully.',
      })
      
      // Refresh notifications and statistics - reset to page 1 after creating
      setCurrentPage(1)
      await Promise.all([fetchNotifications(1), fetchStatistics()])
      setIsCreateModalOpen(false)
    } catch (error: unknown) {
      console.error('Error creating notification:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create notification. Please try again.'
      addNotification({
        type: 'error',
        title: 'Error Creating Notification',
        message: errorMessage,
      })
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
      
      // Refresh notifications and statistics - check if we need to go back a page
      if (notifications.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
        await Promise.all([fetchNotifications(currentPage - 1), fetchStatistics()])
      } else {
        await Promise.all([fetchNotifications(currentPage), fetchStatistics()])
      }
      setConfirmationModal({ ...confirmationModal, isOpen: false })
    } catch (error: unknown) {
      console.error('Error deleting notification:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete notification. Please try again.'
      addNotification({
        type: 'error',
        title: 'Error Deleting Notification',
        message: errorMessage,
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
          currentPage={currentPage}
          totalPages={totalPages}
          totalNotifications={totalNotifications}
          pageSize={pageSize}
          onPageChange={handlePageChange}
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

