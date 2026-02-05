import { useNavigate } from 'react-router-dom'
import ReportCard from './ReportCard'
import { Pagination } from '../../../components'
import type { DownloadFormat } from '../../../components'

interface Report {
  id: string
  name: string
  icon: string
  lastGenerated: string
}

interface ReportsListProps {
  reports: Report[]
  currentPage?: number
  totalPages?: number
  totalReports?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onExport: (reportId: string, format: DownloadFormat) => void
  downloadingReportId?: string | null
}

const ReportsList = ({
  reports,
  currentPage = 1,
  totalPages = 0,
  totalReports = 0,
  pageSize = 25,
  onPageChange,
  onExport,
  downloadingReportId,
}: ReportsListProps) => {
  const navigate = useNavigate()

  const handlePreview = (reportId: string) => {
    navigate(`/reports/preview/${reportId}`)
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {reports.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-gray-500">
            No reports found.
          </div>
        ) : (
          reports.map((report) => (
            <ReportCard
              key={report.id}
              name={report.name}
              icon={report.icon}
              lastGenerated={report.lastGenerated}
              onPreview={() => handlePreview(report.id)}
              onExport={(format) => onExport(report.id, format)}
              isDownloading={downloadingReportId === report.id}
            />
          ))
        )}
      </div>
      {/* Pagination */}
      {onPageChange && totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalReports}
          pageSize={pageSize}
          itemLabel="reports"
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

export default ReportsList


