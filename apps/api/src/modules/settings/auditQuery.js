const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const parseBound = (value, endOfDate = false) => {
  if (!value) return null
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  if (dateOnly && endOfDate) date.setUTCDate(date.getUTCDate() + 1)
  return date
}

export const buildAuditQuery = (query = {}) => {
  const from = parseBound(String(query.from || ''))
  const to = parseBound(String(query.to || ''), true)
  if (from === undefined || to === undefined) return { error: 'Sana oralig‘i noto‘g‘ri.' }
  if (from && to && from >= to) {
    return { error: 'Tugash sanasi boshlanish sanasidan keyin bo‘lishi kerak.' }
  }

  const createdAt = {}
  if (from) createdAt.$gte = from
  if (to) createdAt.$lt = to

  const filter = {}
  if (Object.keys(createdAt).length) filter.createdAt = createdAt
  if (query.entity) filter.entity = String(query.entity).trim().toUpperCase()
  if (query.action) filter.action = String(query.action).trim().toUpperCase()
  if (query.search && String(query.search).trim()) {
    const search = new RegExp(escapeRegex(String(query.search).trim().slice(0, 100)), 'i')
    filter.$or = ['userName', 'action', 'entity', 'details', 'path'].map((field) => ({
      [field]: search,
    }))
  }

  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 50))
  return { filter, page, limit, skip: (page - 1) * limit }
}
