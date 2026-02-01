import { Icon } from '@iconify/react'
import { Pagination } from '../../../components'

interface Client {
  id?: string
  clientName: string
  totalEvents: number
  numberOfFavorites: number
  numberOfCheckIns: number
  totalPoints: number
  joinDate: string
  productTypes?: string[]
  logoUrl?: string
}

interface ClientsTableProps {
  clients: Client[]
  onEditClick: (client: Client) => void
  onDeleteClick: (client: Client) => void
  currentPage?: number
  totalPages?: number
  totalClients?: number
  pageSize?: number
  onPageChange?: (page: number) => void
}

const ClientsTable = ({
  clients,
  onEditClick,
  onDeleteClick,
  currentPage = 1,
  totalPages = 0,
  totalClients = 0,
  pageSize = 25,
  onPageChange,
}: ClientsTableProps) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Client Name
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Total Events
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Number of Favorit
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Number of Check Ins
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Total Points
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Join Date
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {clients.map((client) => (
              <tr key={client.id || client.clientName} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {client.clientName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {client.totalEvents.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {client.numberOfFavorites.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {client.numberOfCheckIns.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {client.totalPoints}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {client.joinDate}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditClick(client)
                      }}
                      className="hover:text-blue-600 transition-colors"
                    >
                      <Icon icon="mdi:pencil" className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteClick(client)
                      }}
                      className="hover:text-red-600 transition-colors"
                    >
                      <Icon icon="mdi:trash-can" className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {onPageChange && totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalClients}
          pageSize={pageSize}
          itemLabel="clients"
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

export default ClientsTable

