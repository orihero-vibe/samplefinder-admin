import { Icon } from '@iconify/react'

interface UsersHeaderProps {
  onAddUser: () => void
}

const UsersHeader = ({ onAddUser }: UsersHeaderProps) => {
  return (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Users</h1>
        <p className="text-gray-600">Manage and monitor app user activity.</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onAddUser}
          className="px-4 py-2 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors flex items-center gap-2"
        >
          <Icon icon="mdi:plus" className="w-4 h-4" />
          Add User
        </button>
      </div>
    </div>
  )
}

export default UsersHeader

