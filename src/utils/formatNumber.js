export function formatGroupedNumber(value) {
  if (value === null || value === undefined || value === '') return ''
  const raw = String(value).replace(/[^\d.-]/g, '')
  if (raw === '' || raw === '-') return raw
  const [intPart, decPart] = raw.split('.')
  const negative = intPart.startsWith('-')
  const digits = intPart.replace('-', '')
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const withSign = negative ? `-${grouped}` : grouped
  return decPart !== undefined ? `${withSign}.${decPart}` : withSign
}

export function parseGroupedNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const raw = String(value).replace(/\s/g, '').replace(/[^\d.-]/g, '')
  const num = Number(raw)
  return Number.isFinite(num) ? num : 0
}

export function formatMoney(value, suffix = 'UZS') {
  const n = Number(value) || 0
  const formatted = formatGroupedNumber(Math.round(n))
  return suffix ? `${formatted} ${suffix}` : formatted
}
