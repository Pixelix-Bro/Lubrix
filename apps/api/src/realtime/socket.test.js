import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { io as createClient } from 'socket.io-client'
import { getIO, getTenantRoom, initRealtime } from './socket.js'

test('tenant room is derived only from a server-verified session', () => {
  assert.equal(getTenantRoom({ session: { organizationId: 'org-1' } }), 'tenant:org-1')
  assert.equal(getTenantRoom({ session: null }), null)
  assert.equal(getTenantRoom(null), null)
})

test('socket rejects client-provided auth data without the HttpOnly cookie', async (context) => {
  const server = createServer()
  initRealtime(server)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  context.after(() => new Promise((resolve) => getIO().close(resolve)))

  const client = createClient(`http://127.0.0.1:${server.address().port}`, {
    auth: { token: 'client-controlled-token', organizationId: 'org-2' },
    transports: ['websocket'],
    reconnection: false,
  })
  context.after(() => client.disconnect())
  const error = await new Promise((resolve) => client.once('connect_error', resolve))
  assert.match(error.message, /Authentication required/)
})
