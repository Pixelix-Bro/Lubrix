const DEVELOPMENT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
]

export const getAllowedOrigins = (env = process.env) => {
  const configured = String(env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  if (env.NODE_ENV === 'production') {
    if (configured.length === 0) {
      throw new Error('Production muhitida CORS_ORIGINS allowlist sozlanishi shart')
    }
    return [...new Set(configured)]
  }
  return [...new Set([...DEVELOPMENT_ORIGINS, ...configured])]
}
