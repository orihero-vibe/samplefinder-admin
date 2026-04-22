import { Icon } from '@iconify/react'
import { ENTITY_OPTIONS, type EntityType } from '../../../lib/reportBuilderConfig'

interface EntitySelectorProps {
  selectedEntity: EntityType
  onChange: (entity: EntityType) => void
}

const EntitySelector = ({ selectedEntity, onChange }: EntitySelectorProps) => {
  const getIconForEntity = (entity: string) => {
    switch (entity) {
      case 'events': return 'mdi:calendar-multiple'
      case 'users': return 'mdi:account-group'
      case 'clients': return 'mdi:domain'
      case 'reviews': return 'mdi:star-half-full'
      case 'trivia': return 'mdi:help-circle'
      case 'all': return 'mdi:database'
      default: return 'mdi:file-document'
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Data Source</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ENTITY_OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              relative p-4 rounded-lg border-2 transition-all
              ${selectedEntity === option.value
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            {selectedEntity === option.value && (
              <div className="absolute top-2 right-2">
                <Icon icon="mdi:check-circle" className="text-purple-600 text-xl" />
              </div>
            )}
            <div className="flex flex-col items-center text-center">
              <Icon 
                icon={getIconForEntity(option.value)} 
                className={`text-3xl mb-2 ${
                  selectedEntity === option.value ? 'text-purple-600' : 'text-gray-500'
                }`}
              />
              <div className={`font-medium ${
                selectedEntity === option.value ? 'text-purple-900' : 'text-gray-700'
              }`}>
                {option.label}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {option.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default EntitySelector