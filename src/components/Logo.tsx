import { Icon } from '@iconify/react'

const Logo = () => {
  return (
    <div className="flex items-center gap-2 mb-12">
      <Icon icon="mdi:map-marker" className="w-8 h-8 text-brand-purple" />
      <span className="text-2xl font-semibold text-brand-purple">SampleFinder</span>
    </div>
  )
}

export default Logo
