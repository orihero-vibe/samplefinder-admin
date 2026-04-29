import { Icon } from '@iconify/react'

interface TableLoadingStateProps {
  colSpan: number
  label?: string
}

export const TableLoadingState = ({
  colSpan,
  label = 'Loading...',
}: TableLoadingStateProps) => (
  <tr>
    <td colSpan={colSpan} className="px-6 py-16 text-center">
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1D0A74]" />
        <p className="text-gray-500 text-sm font-medium">{label}</p>
      </div>
    </td>
  </tr>
)

interface TableEmptyStateProps {
  colSpan: number
  icon?: string
  title: string
  description?: string
}

export const TableEmptyState = ({
  colSpan,
  icon = 'mdi:inbox-outline',
  title,
  description,
}: TableEmptyStateProps) => (
  <tr>
    <td colSpan={colSpan} className="px-6 py-16 text-center">
      <div className="flex flex-col items-center justify-center">
        <Icon icon={icon} className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-900 text-base font-semibold mb-1">{title}</p>
        {description && (
          <p className="text-gray-500 text-sm max-w-md">{description}</p>
        )}
      </div>
    </td>
  </tr>
)
