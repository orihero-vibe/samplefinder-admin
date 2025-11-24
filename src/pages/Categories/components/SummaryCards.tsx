import { Icon } from '@iconify/react'

interface SummaryCard {
  label: string
  value: string
  icon: string
  iconBg: string
  iconColor: string
}

interface SummaryCardsProps {
  cards: SummaryCard[]
}

const SummaryCards = ({ cards }: SummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {cards.map((card, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            </div>
            <div className={`${card.iconBg} p-3 rounded-lg`}>
              <Icon icon={card.icon} className={`w-6 h-6 ${card.iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default SummaryCards

