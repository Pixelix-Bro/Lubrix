import { formatGroupedNumber, parseGroupedNumber } from '../../utils/formatNumber'

export default function MoneyInput({
  value,
  onChange,
  className = '',
  placeholder = '0',
  disabled = false,
  required = false,
  name,
}) {
  const display = formatGroupedNumber(value)

  return (
    <input
      type="text"
      inputMode="numeric"
      name={name}
      required={required}
      disabled={disabled}
      value={display}
      placeholder={placeholder}
      onChange={(e) => {
        const next = e.target.value.replace(/[^\d\s]/g, '')
        onChange(parseGroupedNumber(next))
      }}
      className={className}
    />
  )
}
