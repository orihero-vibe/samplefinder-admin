import { Icon } from '@iconify/react'
import { useState } from 'react'
import { Pagination } from '../../../components'
import type { ReportColumn } from '../../../lib/exportService'

interface ReportPreviewProps {
  columns: ReportColumn[]
  rows: Record<string, string | number>[]
  isLoading?: boolean
}

const PREVIEW_PAGE_SIZE = 25

const ReportPreview = ({ columns, rows, isLoading = false }: ReportPreviewProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  
  // Calculate pagination
  const totalRows = rows.length
  const totalPages = Math.ceil(totalRows / PREVIEW_PAGE_SIZE)
  const startIndex = (currentPage - 1) * PREVIEW_PAGE_SIZE
  const endIndex = startIndex + PREVIEW_PAGE_SIZE
  const paginatedRows = rows.slice(startIndex, endIndex)

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Icon icon="mdi:loading" className="text-4xl text-purple-600 animate-spin mx-auto mb-3" />
            <p className="text-gray-600">Generating report...</p>
          </div>
        </div>
      </div>
    )
  }

  if (columns.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Icon icon="mdi:table-off" className="text-4xl text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No columns selected</p>
            <p className="text-sm text-gray-500 mt-1">
              Please select columns to preview your report
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Icon icon="mdi:database-off" className="text-4xl text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No data found</p>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your filters or date range
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Report Preview</h3>
          <span className="text-sm text-gray-600">
            {totalRows} total rows • {columns.length} columns
          </span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedRows.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                  >
                    {column.getValue ? column.getValue(row) : (row[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalRows}
            pageSize={PREVIEW_PAGE_SIZE}
            itemLabel="rows"
          />
        </div>
      )}
    </div>
  )
}

export default ReportPreview