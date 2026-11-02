export function parsePreferredBookingTime(value, now = new Date()) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})$/)
  if (!match) return null

  const [year, month, day] = match[1].split('-').map(Number)
  const hour = Number(match[2])
  const minute = Number(match[3])
  const validDate = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === match[1]
  if (!validDate || hour > 23 || minute > 59) return null

  const preferredAt = new Date(`${match[1]}T${match[2]}:${match[3]}:00+05:00`)
  if (
    !Number.isFinite(preferredAt.getTime()) ||
    preferredAt <= now ||
    preferredAt.getTime() > now.getTime() + 180 * 24 * 60 * 60 * 1000
  ) {
    return null
  }

  return {
    bookingDate: new Date(`${match[1]}T00:00:00.000Z`),
    bookingTime: `${match[2]}:${match[3]}`,
  }
}
