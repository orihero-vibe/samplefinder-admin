interface InputProps {
  id?: string
  type?: string
  label?: string
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  error?: string
  className?: string
}

const Input = ({
  id,
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  required = false,
  error,
  className = ''
}: InputProps) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-[0.9rem] font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={`px-4 py-3 border rounded-lg text-base text-gray-800 bg-white transition-all focus:outline-none focus:ring-4 placeholder:text-gray-400 w-full ${
          error 
            ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
            : 'border-gray-200 focus:border-[#1D0A74] focus:ring-[#1D0A74]/10'
        }`}
      />
      {error && (
        <span className="text-sm text-red-500">{error}</span>
      )}
    </div>
  )
}

export default Input
