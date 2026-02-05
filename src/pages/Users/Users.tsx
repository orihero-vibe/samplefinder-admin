import { useState, useEffect } from 'react'
import {
  DashboardLayout,
  ShimmerPage,
  ConfirmationModal,
} from '../../components'
import { useNotificationStore } from '../../stores/notificationStore'
import {
  UsersHeader,
  SearchAndFilter,
  UsersTable,
  AddUserModal,
  EditUserModal,
  StatsCards,
} from './components'
import { appUsersService, type AppUser, type UserFormData, statisticsService, type UsersStats } from '../../lib/services'
import { Query } from '../../lib/appwrite'

const Users = () => {
  const { addNotification } = useNotificationStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('All Tiers')
  const [sortBy, setSortBy] = useState('Date')
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [blockModalState, setBlockModalState] = useState<{
    isOpen: boolean
    user: AppUser | null
    isLoading: boolean
  }>({ isOpen: false, user: null, isLoading: false })
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [statistics, setStatistics] = useState<UsersStats | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(25)
  const [totalUsers, setTotalUsers] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  // Fetch users from Appwrite with pagination and search
  const fetchUsers = async (page: number = currentPage) => {
    try {
      setError(null)
      
      // Build queries
      const queries: string[] = []
      
      // Apply search using Query.contains (searches firstname, lastname, or username)
      if (searchQuery.trim()) {
        const trimmedSearch = searchQuery.trim()
        // Search across firstname, lastname, and username using OR logic
        queries.push(Query.or([
          Query.contains('firstname', trimmedSearch),
          Query.contains('lastname', trimmedSearch),
          Query.contains('username', trimmedSearch),
        ]))
      }
      
      // Add sorting and pagination
      queries.push(Query.orderDesc('$createdAt')) // Most recent users first
      queries.push(Query.limit(pageSize))
      queries.push(Query.offset((page - 1) * pageSize))
      
      const result = await appUsersService.listWithPagination(queries)
      
      // Extract pagination metadata
      const total = result.total
      const totalPagesCount = Math.ceil(total / pageSize)
      setTotalUsers(total)
      setTotalPages(totalPagesCount)
      
      // Handle edge case: if current page exceeds total pages, reset to last valid page or page 1
      if (totalPagesCount > 0 && page > totalPagesCount) {
        const lastValidPage = totalPagesCount
        setCurrentPage(lastValidPage)
        if (page !== lastValidPage) {
          return fetchUsers(lastValidPage)
        }
      } else if (totalPagesCount === 0) {
        setCurrentPage(1)
      }
      
      setUsers(result.users)
      setCurrentPage(page)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to load users. Please try again.')
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load users. Please try again.',
      })
    } finally {
      setIsInitialLoad(false)
    }
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      fetchUsers(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const stats = await statisticsService.getStatistics<UsersStats>('users')
      setStatistics(stats)
    } catch (err) {
      console.error('Error fetching statistics:', err)
      addNotification({
        type: 'error',
        title: 'Error Loading Statistics',
        message: 'Failed to load users statistics. Please refresh the page.',
      })
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchStatistics()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refetch users when search query, tier filter, or sort changes
  useEffect(() => {
    fetchUsers(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, tierFilter, sortBy])

  // Handle search change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1) // Reset to page 1 when search changes
  }

  if (isInitialLoad) {
    return (
      <DashboardLayout>
        <ShimmerPage />
      </DashboardLayout>
    )
  }

  const handleCreateUser = async (userData: UserFormData) => {
    try {
      await appUsersService.create(userData)
      setCurrentPage(1)
      await fetchUsers(1) // Refresh list - reset to page 1
      setIsAddUserModalOpen(false)
      addNotification({
        type: 'success',
        title: 'User created successfully',
        message: 'A new user has been added to the system',
      })
    } catch (err) {
      console.error('Error creating user:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user. Please try again.'
      addNotification({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      })
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete?.$id || !userToDelete?.authID) return

    try {
      await appUsersService.delete(userToDelete.$id)
      // Check if we need to go back a page if current page becomes empty
      if (users.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
        await fetchUsers(currentPage - 1)
      } else {
        await fetchUsers(currentPage) // Refresh list
      }
      setIsDeleteModalOpen(false)
      setUserToDelete(null)
      addNotification({
        type: 'success',
        title: 'User deleted successfully',
        message: 'User has been removed from the system',
      })
    } catch (err) {
      console.error('Error deleting user:', err)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete user. Please try again.',
      })
    }
  }

  const handleBlockUser = async () => {
    if (!blockModalState.user?.$id) return

    try {
      setBlockModalState(prev => ({ ...prev, isLoading: true }))
      const isCurrentlyBlocked = (blockModalState.user as { isBlocked?: boolean }).isBlocked || false
      
      if (isCurrentlyBlocked) {
        // Unblock user
        await appUsersService.unblockUser(blockModalState.user.$id)
        addNotification({
          type: 'success',
          title: 'User unblocked successfully',
          message: 'User can now login to the system',
        })
      } else {
        // Block user
        await appUsersService.blockUser(blockModalState.user.$id)
        addNotification({
          type: 'success',
          title: 'User blocked successfully',
          message: 'User has been added to blacklist and will be logged out',
        })
      }
      
      // Refresh list and statistics
      await fetchUsers(currentPage)
      await fetchStatistics()
      
      // Update selectedUser with new blocked status to refresh Edit Modal
      // Only update the isBlocked field to avoid re-rendering the entire form
      if (selectedUser && selectedUser.$id === blockModalState.user.$id) {
        setSelectedUser(prev => prev ? {
          ...prev,
          isBlocked: !isCurrentlyBlocked,
        } as AppUser : null)
      }
      
      // Close block modal
      
      // Keep Edit User Modal open
    } catch (err) {
      console.error('Error blocking/unblocking user:', err)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update user status. Please try again.',
      })
    } finally {
      setBlockModalState({ isOpen: false, user: null, isLoading: false })

    }
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <UsersHeader onAddUser={() => setIsAddUserModalOpen(true)} />
        {statistics && (
          <StatsCards
            stats={[
              {
                label: 'Total Users',
                value: statistics.totalUsers.toLocaleString('en-US'),
                icon: 'mdi:account-group',
                iconBg: 'bg-green-100',
                iconColor: 'text-green-600',
              },
              {
                label: 'Avg. Points',
                value: statistics.avgPoints.toLocaleString('en-US'),
                icon: 'mdi:star-four-points',
                iconBg: 'bg-red-100',
                iconColor: 'text-red-600',
              },
              {
                label: 'New This Week',
                value: statistics.newThisWeek.toLocaleString('en-US'),
                icon: 'mdi:trending-up',
                iconBg: 'bg-orange-100',
                iconColor: 'text-orange-600',
              },
              {
                label: 'Users in Blacklist',
                value: statistics.usersInBlacklist.toLocaleString('en-US'),
                icon: 'mdi:trending-up',
                iconBg: 'bg-gray-100',
                iconColor: 'text-gray-600',
              },
            ]}
          />
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}
        <SearchAndFilter
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          tierFilter={tierFilter}
          onTierFilterChange={setTierFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />
        <UsersTable
          users={users}
          currentPage={currentPage}
          totalPages={totalPages}
          totalUsers={totalUsers}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onEditClick={(user) => {
            setSelectedUser(user as AppUser)
            setIsEditUserModalOpen(true)
          }}
          onDeleteClick={(user) => {
            setUserToDelete(user as AppUser)
            setIsDeleteModalOpen(true)
          }}
        />
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSave={(userData) => {
          // Map AddUserModal's type to UserFormData
          handleCreateUser({
            email: userData.email,
            password: userData.password,
            firstname: userData.firstName,
            lastname: userData.lastName,
            username: userData.username,
            phoneNumber: userData.phoneNumber,
            role: userData.role as 'admin' | 'user',
          })
        }}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false)
          setSelectedUser(null)
        }}
        onSave={(userData) => {
          console.log('Updated user data:', userData)
          // TODO: Implement update functionality
          setIsEditUserModalOpen(false)
          setSelectedUser(null)
          addNotification({
            type: 'success',
            title: 'User updated successfully',
            message: 'User information has been updated',
          })
        }}
        onAddToBlacklist={() => {
          setBlockModalState({ isOpen: true, user: selectedUser, isLoading: false })
        }}
        onDelete={() => {
          setUserToDelete(selectedUser)
          setIsDeleteModalOpen(true)
        }}
        initialData={
          selectedUser
            ? {
                firstName: String(selectedUser.firstname ?? selectedUser.firstName ?? ''),
                lastName: String(selectedUser.lastname ?? selectedUser.lastName ?? ''),
                zipCode: String(selectedUser.zipCode ?? ''),
                phoneNumber: String(selectedUser.phoneNumber ?? ''),
                // Use correct database field name: totalPoints
                userPoints: String(selectedUser.totalPoints ?? selectedUser.userPoints ?? '0'),
                // Use correct database field name: isAmbassador
                baBadge: (selectedUser.isAmbassador ?? selectedUser.baBadge) ? 'Yes' : 'No',
                signUpDate: selectedUser.$createdAt
                  ? new Date(selectedUser.$createdAt).toISOString().split('T')[0]
                  : '',
                password: '**********',
                // Use correct database field name: totalEvents
                checkIns: String(selectedUser.totalEvents ?? selectedUser.checkIns ?? '0'),
                tierLevel: String(selectedUser.tierLevel ?? ''),
                username: String(selectedUser.username ?? ''),
                email: selectedUser.email,
                checkInReviewPoints: String(selectedUser.checkInReviewPoints ?? '0'),
                // Use correct database field name: isInfluencer
                influencerBadge: (selectedUser.isInfluencer ?? selectedUser.influencerBadge) ? 'Yes' : 'No',
                lastLogin: selectedUser.$updatedAt
                  ? new Date(selectedUser.$updatedAt).toISOString().split('T')[0]
                  : '',
                referralCode: String(selectedUser.referralCode ?? ''),
                // Use correct database field name: totalReviews
                reviews: String(selectedUser.totalReviews ?? selectedUser.reviews ?? '0'),
                triviasWon: String(selectedUser.triviasWon ?? '0'),
                isBlocked: (selectedUser as { isBlocked?: boolean }).isBlocked || false,
              }
            : undefined
        }
      />

      {/* Block/Unblock Confirmation Modal */}
      <ConfirmationModal
        isOpen={blockModalState.isOpen}
        onClose={() => {
          if (!blockModalState.isLoading) {
            setBlockModalState({ isOpen: false, user: null, isLoading: false })
          }
        }}
        onConfirm={handleBlockUser}
        type={(blockModalState.user as { isBlocked?: boolean })?.isBlocked ? 'unblock' : 'block'}
        itemName="user"
        isLoading={blockModalState.isLoading}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setUserToDelete(null)
        }}
        onConfirm={handleDeleteUser}
        type="delete"
        itemName="user"
      />
    </DashboardLayout>
  )
}

export default Users

