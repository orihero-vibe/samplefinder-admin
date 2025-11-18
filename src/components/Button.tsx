interface ButtonProps {
  children: React.ReactNode
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary'
  onClick?: () => void
  disabled?: boolean
  className?: string
}

const Button = ({ 
  children, 
  type = 'button', 
  variant = 'primary',
  onClick,
  disabled = false,
  className = ''
}: ButtonProps) => {
  const baseClasses = 'px-6 py-3.5 border-none rounded-lg text-base font-semibold cursor-pointer transition-all w-full'
  const variantClasses = variant === 'primary'
    ? 'bg-[#1D0A74] text-white hover:bg-[#15065c] active:bg-[#0f043a] disabled:opacity-60 disabled:cursor-not-allowed'
    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400 disabled:opacity-60 disabled:cursor-not-allowed'
  
  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default Button
