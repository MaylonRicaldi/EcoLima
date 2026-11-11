import test, { afterEach, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createIndicadoresRouters } from '../src/routes/indicadores.js'
import { createMapaRouters } from '../src/routes/mapa.js'
import { createOperacionRouters } from '../src/routes/operacion.js'

let server
let baseUrl
let permissions

function createPool() {
  return {
    async query(sql) {
      if (sql.includes('FROM ubicaciones')) return { rows: [] }
      if (sql.includes('INSERT INTO trafico')) {
        return {
          rows: [{
            id_trafico: 23,
            fecha_hora: '2026-11-11T12:00:00.000Z',
            segmento: 'Av. Lima',
            latitud: -12.1,
            longitud: -77.1,
            nivel_congestion: 'ROJO',
            velocidad_kmh: null,
            fuente: 'MANUAL',
          }],
        }
      }
      return { rows: [] }
    },
    async connect() {
      throw new Error('Unexpected connection')
    },
  }
}

beforeEach(async () => {
  const pool = createPool()
  const authenticate = (req, _res, next) => {
    req.user = { id_usuario: 1, rol: 'ADMIN' }
    next()
  }
  permissions = []
  const requirePermission = (resource, operation) => {
    permissions.push([resource, operation])
    return (_req, _res, next) => next()
  }
  const app = express()
  app.use(express.json())
  const operation = createOperacionRouters({ pool, authenticate, requirePermission })
  const indicators = createIndicadoresRouters({ pool, authenticate, requirePermission })
  const map = createMapaRouters({ pool, authenticate, requirePermission })
  app.use('/trafico', operation.traficoRouter)
  app.use('/incidentes', operation.incidentesRouter)
  app.use('/obstaculos', operation.obstaculosRouter)
  app.use('/operacion', operation.operacionRouter)
  app.use('/rutas', operation.evaluacionRouter)
  app.use('/', indicators.indicadoresRouter)
  app.use('/sostenibilidad', indicators.sostenibilidadRouter)
  app.use('/reportes', indicators.reportesRouter)
  app.use('/local', map.localRouter)
  app.use('/mapa', map.mapaRouter)
  app.use((error, _req, res, _next) => res.status(500).json({ detail: error.message }))
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

afterEach(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
    server = undefined
  }
})

test('factories retain protected endpoint contracts and route mount paths', async () => {
  const local = await fetch(`${baseUrl}/local`)
  assert.equal(local.status, 200)
  assert.deepEqual(await local.json(), {
    latitud: -12.055,
    longitud: -77.143,
    direccion: 'Puerto de Callao, Av. San Martín, Callao',
    origen: 'respaldo',
    hora_retorno_local: '21:00',
  })

  const missingQuery = await fetch(`${baseUrl}/reportes/sostenibilidad`)
  assert.equal(missingQuery.status, 422)
  assert.deepEqual((await missingQuery.json()).detail[0].loc, ['query', 'id_ruta'])

  assert.ok(permissions.some(([resource, operation]) => resource === 'rutas' && operation === 'leer'))
  assert.ok(permissions.some(([resource, operation]) => resource === 'reportes' && operation === 'leer'))
})

test('traffic creation validates schema and returns 201 with the response fields', async () => {
  const invalid = await fetch(`${baseUrl}/trafico`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nivel_congestion: 'MORADO' }),
  })
  assert.equal(invalid.status, 422)

  const created = await fetch(`${baseUrl}/trafico`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      segmento: 'Av. Lima',
      latitud: -12.1,
      longitud: -77.1,
      nivel_congestion: 'ROJO',
    }),
  })
  assert.equal(created.status, 201)
  assert.deepEqual(await created.json(), {
    id_trafico: 23,
    fecha_hora: '2026-11-11T12:00:00.000Z',
    segmento: 'Av. Lima',
    latitud: -12.1,
    longitud: -77.1,
    nivel_congestion: 'ROJO',
    velocidad_kmh: null,
    fuente: 'MANUAL',
  })
})

test('map update and incident patch enforce body validation and not-found status', async () => {
  const invalidLocal = await fetch(`${baseUrl}/local`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ direccion: 'X', latitud: 0, longitud: 0 }),
  })
  assert.equal(invalidLocal.status, 422)

  const missingIncident = await fetch(`${baseUrl}/incidentes/42/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'RESUELTO' }),
  })
  assert.equal(missingIncident.status, 404)
  assert.deepEqual(await missingIncident.json(), { detail: 'El incidente no existe' })
})
