import { useState, useEffect } from 'react'
import { DashboardLayout, ShimmerPage } from '../../components'
import type { DownloadFormat } from '../../components'
import { ReportsHeader, SearchAndFilter, ReportsList } from './components'
import { exportService, getCurrentMonthRange, getEffectiveDateRange, type ReportType } from '../../lib/exportService'
import { useNotificationStore } from '../../stores/notificationStore'
import { reportsService } from '../../lib/services'

interface Report {
  id: string
  name: string
  icon: string
  lastGenerated: string
}

interface ReportMetadata {
  events: Date | null
  clients: Date | null
  users: Date | null
  reviews: Date | null
}

const Reports = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>(() => getCurrentMonthRange())
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(25)
  const [reportMetadata, setReportMetadata] = useState<ReportMetadata | null>(null)
  const { addNotification } = useNotificationStore()

  // Fetch report metadata on mount
  useEffect(() => {
    const fetchReportMetadata = async () => {
      setIsLoading(true)
      try {
        const metadata = await reportsService.getReportMetadata()
        setReportMetadata(metadata)
      } catch (error) {
        console.error('Error fetching report metadata:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchReportMetadata()
  }, [])

  // Helper function to format date as DD/MM/YYYY
  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A'
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Generate reports array with real data from database
  const reports: Report[] = [
    {
      id: '1',
      name: 'Dashboard (All)',
      icon: 'mdi:chart-line',
      lastGenerated: formatDate(reportMetadata?.events ?? reportMetadata?.clients ?? reportMetadata?.users ?? null),
    },
    {
      id: '2',
      name: 'Dashboard (Date range)',
      icon: 'mdi:calendar',
      lastGenerated: formatDate(reportMetadata?.events ?? reportMetadata?.clients ?? reportMetadata?.users ?? null),
    },
    {
      id: '3',
      name: 'Event List',
      icon: 'mdi:chart-line',
      lastGenerated: formatDate(reportMetadata?.events ?? null),
    },
    {
      id: '4',
      name: 'Clients & Brands (All)',
      icon: 'mdi:calendar',
      lastGenerated: formatDate(reportMetadata?.clients ?? null),
    },
    {
      id: '5',
      name: 'App Users (All)',
      icon: 'mdi:chart-line',
      lastGenerated: formatDate(reportMetadata?.users ?? null),
    },
    {
      id: '6',
      name: 'Points Earned (All)',
      icon: 'mdi:calendar',
      lastGenerated: formatDate(reportMetadata?.reviews ?? null),
    },
    {
      id: '7',
      name: 'Points Earned (Date Range)',
      icon: 'mdi:chart-line',
      lastGenerated: formatDate(reportMetadata?.reviews ?? null),
    },
  ]

  // Filter reports by search query only
  // NOTE: Date range is NOT used to filter visible reports
  // The date range only controls what data is included when exporting reports
  const filteredReports = reports.filter((report) => {
    return report.name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Calculate pagination
  const totalReports = filteredReports.length
  const totalPages = Math.ceil(totalReports / pageSize)
  
  // Handle edge case: if current page exceeds total pages, reset to page 1
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1)
    } else if (totalPages === 0) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])
  
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedReports = filteredReports.slice(startIndex, endIndex)

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  // Map reportId to ReportType
  const getReportType = (reportId: string): ReportType => {
    const reportTypeMap: Record<string, ReportType> = {
      '1': 'dashboard-all',
      '2': 'dashboard-date-range',
      '3': 'event-list',
      '4': 'clients-brands',
      '5': 'app-users',
      '6': 'points-earned-all',
      '7': 'points-earned-all', // Points Earned with Date Range - same as all for now
    }
    return reportTypeMap[reportId] || 'dashboard-all'
  }

  // Handle export
  const handleExport = async (reportId: string, format: DownloadFormat) => {
    setDownloadingReportId(reportId)
    try {
      const reportType = getReportType(reportId)
      const report = reports.find(r => r.id === reportId)
      const reportName = report?.name || 'Report'
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `${reportName}_${timestamp}.${format}`

      // Single date => that day; date range => that range; future dates allowed
      const useDateRange = getEffectiveDateRange(dateRange)

      if (format === 'csv') {
        await exportService.exportReport(reportType, filename, useDateRange)
        addNotification({
          type: 'success',
          title: 'Export Successful',
          message: `Report has been exported to ${filename}`,
        })
      } else if (format === 'pdf') {
        await exportService.exportReportToPDF(reportType, filename, useDateRange)
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
      setDownloadingReportId(null)
    }
  }

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
        <ReportsHeader />
        <SearchAndFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
        <ReportsList
          reports={paginatedReports}
          currentPage={currentPage}
          totalPages={totalPages}
          totalReports={totalReports}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onExport={handleExport}
          downloadingReportId={downloadingReportId}
          dateRange={dateRange}
        />
      </div>
    </DashboardLayout>
  )
}

export default Reports


