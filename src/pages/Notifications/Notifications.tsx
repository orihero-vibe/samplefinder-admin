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
import { statisticsService, type NotificationsStats } from '../../lib/services'
import { useNotificationStore } from '../../stores/notificationStore'

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

const Notifications = () => {
  const { addNotification } = useNotificationStore()
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [sortBy, setSortBy] = useState('Date')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [statistics, setStatistics] = useState<NotificationsStats | null>(null)
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
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    fetchStatistics()

    return () => clearTimeout(timer)
  }, [])

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

  const notifications: Notification[] = [
    {
      id: '1',
      title: 'New Event Alert: Fashion Week NYC',
      target: 'Targeted',
      timing: '5:40 am',
      type: 'Event Reminder',
      recipients: 130,
      date: '05/15/2020',
      status: 'Scheduled',
    },
    {
      id: '2',
      title: 'Weekend Bonus Points',
      target: 'All',
      timing: '5:40 am',
      type: 'Event Reminder',
      recipients: 357,
      date: '05/15/2020',
      status: 'Scheduled',
    },
    {
      id: '3',
      title: "You're Almost Gold Tier!",
      target: 'All',
      timing: '8:20 am',
      type: 'Promotional',
      recipients: 740,
      date: '05/15/2020',
      status: 'Sent',
    },
    {
      id: '4',
      title: 'New Brand Partner: Premium Cosmetics',
      target: 'Targeted',
      timing: '6:45 am',
      type: 'Engagement',
      recipients: 154,
      date: '05/15/2020',
      status: 'Scheduled',
    },
    {
      id: '5',
      title: 'Weekly Event Digest',
      target: 'All',
      timing: '5:40 am',
      type: 'Promotional',
      recipients: 826,
      date: '05/15/2020',
      status: 'Sent',
    },
    {
      id: '6',
      title: 'Check-In Reminder',
      target: 'Targeted',
      timing: '5:45 am',
      type: 'Engagement',
      recipients: 447,
      date: '05/15/2020',
      status: 'Scheduled',
    },
    {
      id: '7',
      title: 'Cameron',
      target: 'Targeted',
      timing: '7:30 am',
      type: 'Promotional',
      recipients: 583,
      date: '05/15/2020',
      status: 'Sent',
    },
    {
      id: '8',
      title: 'Survey: Help Us Improve',
      target: 'All',
      timing: '7:30 am',
      type: 'Event Reminder',
      recipients: 185,
      date: '05/15/2020',
      status: 'Scheduled',
    },
  ]

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch = notification.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'All Types' || notification.type === typeFilter
    return matchesSearch && matchesType
  })

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    if (sortBy === 'Date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
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
              onConfirm: () => {
                console.log('Delete notification:', notification)
                // TODO: Implement delete functionality
                setConfirmationModal({ ...confirmationModal, isOpen: false })
              },
              itemName: `notification "${notification.title}"`,
            })
          }}
        />
      </div>

      {/* Create Notification Modal */}
      <CreateNotificationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={(notificationData) => {
          console.log('Notification data:', notificationData)
          // TODO: Implement save functionality
          setIsCreateModalOpen(false)
        }}
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

