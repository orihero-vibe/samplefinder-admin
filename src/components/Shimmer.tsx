interface ShimmerProps {
  className?: string
  width?: string
  height?: string
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

const Shimmer = ({ className = '', width, height, rounded = 'md' }: ShimmerProps) => {
  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  }

  return (
    <div
      className={`bg-gray-200 animate-shimmer ${roundedClasses[rounded]} ${className}`}
      style={{
        width: width || '100%',
        height: height || '1rem',
      }}
    />
  )
}

// Shimmer variants for common UI elements
export const ShimmerInput = ({ className = '', width }: { className?: string; width?: string }) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    <Shimmer width={width || '80px'} height="14px" className="mb-1" />
    <Shimmer width={width || '100%'} height="42px" />
  </div>
)

export const ShimmerTextArea = ({ className = '', width }: { className?: string; width?: string }) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    <Shimmer width={width || '80px'} height="14px" className="mb-1" />
    <Shimmer width={width || '100%'} height="100px" />
  </div>
)

export const ShimmerButton = ({
  className = '',
  width,
  height = '42px',
}: {
  className?: string
  width?: string
  height?: string
}) => <Shimmer width={width || '120px'} height={height} className={className} />

export const ShimmerCard = ({ className = '' }: { className?: string }) => (
  <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
    <Shimmer width="60%" height="20px" className="mb-4" />
    <Shimmer width="100%" height="16px" className="mb-2" />
    <Shimmer width="80%" height="16px" />
  </div>
)

export const ShimmerTableRow = () => (
  <tr className="border-b border-gray-200">
    {[...Array(8)].map((_, i) => (
      <td key={i} className="px-6 py-4">
        <Shimmer width="80%" height="16px" />
      </td>
    ))}
  </tr>
)

export const ShimmerTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <div className="p-6 border-b border-gray-200">
      <Shimmer width="200px" height="24px" />
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {[...Array(8)].map((_, i) => (
              <th key={i} className="px-6 py-3">
                <Shimmer width="100px" height="12px" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, i) => (
            <ShimmerTableRow key={i} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

// Form Shimmer for modals
export const ShimmerForm = () => (
  <div className="p-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Left Column */}
      <div className="space-y-4">
        <ShimmerInput />
        <ShimmerInput />
        <ShimmerInput />
        <ShimmerInput />
        <ShimmerInput />
        <ShimmerInput />
        <ShimmerInput />
        <ShimmerInput />
        <ShimmerInput />
        <div className="flex flex-col gap-2">
          <Shimmer width="100px" height="14px" className="mb-1" />
          <div className="flex flex-wrap gap-2 min-h-[42px] p-2 border border-gray-200 rounded-lg">
            <Shimmer width="80px" height="28px" rounded="full" />
            <Shimmer width="80px" height="28px" rounded="full" />
            <Shimmer width="60px" height="28px" rounded="full" />
          </div>
        </div>
        <div className="space-y-2">
          <Shimmer width="80px" height="14px" className="mb-1" />
          <Shimmer width="100%" height="42px" />
          <Shimmer width="100%" height="42px" />
          <ShimmerButton width="120px" height="24px" />
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-4">
        <ShimmerInput />
        <div className="flex flex-col gap-2">
          <Shimmer width="140px" height="14px" className="mb-1" />
          <div className="h-32 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
            <Shimmer width="200px" height="40px" />
          </div>
        </div>
        <ShimmerInput />
        <ShimmerInput />
        <ShimmerInput />
        <ShimmerInput />
        <ShimmerInput />
        <ShimmerTextArea />
      </div>
    </div>

    {/* Action Buttons */}
    <div className="flex gap-4 pt-4 border-t border-gray-200">
      <ShimmerButton width="100px" height="42px" />
      <ShimmerButton width="100px" height="42px" />
      <ShimmerButton width="100px" height="42px" />
      <ShimmerButton width="120px" height="42px" className="flex-1" />
      <ShimmerButton width="140px" height="42px" className="flex-1" />
    </div>
  </div>
)

// Modal Shimmer
export const ShimmerModal = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
    <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex-1">
          <Shimmer width="200px" height="28px" className="mb-2" />
          <Shimmer width="400px" height="16px" />
        </div>
        <Shimmer width="24px" height="24px" rounded="full" />
      </div>
      <ShimmerForm />
    </div>
  </div>
)

// Dashboard Metrics Shimmer
export const ShimmerMetrics = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
    {[...Array(6)].map((_, i) => (
      <ShimmerCard key={i} />
    ))}
  </div>
)

// Page Shimmer (for full page loading)
export const ShimmerPage = () => (
  <div className="p-8">
    <div className="mb-8">
      <Shimmer width="200px" height="32px" className="mb-2" />
      <Shimmer width="400px" height="20px" />
    </div>
    <ShimmerMetrics />
    <ShimmerTable rows={8} />
  </div>
)

export default Shimmer

