import { useNavigate } from 'react-router-dom'
import ReportCard from './ReportCard'

interface Report {
  id: string
  name: string
  icon: string
  lastGenerated: string
}

interface ReportsListProps {
  reports: Report[]
}

const ReportsList = ({ reports }: ReportsListProps) => {
  const navigate = useNavigate()

  const handlePreview = (reportId: string) => {
    navigate(`/reports/preview/${reportId}`)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          name={report.name}
          icon={report.icon}
          lastGenerated={report.lastGenerated}
          onPreview={() => handlePreview(report.id)}
        />
      ))}
    </div>
  )
}

export default ReportsList


