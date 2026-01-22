import { Icon } from '@iconify/react'
import { Pagination } from '../../../components'

interface Event {
  date: string
  venueName: string
  brand: string
  startTime: string
  endTime: string
  discount: string
  status: string
  statusColor: string
  id?: string // Add optional id for database reference
  radius?: number // Radius field from database
}

interface EventsTableProps {
  events: Event[]
  onEventClick: (event: Event) => void
  onEditClick: (event: Event) => void
  onViewClick?: (event: Event) => void
  onHideClick: (event: Event) => void
  onDeleteClick: (event: Event) => void
  onCSVUpload: () => void
  onNewEvent: () => void
  currentPage?: number
  totalPages?: number
  totalEvents?: number
  pageSize?: number
  onPageChange?: (page: number) => void
}

const EventsTable = ({
  events,
  onEventClick,
  onEditClick,
  onViewClick,
  onHideClick,
  onDeleteClick,
  onCSVUpload,
  onNewEvent,
  currentPage = 1,
  totalPages = 0,
  totalEvents = 0,
  pageSize = 25,
  onPageChange,
}: EventsTableProps) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
        <div className="flex gap-3">
          <button
            onClick={onCSVUpload}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Icon icon="mdi:upload" className="w-4 h-4" />
            CSV Upload Events
          </button>
          <button
            onClick={onNewEvent}
            className="px-4 py-2 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors flex items-center gap-2"
          >
            <Icon icon="mdi:plus" className="w-4 h-4" />
            New Event
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:pin" className="w-4 h-4" />
                  Date
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:pin" className="w-4 h-4" />
                  Venue Name
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:pin" className="w-4 h-4" />
                  Brand
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:pin" className="w-4 h-4" />
                  Start Time
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:pin" className="w-4 h-4" />
                  End Time
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:pin" className="w-4 h-4" />
                  Discount
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:pin" className="w-4 h-4" />
                  Status
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {events.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center">
                    <Icon icon="mdi:calendar-remove" className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-1">No events found</p>
                    <p className="text-gray-500">Get started by creating a new event.</p>
                  </div>
                </td>
              </tr>
            ) : (
              events.map((event, index) => (
              <tr
                key={index}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest('button')) {
                    return
                  }
                  onEventClick(event)
                }}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.venueName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.brand}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.startTime}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.endTime}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{event.discount}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${event.statusColor}`}>
                    {event.status}
                  </span>
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3">
                    <button
                      className="hover:text-gray-900 transition-colors"
                      onClick={() => onHideClick(event)}
                    >
                      <Icon icon="mdi:eye" className="w-5 h-5" />
                    </button>
                    <button
                      className="hover:text-gray-900 transition-colors"
                      onClick={() => onEditClick(event)}
                    >
                      <Icon icon="mdi:pencil" className="w-5 h-5" />
                    </button>
                    <button
                      className="hover:text-red-600 transition-colors"
                      onClick={() => onDeleteClick(event)}
                    >
                      <Icon icon="mdi:trash-can" className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {onPageChange && totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalEvents}
          pageSize={pageSize}
          itemLabel="events"
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

export default EventsTable

