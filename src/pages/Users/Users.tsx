import { useState, useEffect } from 'react'
import {
  DashboardLayout,
  ShimmerPage,
  ConfirmationModal,
} from '../../components'
import { useNotificationStore } from '../../stores/notificationStore'
import {
  UsersHeader,
  StatsCards,
  SearchAndFilter,
  UsersTable,
  AddUserModal,
  AddAdminModal,
  EditUserModal,
} from './components'

const Users = () => {
  const { addNotification } = useNotificationStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('All Tiers')
  const [sortBy, setSortBy] = useState('Date')
  const [isLoading, setIsLoading] = useState(true)
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false)
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [userToDelete, setUserToDelete] = useState<any>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const stats = [
    {
      label: 'Total Users',
      value: '5,000',
      icon: 'mdi:format-list-bulleted',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      label: 'Avg. Points',
      value: '925',
      icon: 'mdi:star-outline',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
    },
    {
      label: 'New This Week',
      value: '167',
      icon: 'mdi:trending-up',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
    },
    {
      label: 'Users in Blacklist',
      value: '167',
      icon: 'mdi:chart-line',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
  ]

  const users = [
    {
      firstName: 'Courtney',
      lastName: 'Henry',
      username: '@amonk_',
      phoneNumber: '(480) 555-0103',
      email: 'willie.jenni...',
      totalPoints: 24,
      dateOfBirth: '05/15/2020',
      checkIns: 24,
      reviews: 24,
    },
    {
      firstName: 'Ronald',
      lastName: 'Richards',
      username: '@mercyCh',
      phoneNumber: '(270) 555-0117',
      email: 'alma.laws...',
      totalPoints: 43,
      dateOfBirth: '05/15/2020',
      checkIns: 43,
      reviews: 43,
    },
    {
      firstName: 'Marvin',
      lastName: 'McKinney',
      username: '@bessie',
      phoneNumber: '(205) 555-0100',
      email: 'deanna.curt...',
      totalPoints: 32,
      dateOfBirth: '05/15/2020',
      checkIns: 32,
      reviews: 32,
    },
    {
      firstName: 'Jerome',
      lastName: 'Bell',
      username: '@jerome',
      phoneNumber: '(229) 555-0109',
      email: 'kathryn.mcc...',
      totalPoints: 18,
      dateOfBirth: '05/15/2020',
      checkIns: 18,
      reviews: 18,
    },
    {
      firstName: 'Cameron',
      lastName: 'Williamson',
      username: '@cameron',
      phoneNumber: '(505) 555-0125',
      email: 'felicia.reid...',
      totalPoints: 56,
      dateOfBirth: '05/15/2020',
      checkIns: 56,
      reviews: 56,
    },
    {
      firstName: 'Leslie',
      lastName: 'Alexander',
      username: '@leslie',
      phoneNumber: '(316) 555-0116',
      email: 'guy.hawkins...',
      totalPoints: 29,
      dateOfBirth: '05/15/2020',
      checkIns: 29,
      reviews: 29,
    },
    {
      firstName: 'Kristin',
      lastName: 'Watson',
      username: '@kristin',
      phoneNumber: '(307) 555-0133',
      email: 'robert.fox...',
      totalPoints: 41,
      dateOfBirth: '05/15/2020',
      checkIns: 41,
      reviews: 41,
    },
    {
      firstName: 'Floyd',
      lastName: 'Miles',
      username: '@floyd',
      phoneNumber: '(208) 555-0112',
      email: 'darlene.rober...',
      totalPoints: 35,
      dateOfBirth: '05/15/2020',
      checkIns: 35,
      reviews: 35,
    },
  ]

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
        <UsersHeader
          onAddAdmin={() => setIsAddAdminModalOpen(true)}
          onAddUser={() => setIsAddUserModalOpen(true)}
        />
        <StatsCards stats={stats} />
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
            setSelectedUser(user)
            setIsEditUserModalOpen(true)
          }}
          onDeleteClick={(user) => {
            setUserToDelete(user)
            setIsDeleteModalOpen(true)
          }}
        />
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSave={(userData) => {
          console.log('User data:', userData)
          // TODO: Implement save functionality
          setIsAddUserModalOpen(false)
          addNotification({
            type: 'success',
            title: 'User invited sucessfuly',
            message: 'A new user added',
          })
        }}
      />

      {/* Add Admin Modal */}
      <AddAdminModal
        isOpen={isAddAdminModalOpen}
        onClose={() => setIsAddAdminModalOpen(false)}
        onSave={(adminData) => {
          console.log('Admin data:', adminData)
          // TODO: Implement save functionality
          setIsAddAdminModalOpen(false)
          addNotification({
            type: 'success',
            title: 'Admin added successfully',
            message: 'A new admin has been added to the system',
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
          // TODO: Implement save functionality
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
                userPoints: selectedUser.totalPoints?.toString(),
                baBadge: 'Yes',
                signUpDate: selectedUser.dateOfBirth,
                password: '**********',
                checkIns: selectedUser.checkIns?.toString(),
                tierLevel: 'SuperSampler',
                username: selectedUser.username,
                email: selectedUser.email,
                checkInReviewPoints: '750',
                influencerBadge: 'No',
                lastLogin: selectedUser.dateOfBirth,
                referralCode: '',
                reviews: selectedUser.reviews?.toString(),
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
        onConfirm={() => {
          if (userToDelete) {
            console.log('Delete user:', userToDelete)
            // TODO: Implement delete functionality
            // Remove from users list or make API call
            addNotification({
              type: 'success',
              title: 'User deleted successfully',
              message: 'User has been removed from the system',
            })
          }
          setIsDeleteModalOpen(false)
          setUserToDelete(null)
          if (isEditUserModalOpen) {
            setIsEditUserModalOpen(false)
            setSelectedUser(null)
          }
        }}
        type="delete"
        itemName="user"
      />
    </DashboardLayout>
  )
}

export default Users

