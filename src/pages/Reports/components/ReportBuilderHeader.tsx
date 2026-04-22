import { Icon } from '@iconify/react'

const ReportBuilderHeader = () => {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-3 bg-purple-100 rounded-lg">
          <Icon icon="mdi:file-chart" className="text-purple-600 text-2xl" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report Builder</h1>
          <p className="text-gray-600 mt-1">
            Create custom reports by selecting the columns you need
          </p>
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
        <div className="flex items-start gap-2">
          <Icon icon="mdi:information" className="text-blue-600 text-xl mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How to use Report Builder:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Select the data source type (Events, Users, etc.)</li>
              <li>Choose columns from the dropdown menu</li>
              <li>Apply optional date range filters</li>
              <li>Generate and preview your report</li>
              <li>Export to CSV or PDF format</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportBuilderHeader