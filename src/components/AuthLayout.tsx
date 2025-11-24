import Notification from './Notification'

interface AuthLayoutProps {
  children: React.ReactNode
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="flex min-h-screen w-full md:flex-row flex-col relative">
      <Notification />
      <div className="flex-[2] bg-white bg-grid-pattern flex items-center justify-center p-8 md:min-h-screen min-h-[60vh]">
        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>

      <div className="flex-1 bg-gray-200 relative overflow-hidden md:min-h-screen min-h-[40vh]">
        <div className="absolute inset-0 w-full h-full">
          {/* Shape 1 - Purple */}
          <div
            className="absolute rounded-full opacity-60 blur-[40px] animate-float"
            style={{
              width: '300px',
              height: '300px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
              top: '-100px',
              right: '-50px',
              animationDelay: '0s',
            }}
          />
          
          {/* Shape 2 - Pink */}
          <div
            className="absolute rounded-full opacity-60 blur-[40px] animate-float"
            style={{
              width: '250px',
              height: '250px',
              background: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
              bottom: '50px',
              right: '50px',
              animationDelay: '4s',
            }}
          />
          
          {/* Shape 3 - Blue */}
          <div
            className="absolute rounded-full opacity-60 blur-[40px] animate-float"
            style={{
              width: '200px',
              height: '200px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
              top: '50%',
              right: '-30px',
              animationDelay: '8s',
            }}
          />
          
          {/* Shape 4 - Teal */}
          <div
            className="absolute rounded-full opacity-60 blur-[40px] animate-float"
            style={{
              width: '280px',
              height: '280px',
              background: 'linear-gradient(135deg, #14B8A6 0%, #5EEAD4 100%)',
              top: '100px',
              right: '100px',
              animationDelay: '12s',
            }}
          />
          
          {/* Shape 5 - Amber */}
          <div
            className="absolute rounded-full opacity-60 blur-[40px] animate-float"
            style={{
              width: '180px',
              height: '180px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
              bottom: '-50px',
              right: '200px',
              animationDelay: '16s',
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
