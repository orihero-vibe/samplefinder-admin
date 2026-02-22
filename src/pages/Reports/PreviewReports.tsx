import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { DashboardLayout, DownloadModal } from '../../components'
import type { DownloadFormat } from '../../components'
import { exportService, type ReportType } from '../../lib/exportService'
import { useNotificationStore } from '../../stores/notificationStore'

const REPORT_PAGE_SIZE = 50

const PreviewReports = () => {
  const navigate = useNavigate()
  const { reportId } = useParams<{ reportId: string }>()
  const [searchParams] = useSearchParams()
  const [sortBy, setSortBy] = useState<string>('date')
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [reportData, setReportData] = useState<{ columns: { header: string; key: string; getValue?: (row: Record<string, string | number>) => string | number }[]; rows: Record<string, string | number>[] } | null>(null)
  const { addNotification } = useNotificationStore()

  // Date filter from Reports menu (passed via URL ?start=...&end=...)
  const dateRange = useMemo(() => {
    const startStr = searchParams.get('start')
    const endStr = searchParams.get('end')
    const start = startStr ? new Date(startStr) : null
    const end = endStr ? new Date(endStr) : null
    if ((start && isNaN(start.getTime())) || (end && isNaN(end.getTime()))) {
      return { start: null as Date | null, end: null as Date | null }
    }
    return { start, end }
  }, [searchParams])

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

  // Load report data (with date filter when applicable)
  useEffect(() => {
    const loadReportData = async () => {
      try {
        setIsLoading(true)
        setCurrentPage(1)
        const reportType = getReportType()
        const useDateRange = (dateRange.start && dateRange.end) ? dateRange : undefined
        const data = await exportService.generateReportData(reportType, useDateRange)
        if (data?.columns?.length && data?.rows?.length) {
          const columnKeys = data.columns.map((c) => c.key)
          const effectiveSortBy = columnKeys.includes(sortBy)
            ? sortBy
            : columnKeys[0]
          const sortedRows = sortRowsByKey(data.rows, effectiveSortBy)
          setSortBy(effectiveSortBy)
          setReportData({ ...data, rows: sortedRows })
        } else {
          setReportData(data)
        }
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
  }, [reportId, dateRange.start?.toISOString(), dateRange.end?.toISOString()])

  // Clamp current page when report has fewer pages (e.g. after switching report)
  useEffect(() => {
    if (!reportData?.rows.length) return
    const totalPages = Math.max(1, Math.ceil(reportData.rows.length / REPORT_PAGE_SIZE))
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [reportData?.rows.length, currentPage])

  const handleDownloadClick = () => {
    setIsDownloadModalOpen(true)
  }

  const handleDownload = async (format: DownloadFormat) => {
    setIsDownloading(true)
    try {
      const reportType = getReportType()
      const reportName = getReportName()
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `${reportName}_${timestamp}.${format}`
      const useDateRange = (dateRange.start && dateRange.end) ? dateRange : undefined

      if (format === 'csv') {
        await exportService.exportReport(reportType, filename, useDateRange, sortBy)
        addNotification({
          type: 'success',
          title: 'Export Successful',
          message: `Report has been exported to ${filename}`,
        })
      } else if (format === 'pdf') {
        await exportService.exportReportToPDF(reportType, filename, useDateRange, sortBy)
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
    } finally {
      setIsDownloading(false)
    }
  }

  // Column keys that hold display dates (MM/DD/YYYY) and should be sorted chronologically
  const dateColumnKeys = new Set(['dob', 'signUpDate', 'lastLoginDate', 'date', 'signupDate'])

  const parseSortableDate = (value: string | number): number => {
    if (value === '' || value === undefined || value === null) return NaN
    const str = String(value).trim()
    if (!str) return NaN
    // Support MM/DD/YYYY (report display format)
    const mmddyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (mmddyy) {
      const [, month, day, year] = mmddyy
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
      return isNaN(d.getTime()) ? NaN : d.getTime()
    }
    const d = new Date(str)
    return isNaN(d.getTime()) ? NaN : d.getTime()
  }

  const sortRowsByKey = (
    rows: Record<string, string | number>[],
    sortKey: string
  ): Record<string, string | number>[] => {
    if (rows.length === 0) return rows
    const isDateColumn = dateColumnKeys.has(sortKey)
    return [...rows].sort((a, b) => {
      const aValue = a[sortKey] ?? ''
      const bValue = b[sortKey] ?? ''

      if (isDateColumn) {
        const aTime = parseSortableDate(aValue as string)
        const bTime = parseSortableDate(bValue as string)
        const aEmpty = isNaN(aTime)
        const bEmpty = isNaN(bTime)
        if (aEmpty && bEmpty) return 0
        if (aEmpty) return 1
        if (bEmpty) return -1
        return aTime - bTime
      }

      const aNum = Number(aValue)
      const bNum = Number(bValue)
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum
      }
      return String(aValue).localeCompare(String(bValue))
    })
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSortBy = e.target.value
    setSortBy(newSortBy)
    setCurrentPage(1)

    if (reportData && reportData.rows.length > 0) {
      const sortedRows = sortRowsByKey(reportData.rows, newSortBy)
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
              disabled={isLoading || isDownloading || !reportData}
              className="px-4 py-2 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isDownloading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent inline-block" />
              ) : (
                <Icon icon="mdi:download" className="w-5 h-5" />
              )}
              Download
            </button>
          </div>
        </div>

        {/* Download Modal */}
        <DownloadModal
          isOpen={isDownloadModalOpen}
          onClose={() => !isDownloading && setIsDownloadModalOpen(false)}
          onDownload={handleDownload}
          isLoading={isDownloading}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1D0A74]"></div>
          </div>
        )}

        {/* Table */}
        {!isLoading && reportData && (() => {
          const totalRows = reportData.rows.length
          const totalPages = Math.max(1, Math.ceil(totalRows / REPORT_PAGE_SIZE))
          const page = Math.min(currentPage, totalPages)
          const start = (page - 1) * REPORT_PAGE_SIZE
          const end = Math.min(start + REPORT_PAGE_SIZE, totalRows)
          const displayedRows = reportData.rows.slice(start, end)
          const showPagination = totalRows > REPORT_PAGE_SIZE

          return (
            <>
              {showPagination && (
                <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
                  <span>
                    Showing {totalRows === 0 ? 0 : start + 1}–{end} of {totalRows.toLocaleString()} records
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="px-2">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
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
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={reportData.columns.length}
                            className="px-6 py-8 text-center text-sm text-gray-500"
                          >
                            No data available for this report
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((row, rowIndex) => (
                          <tr key={start + rowIndex} className="hover:bg-gray-50">
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
            </>
          )
        })()}

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

