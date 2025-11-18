import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout, ShimmerPage, ConfirmationModal } from '../../components'
import type { ConfirmationType } from '../../components'
import {
  MetricsCards,
  SearchAndFilter,
  EventsTable,
  DashboardHeader,
  AddEventModal,
  EditEventModal,
  DateFilterModal,
  CSVUploadModal,
} from './components'

const Dashboard = () => {
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false)
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  })
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const metrics = [
    {
      label: 'Total Clients/Brands',
      value: '173',
      change: '+12%',
      changeLabel: 'from last month',
      icon: 'mdi:file-document',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Total Points Awarded',
      value: '134,215',
      change: '+8%',
      changeLabel: 'from last month',
      icon: 'mdi:ribbon',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Total Users',
      value: '5,000',
      change: '+15%',
      changeLabel: 'from last month',
      icon: 'mdi:account-group',
      iconBg: 'bg-purple-100',
      iconColor: 'text-[#1D0A74]',
    },
    {
      label: 'Average PPU',
      value: '925',
      change: '+5%',
      changeLabel: 'from last month',
      icon: 'mdi:trending-up',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Total Check-ins',
      value: '13,000',
      change: '+10%',
      changeLabel: 'from last month',
      icon: 'mdi:check-circle',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      label: 'Reviews',
      value: '11,520',
      change: '+7%',
      changeLabel: 'from last month',
      icon: 'mdi:star',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
    },
  ]

  const events = [
    {
      date: '06/15/2025',
      venueName: 'Summer Beauty Launch',
      brand: 'Glossier',
      startTime: '12:00 AM',
      endTime: '09:00 PM',
      discount: 'YES',
      status: 'Inactive',
      statusColor: 'bg-red-100 text-red-800',
    },
    {
      date: '06/15/2025',
      venueName: 'Fall Fragrance Event',
      brand: 'Chanel',
      startTime: '12:00 AM',
      endTime: '09:00 PM',
      discount: 'NO',
      status: 'Inactive',
      statusColor: 'bg-red-100 text-red-800',
    },
    {
      date: '06/15/2025',
      venueName: 'Fall Fragrance Event',
      brand: 'The Ordinary',
      startTime: '12:00 AM',
      endTime: '09:00 PM',
      discount: 'YES',
      status: 'Active',
      statusColor: 'bg-green-100 text-green-800',
    },
    {
      date: '06/15/2025',
      venueName: 'Skincare Workshop',
      brand: 'Fenty Beauty',
      startTime: '12:00 AM',
      endTime: '09:00 PM',
      discount: 'YES',
      status: 'Archived',
      statusColor: 'bg-gray-100 text-gray-800',
    },
    {
      date: '06/15/2025',
      venueName: 'API Documentation',
      brand: 'Fenty Beauty',
      startTime: '12:00 AM',
      endTime: '09:00 PM',
      discount: 'NO',
      status: 'Active',
      statusColor: 'bg-green-100 text-green-800',
    },
    {
      date: '06/15/2025',
      venueName: 'Fall Fragrance Event',
      brand: 'The Ordinary',
      startTime: '12:00 AM',
      endTime: '09:00 PM',
      discount: 'NO',
      status: 'Archived',
      statusColor: 'bg-gray-100 text-gray-800',
    },
    {
      date: '06/15/2025',
      venueName: 'Makeup Masterclass',
      brand: 'Chanel',
      startTime: '12:00 AM',
      endTime: '09:00 PM',
      discount: 'YES',
      status: 'Active',
      statusColor: 'bg-green-100 text-green-800',
    },
    {
      date: '06/15/2025',
      venueName: 'Summer Beauty Launch',
      brand: 'Glossier',
      startTime: '12:00 AM',
      endTime: '09:00 PM',
      discount: 'YES',
      status: 'Inactive',
      statusColor: 'bg-red-100 text-red-800',
    },
  ]

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
        <DashboardHeader />
        <MetricsCards metrics={metrics} />
        <SearchAndFilter
          onDateFilterClick={() => setIsDateFilterOpen(true)}
          dateRange={dateRange}
        />
        <EventsTable
          events={events}
          onEventClick={() => navigate('/event-reviews')}
          onEditClick={(event) => {
            setSelectedEvent(event)
            setIsEditModalOpen(true)
          }}
          onViewClick={() => navigate('/event-reviews')}
          onHideClick={(event) => {
            setSelectedEvent(event)
            setConfirmationModal({
              isOpen: true,
              type: 'hide',
              onConfirm: () => {
                console.log('Hide event:', event)
                // TODO: Implement hide functionality
              },
              itemName: `event "${event.venueName}"`,
            })
          }}
          onDeleteClick={(event) => {
            setSelectedEvent(event)
            setConfirmationModal({
              isOpen: true,
              type: 'delete',
              onConfirm: () => {
                console.log('Delete event:', event)
                // TODO: Implement delete functionality
              },
              itemName: `event "${event.venueName}"`,
            })
          }}
          onCSVUpload={() => setIsCSVUploadOpen(true)}
          onNewEvent={() => setIsModalOpen(true)}
        />
      </div>

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(eventData) => {
          console.log('Event data:', eventData)
          // TODO: Implement save functionality
          setIsModalOpen(false)
        }}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          setSelectedEvent(null)
        }}
        onSave={(eventData) => {
          console.log('Updated event data:', eventData)
          // TODO: Implement update functionality
          setIsEditModalOpen(false)
          setSelectedEvent(null)
        }}
        onShowArchiveConfirm={() => {
          setConfirmationModal({
            isOpen: true,
            type: 'archive',
            onConfirm: () => {
              console.log('Archive event:', selectedEvent)
              // TODO: Implement archive functionality
              setIsEditModalOpen(false)
              setSelectedEvent(null)
            },
            itemName: 'this event',
          })
        }}
        onShowHideConfirm={() => {
          setConfirmationModal({
            isOpen: true,
            type: 'hide',
            onConfirm: () => {
              console.log('Hide event:', selectedEvent)
              // TODO: Implement hide functionality
              setIsEditModalOpen(false)
              setSelectedEvent(null)
            },
            itemName: 'this event',
          })
        }}
        onShowDeleteConfirm={() => {
          setConfirmationModal({
            isOpen: true,
            type: 'delete',
            onConfirm: () => {
              console.log('Delete event:', selectedEvent)
              // TODO: Implement delete functionality
              setIsEditModalOpen(false)
              setSelectedEvent(null)
            },
            itemName: 'this event',
          })
        }}
        initialData={
          selectedEvent
            ? {
                eventName: selectedEvent.venueName,
                eventDate: selectedEvent.date,
                startTime: selectedEvent.startTime,
                endTime: selectedEvent.endTime,
                city: 'New York',
                discount: selectedEvent.discount === 'YES' ? 'Yes' : 'No',
                productTypes: ['Product 1', 'Product 2', 'Lana'],
                products: ['Snack'],
                eventInfo: 'Great Event at Brighton Beach',
              }
            : undefined
        }
      />

      {/* Date Filter Modal */}
      <DateFilterModal
        isOpen={isDateFilterOpen}
        onClose={() => setIsDateFilterOpen(false)}
        onSelect={(startDate: Date | null, endDate: Date | null) => {
          setDateRange({ start: startDate, end: endDate })
          // TODO: Apply date filter to events
          console.log('Date range selected:', { startDate, endDate })
        }}
        initialStartDate={dateRange.start}
        initialEndDate={dateRange.end}
      />

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={isCSVUploadOpen}
        onClose={() => setIsCSVUploadOpen(false)}
        onUpload={(file) => {
          console.log('CSV file uploaded:', file.name)
          // TODO: Implement CSV parsing and event creation
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

export default Dashboard

