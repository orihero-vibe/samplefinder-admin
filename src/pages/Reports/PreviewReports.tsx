import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { DashboardLayout, DownloadModal } from '../../components'
import type { DownloadFormat } from '../../components'
import { exportService, type ReportType } from '../../lib/exportService'
import { useNotificationStore } from '../../stores/notificationStore'

const PreviewReports = () => {
  const navigate = useNavigate()
  const { reportId } = useParams<{ reportId: string }>()
  const [sortBy, setSortBy] = useState<string>('date')
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reportData, setReportData] = useState<{ columns: { header: string; key: string; getValue?: (row: Record<string, string | number>) => string | number }[]; rows: Record<string, string | number>[] } | null>(null)
  const { addNotification } = useNotificationStore()

  // Map reportId to ReportType
  const getReportType = (): ReportType => {
    const reportTypeMap: Record<string, ReportType> = {
      '1': 'dashboard-all',
      '2': 'dashboard-date-range',
      '3': 'event-list',
      '4': 'clients-brands',
      '5': 'app-users',
      '6': 'points-earned-all',
      '7': 'points-earned-all', // Points Earned with Date Range - same as all for now
    }
    return reportTypeMap[reportId || '1'] || 'dashboard-all'
  }

  // Get report name based on reportId
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

  // Load report data
  useEffect(() => {
    const loadReportData = async () => {
      try {
        setIsLoading(true)
        const reportType = getReportType()
        const data = await exportService.generateReportData(reportType)
        setReportData(data)
      } catch (error) {
        console.error('Error loading report data:', error)
        addNotification({
          type: 'error',
          title: 'Error Loading Report',
          message: 'Failed to load report data. Please try again.',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadReportData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId])

  const handleDownloadClick = () => {
    setIsDownloadModalOpen(true)
  }

  const handleDownload = async (format: DownloadFormat) => {
    try {
      const reportType = getReportType()
      const reportName = getReportName()
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `${reportName}_${timestamp}.${format}`

      if (format === 'csv') {
        await exportService.exportReport(reportType, filename)
        addNotification({
          type: 'success',
          title: 'Export Successful',
          message: `Report has been exported to ${filename}`,
        })
      } else if (format === 'pdf') {
        await exportService.exportReportToPDF(reportType, filename)
        addNotification({
          type: 'success',
          title: 'Export Successful',
          message: `Report has been exported to ${filename}`,
        })
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: error instanceof Error ? error.message : 'Failed to export report. Please try again.',
      })
    }
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSortBy = e.target.value
    setSortBy(newSortBy)
    
    // Sort report data if available
    if (reportData && reportData.rows.length > 0) {
      const sortedRows = [...reportData.rows].sort((a, b) => {
        const aValue = a[newSortBy] || ''
        const bValue = b[newSortBy] || ''
        
        // Try to compare as numbers first
        const aNum = Number(aValue)
        const bNum = Number(bValue)
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum
        }
        
        // Compare as strings
        return String(aValue).localeCompare(String(bValue))
      })
      
      setReportData({ ...reportData, rows: sortedRows })
    }
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
            {reportData && reportData.columns.length > 0 && (
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
                  {reportData.columns.map((col) => (
                    <option key={col.key} value={col.key}>
                      {col.header}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={handleDownloadClick}
              disabled={isLoading || !reportData}
              className="px-4 py-2 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1D0A74]"></div>
          </div>
        )}

        {/* Table */}
        {!isLoading && reportData && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {reportData.columns.map((col) => (
                      <th
                        key={col.key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={reportData.columns.length}
                        className="px-6 py-8 text-center text-sm text-gray-500"
                      >
                        No data available for this report
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {reportData.columns.map((col) => (
                          <td
                            key={col.key}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                          >
                            {col.getValue ? col.getValue(row) : row[col.key] || ''}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !reportData && (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <Icon icon="mdi:file-document-outline" className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Report Data Available
            </h3>
            <p className="text-sm text-gray-600">
              Unable to load report data. Please try again later.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default PreviewReports

