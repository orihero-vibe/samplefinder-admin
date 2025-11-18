interface CheckboxProps {
  id?: string
  label: string
  checked: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
}

const Checkbox = ({ id, label, checked, onChange, className = '' }: CheckboxProps) => {
  return (
    <label className={`flex items-center gap-2 text-gray-700 cursor-pointer text-[0.9rem] ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 cursor-pointer"
        style={{ accentColor: '#1D0A74' }}
      />
      <span>{label}</span>
    </label>
  )
}

export default Checkbox
