import MultiSelectDropdown from '../../../components/MultiSelectDropdown'
import { getColumnOptions } from '../../../lib/reportBuilderConfig'
import type { EntityType } from '../../../lib/reportBuilderConfig'

interface ColumnSelectorProps {
  selectedColumns: string[]
  onChange: (columns: string[]) => void
  entityType: EntityType
}

const ColumnSelector = ({ selectedColumns, onChange, entityType }: ColumnSelectorProps) => {
  const options = getColumnOptions(entityType === 'all' ? undefined : entityType as any)
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Columns</h3>
      <MultiSelectDropdown
        options={options}
        selectedValues={selectedColumns}
        onChange={onChange}
        placeholder="Choose columns for your report..."
        searchPlaceholder="Search columns..."
      />
      {selectedColumns.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Selected columns ({selectedColumns.length}):</p>
          <div className="flex flex-wrap gap-2">
            {selectedColumns.map(col => {
              const option = options.find(opt => opt.value === col)
              return (
                <span
                  key={col}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700"
                >
                  {option?.label || col}
                  <button
                    type="button"
                    onClick={() => onChange(selectedColumns.filter(c => c !== col))}
                    className="ml-2 hover:text-purple-900"
                  >
                    ×
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ColumnSelector