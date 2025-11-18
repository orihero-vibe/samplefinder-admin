import { Icon } from '@iconify/react'

interface StatCard {
  label: string
  value: string
  icon: string
  iconBg: string
  iconColor: string
}

interface StatsCardsProps {
  stats: StatCard[]
}

const StatsCards = ({ stats }: StatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
            <div className={`${stat.iconBg} p-3 rounded-lg`}>
              <Icon icon={stat.icon} className={`w-6 h-6 ${stat.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default StatsCards

