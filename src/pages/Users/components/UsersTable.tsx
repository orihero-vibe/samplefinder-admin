import { Icon } from '@iconify/react'
import { Pagination } from '../../../components'

interface User {
  $id?: string
  authID?: string
  firstName?: string
  lastName?: string
  username?: string
  phoneNumber?: string
  email?: string
  role?: string
  tierLevel?: string
  totalPoints?: number
  $createdAt?: string
  isBlocked?: boolean
}

// Calculate tier based on points
const getTierFromPoints = (points: number = 0): { name: string; level: number; color: string } => {
  if (points >= 100000) return { name: 'SampleMaster', level: 5, color: 'bg-amber-100 text-amber-800' }
  if (points >= 25000) return { name: 'VIS', level: 4, color: 'bg-gray-200 text-gray-800' }
  if (points >= 5000) return { name: 'SuperSampler', level: 3, color: 'bg-yellow-100 text-yellow-800' }
  if (points >= 1000) return { name: 'SampleFan', level: 2, color: 'bg-purple-100 text-purple-800' }
  return { name: 'NewbieSampler', level: 1, color: 'bg-blue-100 text-blue-800' }
}

interface UsersTableProps {
  users: User[]
  onEditClick: (user: User) => void
  onDeleteClick: (user: User) => void
  currentPage?: number
  totalPages?: number
  totalUsers?: number
  pageSize?: number
  onPageChange?: (page: number) => void
}

const UsersTable = ({
  users,
  onEditClick,
  onDeleteClick,
  currentPage = 1,
  totalPages = 0,
  totalUsers = 0,
  pageSize = 25,
  onPageChange,
}: UsersTableProps) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  First Name
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Last Name
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Username
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Email
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Phone Number
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Tier
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Role
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Status
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:filter" className="w-4 h-4" />
                  Created At
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-8 text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.$id || user.authID} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.firstName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.lastName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.username || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.email || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.phoneNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(() => {
                      const tier = getTierFromPoints(user.totalPoints)
                      return (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${tier.color}`}>
                          {tier.name}
                        </span>
                      )
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {user.role || 'user'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.isBlocked ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1 w-fit">
                        <Icon icon="mdi:lock" className="w-3 h-3" />
                        Blocked
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                        <Icon icon="mdi:check-circle" className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.$createdAt
                      ? new Date(user.$createdAt).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onEditClick(user)}
                        className="hover:text-blue-600 transition-colors"
                      >
                        <Icon icon="mdi:pencil" className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onDeleteClick(user)}
                        className="hover:text-red-600 transition-colors"
                      >
                        <Icon icon="mdi:trash-can" className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {onPageChange && totalPages > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalUsers}
          pageSize={pageSize}
          itemLabel="users"
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}

export default UsersTable

