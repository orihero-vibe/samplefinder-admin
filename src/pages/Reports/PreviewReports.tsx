import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { DashboardLayout, DownloadModal } from '../../components'
import type { DownloadFormat } from '../../components'

interface ReportEvent {
  id: string
  eventName: string
  date: string
  brand: string
  startTime: string
  endTime: string
  discount: string
  productType: string
}

const PreviewReports = () => {
  const navigate = useNavigate()
  const { reportId } = useParams<{ reportId: string }>()
  const [sortBy, setSortBy] = useState<string>('date')
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)

  // Mock data - in real app, this would come from API based on reportId
  const reportEvents: ReportEvent[] = [
    {
      id: '1',
      eventName: 'Summer Beauty Launch',
      date: '05/15/2020',
      brand: 'Glossier',
      startTime: '12:00 AM',
      endTime: '09:00 PM',
      discount: 'YES',
      productType: 'Beauty',
    },
    {
      id: '2',
      eventName: 'Fall Fragrance Event',
      date: '05/15/2020',
      brand: 'Chanel',
      startTime: '12:00 AM',
      endTime: '09:00 PM',
      discount: 'YES',
      productType: 'Fragrance',
    },
    {
      id: '3',
      eventName: 'Skincare Workshop',
      date: '05/15/2020',
      brand: 'The Ordinary',
      startTime: '12:00 AM',
      endTime: '09:00 PM',
      discount: 'YES',
      productType: 'Skincare',
    },
    {
      id: '4',
      eventName: 'API Documentation',
      date: '05/15/2020',
      brand: 'Fenty Beauty',
      startTime: '12:00 AM',
      endTime: '09:00 PM',
      discount: 'YES',
      productType: 'Beauty',
    },
    {
      id: '5',
      eventName: 'Makeup Masterclass',
      date: '05/15/2020',
      brand: 'Chanel',
      startTime: '12:00 AM',
      endTime: '09:00 PM',
      discount: 'YES',
      productType: 'Makeup',
    },
  ]

  const handleDownloadClick = () => {
    setIsDownloadModalOpen(true)
  }

  const handleDownload = (format: DownloadFormat) => {
    // TODO: Implement download functionality
    console.log(`Download report as ${format.toUpperCase()}`)
    // Here you would typically call an API endpoint to download the report
    // Example: downloadReport(reportId, format)
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value)
    // TODO: Implement sorting logic
  }

  // Get report name based on reportId - in real app, fetch from API
  const getReportName = () => {
    const reportNames: Record<string, string> = {
      '1': 'Dashboard (All)',
      '2': 'Dashboard (Date range)',
      '3': 'Event List',
      '4': 'Clients & Brands (All)',
      '5': 'App Users (All)',
      '6': 'Points Earned (All)',
      '7': 'Points Earned (Date Range)',
    }
    return reportNames[reportId || '1'] || 'Dashboard (All)'
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <button
            onClick={() => navigate('/reports')}
            className="hover:text-gray-900 transition-colors"
          >
            Reports
          </button>
          <Icon icon="mdi:chevron-right" className="w-4 h-4" />
          <span className="text-gray-900">Preview Reports Dashboard</span>
        </div>

        {/* Header with Title, Sort, and Download */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Preview Reports ({getReportName()})
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-gray-600 whitespace-nowrap">
                Sort by:
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={handleSortChange}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Date</option>
                <option value="eventName">Event Name</option>
                <option value="brand">Brand</option>
              </select>
            </div>
            <button
              onClick={handleDownloadClick}
              className="px-4 py-2 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors flex items-center gap-2"
            >
              <Icon icon="mdi:download" className="w-5 h-5" />
              Download
            </button>
          </div>
        </div>

        {/* Download Modal */}
        <DownloadModal
          isOpen={isDownloadModalOpen}
          onClose={() => setIsDownloadModalOpen(false)}
          onDownload={handleDownload}
        />

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brand
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Discount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.eventName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.brand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.startTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.endTime}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.discount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.productType}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default PreviewReports

