interface AuthHeaderProps {
  title: string
  subtitle: string
}

const AuthHeader = ({ title, subtitle }: AuthHeaderProps) => {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2 m-0">{title}</h1>
      <p className="text-[0.95rem] text-gray-500 m-0">{subtitle}</p>
    </div>
  )
}

export default AuthHeader
