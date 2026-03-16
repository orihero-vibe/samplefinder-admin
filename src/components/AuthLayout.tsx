import Notification from './Notification'

interface AuthLayoutProps {
  children: React.ReactNode
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="flex min-h-screen w-full lg:flex-row flex-col relative">
      <Notification />
      <div className="flex-1 bg-white bg-grid-pattern flex items-center justify-center p-8 md:min-h-screen min-h-[60vh]">
        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>

      <div className="flex-1 bg-gray-200 relative overflow-hidden md:min-h-screen min-h-[40vh]">
        <div className="absolute inset-0 w-full h-full">
          <picture>
            <source
              srcSet="/images/login-bg@3x.avif"
              media="(min-width: 1440px)"
            />
            <source
              srcSet="/images/login-bg@2x.avif"
              media="(min-width: 1024px)"
            />
            <img
              src="/images/login-bg.avif"
              alt="SampleFinder admin login background"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </picture>

          <div className="absolute inset-0 bg-gradient-to-l from-black/30 via-black/10 to-transparent" />
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
