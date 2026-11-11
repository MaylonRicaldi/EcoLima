import test from 'node:test'
import assert from 'node:assert/strict'
import {
  authorizeRouteDelivery,
  conductorIdFor,
  customerIdFor,
  orderIdsForDriver,
  routeIdsForDriver,
} from '../src/core/accessScope.js'

const driver = { id_usuario: 14, rol: 'CONDUCTOR', email: 'driver@example.com' }
const customer = { id_usuario: 15, rol: 'CLIENTE', email: 'customer@example.com' }

function createPool() {
  return {
    async query(sql) {
      if (sql.includes('SELECT id_conductor')) return { rows: [{ id_conductor: 9 }] }
      if (sql.includes('SELECT id_cliente')) return { rows: [{ id_cliente: 7 }] }
      if (sql.includes('SELECT a.id_ruta')) return { rows: [{ id_ruta: 21 }] }
      if (sql.includes('SELECT rp.id_pedido')) return { rows: [{ id_pedido: 33 }] }
      return { rows: [] }
    },
  }
}

test('resolves row-level identities for driver and customer accounts', async () => {
  const pool = createPool()
  assert.equal(await conductorIdFor(pool, driver), 9)
  assert.equal(await conductorIdFor(pool, customer), null)
  assert.equal(await customerIdFor(pool, driver), null)
  assert.equal(await customerIdFor(pool, customer), 7)
  assert.deepEqual(await routeIdsForDriver(pool, driver), new Set([21]))
  assert.deepEqual(await orderIdsForDriver(pool, driver), new Set([33]))
})

test('restricts delivery updates to assigned drivers', async () => {
  const pool = createPool({
    14: [{ id_ruta: 21 }],
  })
  assert.equal(await authorizeRouteDelivery(pool, driver, 21), true)
  assert.equal(await authorizeRouteDelivery(pool, driver, 22), false)
  assert.equal(await authorizeRouteDelivery(pool, customer, 21), false)
  assert.equal(await authorizeRouteDelivery(pool, { rol: 'ADMIN' }, 99), true)
})
