export function parseOilQuantity(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null
  const quantity = Number(value)
  return Number.isFinite(quantity) && quantity >= 0.01 ? quantity : null
}

export function litersToInventoryQuantity(liters, unit) {
  const normalizedUnit = String(unit || 'L')
    .trim()
    .toLowerCase()
  if (['l', 'liter', 'liters', 'litre', 'litres', 'litr'].includes(normalizedUnit)) {
    return liters
  }
  if (['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'].includes(normalizedUnit)) {
    return Math.round(liters * 1000)
  }
  return null
}
