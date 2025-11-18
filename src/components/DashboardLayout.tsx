import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import Notification from './Notification'

interface DashboardLayoutProps {
  children: ReactNode
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'mdi:chart-box' },
    { path: '/clients-brands', label: 'Clients & Brands', icon: 'mdi:view-grid' },
    { path: '/app-users', label: 'App Users', icon: 'mdi:account-group' },
    { path: '/reports', label: 'Reports', icon: 'mdi:file-document-search' },
    { path: '/notification-settings', label: 'Notification Settings', icon: 'mdi:bell' },
    { path: '/trivia', label: 'Trivia', icon: 'mdi:school' },
  ]

  const isActive = (path: string) => {
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

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-[#1D0A74] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon icon={item.icon} className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => navigate('/profile')}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-[#1D0A74] flex items-center justify-center text-white font-semibold">
              OR
            </div>
            <div className="flex-1 text-left">
              <p className="text-gray-900 font-medium text-sm">Olivia Rhye</p>
              <p className="text-gray-500 text-xs">olivia@untitledui.com</p>
            </div>
            <Icon icon="mdi:chevron-right" className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-white relative">
        {children}
        <Notification />
      </main>
    </div>
  )
}

export default DashboardLayout

