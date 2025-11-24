import { Icon } from '@iconify/react'

interface CategoriesHeaderProps {
  onAddCategory: () => void
}

const CategoriesHeader = ({ onAddCategory }: CategoriesHeaderProps) => {
  return (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Categories</h1>
        <p className="text-gray-600">Manage event categories.</p>
      </div>
      <button
        onClick={onAddCategory}
        className="px-4 py-2 bg-[#1D0A74] text-white rounded-lg hover:bg-[#15065c] transition-colors flex items-center gap-2"
      >
        <Icon icon="mdi:plus" className="w-5 h-5" />
        Add Category
      </button>
    </div>
  )
}

export default CategoriesHeader

