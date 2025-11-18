import { Icon } from '@iconify/react'

interface Metric {
  label: string
  value: string
  change: string
  changeLabel: string
  icon: string
  iconBg: string
  iconColor: string
}

interface MetricsCardsProps {
  metrics: Metric[]
}

const MetricsCards = ({ metrics }: MetricsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {metrics.map((metric, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{metric.value}</p>
              <p className="text-sm text-green-600 font-medium">
                {metric.change} <span className="text-gray-500">{metric.changeLabel}</span>
              </p>
            </div>
            <div className={`${metric.iconBg} p-3 rounded-lg`}>
              <Icon icon={metric.icon} className={`w-6 h-6 ${metric.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default MetricsCards

