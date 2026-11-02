export const INSPECTION_POINT_KEYS = [
  'engineOil',
  'oilFilter',
  'airFilter',
  'cabinFilter',
  'coolant',
  'brakeFluid',
  'brakePads',
  'brakeDiscs',
  'battery',
  'chargingSystem',
  'tires',
  'tirePressure',
  'suspension',
  'steering',
  'lightsAndSignals',
]

export const INSPECTION_STATUSES = ['NOT_CHECKED', 'GOOD', 'ATTENTION', 'CRITICAL']

export const validateInspectionPayload = (payload) => {
  if (!payload?.customerId || !payload?.vehicleId) return 'Mijoz va avtomobil tanlanishi shart'
  if (!Number.isFinite(Number(payload.odometerKm)) || Number(payload.odometerKm) < 0) {
    return 'Probeg 0 yoki undan katta raqam bo‘lishi kerak'
  }
  if (!Array.isArray(payload.points) || payload.points.length !== INSPECTION_POINT_KEYS.length) {
    return '15 ta tekshiruv nuqtasi talab qilinadi'
  }

  const pointsByKey = new Map(payload.points.map((point) => [point.key, point]))
  if (pointsByKey.size !== INSPECTION_POINT_KEYS.length)
    return 'Har bir tekshiruv nuqtasi bir marta bo‘lishi kerak'
  for (const key of INSPECTION_POINT_KEYS) {
    const point = pointsByKey.get(key)
    if (!point || !INSPECTION_STATUSES.includes(point.status)) {
      return 'Tekshiruv statusi noto‘g‘ri yoki nuqta yetishmaydi'
    }
  }
  return null
}
