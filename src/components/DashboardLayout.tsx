import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Notification from './Notification'
import { useAuthStore } from '../stores/authStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useTimezoneStore } from '../stores/timezoneStore'

interface DashboardLayoutProps {
  children: ReactNode
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { addNotification } = useNotificationStore()
  const {
    appTimezone,
    fetchAppTimezone,
    setAppTimezoneAndPersist,
    getTimezoneOptions,
  } = useTimezoneStore()

  useEffect(() => {
    fetchAppTimezone()
  }, [fetchAppTimezone])

  const handleTimezoneChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const iana = e.target.value
    try {
      await setAppTimezoneAndPersist(iana)
      addNotification({
        type: 'success',
        title: 'Timezone updated',
        message: 'Refreshing to show all times in the selected timezone.',
        duration: 2000,
      })
      window.location.reload()
    } catch {
      addNotification({
        type: 'error',
        title: 'Failed to save timezone',
        message: 'Please try again.',
      })
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      addNotification({
        type: 'success',
        title: 'Logged out',
        message: 'You have been successfully logged out.',
      })
      navigate('/login')
    } catch {
      addNotification({
        type: 'error',
        title: 'Logout failed',
        message: 'There was an error logging out. Please try again.',
      })
    }
  }

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  const displayName = user?.name || 'User'
  const displayEmail = user?.email || ''

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'mdi:poll' },
    { path: '/clients-brands', label: 'Clients & Brands', icon: 'mdi:layers-outline' },
    { path: '/locations', label: 'Locations', icon: 'mdi:map-marker-outline' },
    { path: '/app-users', label: 'App Users', icon: 'mdi:account-multiple-outline' },
    { path: '/categories', label: 'Categories', icon: 'mdi:tag-multiple-outline' },
    { path: '/reports', label: 'Reports', icon: 'mdi:clipboard-check-outline' },
    { path: '/notification-settings', label: 'Notification Settings', icon: 'mdi:bell-outline' },
    { path: '/trivia', label: 'Trivia', icon: 'mdi:school-outline' },
  ]

  const isActive = (path: string) => {
    if (path === '/reports') {
      return location.pathname === path || location.pathname.startsWith('/reports/')
    }
    return location.pathname === path
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:map-marker" className="w-8 h-8 text-[#1D0A74]" />
            <span className="text-xl font-semibold text-[#1D0A74]">SampleFinder</span>
          </div>
        </div>

        {/* Timezone selector */}
        <div className="px-4 py-3 border-b border-gray-200">
          <label htmlFor="app-timezone" className="block text-xs font-medium text-gray-500 mb-1">
            Timezone
          </label>
          <select
            id="app-timezone"
            value={appTimezone}
            onChange={handleTimezoneChange}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D0A74] focus:border-transparent bg-white"
          >
            {getTimezoneOptions().map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {
            navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path)
                  ? 'bg-[#1D0A74] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Icon icon={item.icon} className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))
          }
        </nav >

        {/* User Profile */}
        < div className="p-4 border-t border-gray-200" >
          <div className="w-full flex items-center gap-3 p-3">
            <div className="w-10 h-10 rounded-full bg-[#1D0A74] flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
              {getUserInitials()}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-gray-900 font-medium text-sm truncate">{displayName}</p>
              <p className="text-gray-500 text-xs truncate">{displayEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 flex-shrink-0"
              title="Logout"
            >
              <Icon icon="mdi:logout" className="w-5 h-5" />
            </button>
          </div>
        </div >
      </aside >

      {/* Main Content */}
      < main className="flex-1 overflow-y-auto bg-white relative" >
        {children}
        < Notification />
      </main >
    </div >
  )
}

export default DashboardLayout

