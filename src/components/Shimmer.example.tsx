/**
 * Shimmer Component Usage Examples
 * 
 * This file demonstrates how to use the shimmer components across admin pages.
 * Import the components you need from '../components'
 */

import {
  Shimmer,
  ShimmerInput,
  ShimmerTextArea,
  ShimmerButton,
  ShimmerCard,
  ShimmerTable,
  ShimmerForm,
  ShimmerModal,
  ShimmerMetrics,
  ShimmerPage,
} from './Shimmer'

// Example 1: Full Page Loading (Dashboard, Users, ClientsBrands, etc.)
export const ExamplePageLoading = () => {
  return (
    <DashboardLayout>
      <ShimmerPage />
    </DashboardLayout>
  )
}

// Example 2: Modal Loading State
export const ExampleModalLoading = () => {
  return <ShimmerModal />
}

// Example 3: Table Loading State
export const ExampleTableLoading = () => {
  return (
    <div className="p-8">
      <ShimmerTable rows={5} />
    </div>
  )
}

// Example 4: Metrics Cards Loading
export const ExampleMetricsLoading = () => {
  return (
    <div className="p-8">
      <ShimmerMetrics />
    </div>
  )
}

// Example 5: Custom Form Loading
export const ExampleFormLoading = () => {
  return (
    <div className="p-6">
      <ShimmerForm />
    </div>
  )
}

// Example 6: Individual Components
export const ExampleIndividualComponents = () => {
  return (
    <div className="p-6 space-y-4">
      <ShimmerInput />
      <ShimmerTextArea />
      <ShimmerButton width="200px" />
      <ShimmerCard />
    </div>
  )
}

// Example 7: Conditional Rendering in a Page
export const ExampleConditionalRendering = ({ isLoading }: { isLoading: boolean }) => {
  if (isLoading) {
    return (
      <DashboardLayout>
        <ShimmerPage />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Your actual content */}
      <div>Content here</div>
    </DashboardLayout>
  )
}

