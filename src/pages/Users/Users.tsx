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
} from './components'
import { appUsersService, type AppUser, type UserFormData } from '../../lib/services'

const Users = () => {
  const { addNotification } = useNotificationStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('All Tiers')
  const [sortBy, setSortBy] = useState('Date')
  const [isLoading, setIsLoading] = useState(true)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [error, setError] = useState<string | null>(null)

  // Fetch users from Appwrite
  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const usersList = await appUsersService.list()
      setUsers(usersList)
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Failed to load users. Please try again.')
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load users. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  if (isLoading) {
    return (
      <DashboardLayout>
        <ShimmerPage />
      </DashboardLayout>
    )
  }

  const handleCreateUser = async (userData: UserFormData) => {
    try {
      await appUsersService.create(userData)
      await fetchUsers() // Refresh list
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
      await appUsersService.delete(userToDelete.$id, userToDelete.authID)
      await fetchUsers() // Refresh list
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <ShimmerPage />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <UsersHeader onAddUser={() => setIsAddUserModalOpen(true)} />
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
          onSearchChange={setSearchQuery}
          tierFilter={tierFilter}
          onTierFilterChange={setTierFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />
        <UsersTable
          users={users}
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
        onSave={handleCreateUser}
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
          console.log('Add to blacklist:', selectedUser)
          // TODO: Implement blacklist functionality
        }}
        onDelete={() => {
          setUserToDelete(selectedUser)
          setIsDeleteModalOpen(true)
        }}
        initialData={
          selectedUser
            ? {
                firstName: selectedUser.firstName,
                lastName: selectedUser.lastName,
                zipCode: '',
                phoneNumber: selectedUser.phoneNumber,
                userPoints: '',
                baBadge: 'Yes',
                signUpDate: selectedUser.$createdAt
                  ? new Date(selectedUser.$createdAt).toLocaleDateString()
                  : '',
                password: '**********',
                checkIns: '',
                tierLevel: 'SuperSampler',
                username: selectedUser.username,
                email: selectedUser.email,
                checkInReviewPoints: '750',
                influencerBadge: 'No',
                lastLogin: selectedUser.$createdAt
                  ? new Date(selectedUser.$createdAt).toLocaleDateString()
                  : '',
                referralCode: '',
                reviews: '',
                triviasWon: '750',
              }
            : undefined
        }
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

