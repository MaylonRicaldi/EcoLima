import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import {
  createAsignacionesRouter,
  createObstaculosRutasRouter,
  createRutasRouter,
} from '../src/routes/rutas.js'

const servers = []

async function listen(app) {
  const server = app.listen(0, '127.0.0.1')
  servers.push(server)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  return `http://127.0.0.1:${server.address().port}`
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) =>
    new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  ))
})

function dependencies(pool, permissions = []) {
  return {
    pool,
    authenticate(req, _res, next) {
      req.user = { id_usuario: 5, rol: 'ADMIN' }
      next()
    },
    requirePermission(resource, operation) {
      permissions.push([resource, operation])
      return (_req, _res, next) => next()
    },
    roads: {
      async matrix() { return { km: null, minutes: null } },
      async routeTrace(stops) { return stops.map((stop) => [stop.latitud, stop.longitud]) },
      isAvailable() { return false },
    },
  }
}

test('logistics router factories validate inputs and register route/assignment permissions', async () => {
  const permissions = []
  const pool = {
    async query() { throw new Error('Invalid inputs should not query the database') },
  }
  const deps = dependencies(pool, permissions)
  const app = express()
  app.use(express.json())
  app.use('/rutas', createRutasRouter(deps))
  app.use('/asignaciones', createAsignacionesRouter(deps))
  app.use('/obstaculos', createObstaculosRutasRouter(deps))
  const baseUrl = await listen(app)

  const invalidOptimization = await fetch(`${baseUrl}/rutas/optimizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ iteraciones: 0 }),
  })
  assert.equal(invalidOptimization.status, 422)
  assert.equal((await invalidOptimization.json()).detail[0].loc[1], 'iteraciones')

  const invalidAssignmentId = await fetch(`${baseUrl}/asignaciones/not-an-id/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'COMPLETADA' }),
  })
  assert.equal(invalidAssignmentId.status, 422)

  assert.ok(permissions.some(([resource, operation]) => resource === 'rutas' && operation === 'leer'))
  assert.ok(permissions.some(([resource, operation]) => resource === 'rutas' && operation === 'escribir'))
  assert.ok(permissions.some(([resource, operation]) => resource === 'asignaciones' && operation === 'leer'))
  assert.ok(permissions.some(([resource, operation]) => resource === 'asignaciones' && operation === 'escribir'))
})

test('driver route details are row-scoped to their own assignments', async () => {
  const pool = {
    async query(sql) {
      if (sql.includes('SELECT id_conductor FROM conductores')) {
        return { rows: [{ id_conductor: 9 }] }
      }
      if (sql.includes('FROM rutas r')) return { rows: [] }
      throw new Error(`Unexpected SQL: ${sql}`)
    },
  }
  const app = express()
  app.use(express.json())
  const deps = dependencies(pool)
  deps.authenticate = (req, _res, next) => {
    req.user = { id_usuario: 5, rol: 'CONDUCTOR' }
    next()
  }
  app.use('/rutas', createRutasRouter(deps))
  const response = await fetch(`${await listen(app)}/rutas/52`)
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { detail: 'La ruta no existe o no tiene acceso' })
})
