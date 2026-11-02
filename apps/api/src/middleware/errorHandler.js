import { randomUUID } from 'node:crypto'

export function errorHandler(err, req, res, _next) {
  const requestedStatus = Number(err.statusCode || err.status)
  const status = requestedStatus >= 400 && requestedStatus <= 599 ? requestedStatus : 500
  const requestId = req.id || req.headers['x-request-id'] || randomUUID()
  console.error('[LUBRIX ERROR]', {
    name: err.name,
    message: err.message || 'Unknown error',
    code: err.code,
    status,
    method: req.method,
    path: req.originalUrl,
    requestId,
  })
  const message = status >= 500 ? 'Internal Server Error' : err.message || 'So‘rov bajarilmadi'
  res.status(status).json({ success: false, error: message, requestId })
  void _next
}
