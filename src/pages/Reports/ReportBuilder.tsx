import { useState } from 'react'
import { Icon } from '@iconify/react'
import { DashboardLayout, DownloadModal } from '../../components'
import type { DownloadFormat } from '../../components'
import { 
  ReportBuilderHeader, 
  EntitySelector, 
  ColumnSelector, 
  DateRangeFilter,
  ReportPreview 
} from './components'
import { exportService, getEffectiveDateRange } from '../../lib/exportService'
import type { ReportColumn } from '../../lib/exportService'
import { type EntityType } from '../../lib/reportBuilderConfig'
import { useNotificationStore } from '../../stores/notificationStore'
import { useTimezoneStore } from '../../stores/timezoneStore'

const ReportBuilder = () => {
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('events')
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  })
  const [reportData, setReportData] = useState<{
    columns: ReportColumn[]
    rows: Record<string, string | number>[]
  } | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  
  const { addNotification } = useNotificationStore()
  const { appTimezone } = useTimezoneStore()

  const handleGenerateReport = async () => {
    if (selectedColumns.length === 0) {
      addNotification({
        type: 'error',
        title: 'No columns selected',
        message: 'Please select at least one column for your report',
      })
      return
    }

    setIsGenerating(true)
    try {
      const useDateRange = getEffectiveDateRange(dateRange)
      const data = await exportService.generateCustomReport(
        selectedEntity,
        selectedColumns,
        useDateRange,
        appTimezone
      )
      setReportData(data)
      addNotification({
        type: 'success',
        title: 'Report generated',
        message: `Generated report with ${data.rows.length} rows`,
      })
    } catch (error) {
      console.error('Error generating report:', error)
      addNotification({
        type: 'error',
        title: 'Generation failed',
        message: error instanceof Error ? error.message : 'Failed to generate report',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (format: DownloadFormat) => {
    if (!reportData || reportData.columns.length === 0) {
      addNotification({
        type: 'error',
        title: 'No report to export',
        message: 'Please generate a report first',
      })
      return
    }

    setIsDownloading(true)
    try {
      const timestamp = new Date().toISOString().split('T')[0]
      const filename = `custom_report_${timestamp}.${format}`
      
      if (format === 'csv') {
        const csvContent = exportService.exportToCSV(reportData.columns, reportData.rows)
        exportService.downloadCSV(filename, csvContent)
      } else if (format === 'pdf') {
        // For custom reports, directly export the current data to PDF
        const useDateRange = getEffectiveDateRange(dateRange)
        await exportService.exportCustomReportToPDF(
          reportData.columns,
          reportData.rows,
          filename,
          'Custom Report',
          useDateRange,
          appTimezone
        )
      }
      
      addNotification({
        type: 'success',
        title: 'Export successful',
        message: `Report exported as ${filename}`,
      })
    } catch (error) {
      console.error('Error exporting report:', error)
      addNotification({
        type: 'error',
        title: 'Export failed',
        message: error instanceof Error ? error.message : 'Failed to export report',
      })
    } finally {
      setIsDownloading(false)
      setIsDownloadModalOpen(false)
    }
  }

  const handleEntityChange = (entity: EntityType) => {
    setSelectedEntity(entity)
    // Clear selected columns when entity changes
    setSelectedColumns([])
    setReportData(null)
  }

  const handleClearReport = () => {
    setSelectedColumns([])
    setReportData(null)
    setDateRange({ start: null, end: null })
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <ReportBuilderHeader />
        
        <div className="space-y-6">
          {/* Entity Selector */}
          <EntitySelector
            selectedEntity={selectedEntity}
            onChange={handleEntityChange}
          />

          {/* Column Selector */}
          <ColumnSelector
            selectedColumns={selectedColumns}
            onChange={setSelectedColumns}
            entityType={selectedEntity}
          />

          {/* Date Range Filter */}
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={selectedColumns.length === 0 || isGenerating}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Icon icon={isGenerating ? "mdi:loading" : "mdi:file-chart"} 
                className={`text-xl ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </button>
            
            {reportData && reportData.rows.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Icon icon="mdi:download" className="text-xl" />
                  Export Report
                </button>
                
                <button
                  type="button"
                  onClick={handleClearReport}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <Icon icon="mdi:refresh" className="text-xl" />
                  Clear
                </button>
              </>
            )}
          </div>

          {/* Report Preview */}
          {(reportData || isGenerating) && (
            <ReportPreview
              columns={reportData?.columns || []}
              rows={reportData?.rows || []}
              isLoading={isGenerating}
            />
          )}
        </div>
      </div>

      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        onDownload={handleDownload}
        isLoading={isDownloading}
      />
    </DashboardLayout>
  )
}

export default ReportBuilder