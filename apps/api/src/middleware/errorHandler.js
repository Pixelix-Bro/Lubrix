export function errorHandler(err, req, res, _next) {
  console.error('[LUBRIX ERROR]', err)
  const status = err.status || err.statusCode || 500
  const message = err.message || 'Internal Server Error'
  res.status(status).json({ success: false, error: message })
  void _next
}
