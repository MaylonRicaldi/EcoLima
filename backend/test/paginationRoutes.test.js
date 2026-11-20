import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createClientesRouter } from '../src/routes/clientes.js'
import { createConductoresRouter } from '../src/routes/conductores.js'
import { createPedidosRouter } from '../src/routes/pedidos.js'
import { createRutasRouter } from '../src/routes/rutas.js'
import { createVehiculosRouter } from '../src/routes/vehiculos.js'

const client = {
  id_cliente: 1,
  nombre: 'Cliente de prueba',
  latitud: '-12.05',
  longitud: '-77.04',
  horario_apertura: '08:00:00',
  horario_cierre: '17:00:00',
}
const driver = {
  id_conductor: 2,
  dni: '12345678',
  nombre: 'Ana',
  apellido: 'Lima',
  horas_max_conduccion: '8',
  horas_conduccion_acumuladas: '2',
}
const order = {
  id_pedido: 3,
  id_cliente: 1,
  id_ventana_tiempo: 1,
  direccion_entrega: 'Lima',
  latitud: '-12.1',
  longitud: '-77.1',
  peso_kg: '5',
  volumen_m3: '0.2',
  prioridad: 'ESTANDAR',
  tipo_producto: 'NO_PERECEDERO',
  estado: 'PENDIENTE',
}
const vehicle = {
  id_vehiculo: 4,
  placa: 'ABC-123',
  capacidad_kg: '500',
  capacidad_m3: '4',
  consumo_km_l: '10',
  factor_co2_kg_km: '0.2',
}
const route = {
  id_ruta: 5,
  fecha: '2026-11-20',
  estado: 'PLANIFICADA',
  distancia_km: '12',
  duracion_minutos: '40',
  co2_kg: '3',
}

function createPool() {
  return {
    async query(sql) {
      if (sql.includes('COUNT(*)::int AS total')) return { rows: [{ total: 1 }] }
      if (sql.includes('SELECT id_cliente FROM clientes WHERE email')) return { rows: [{ id_cliente: 1 }] }
      if (sql.includes('SELECT rp.id_pedido')) return { rows: [{ id_pedido: 3 }] }
      if (sql.includes('FROM clientes c')) return { rows: [client] }
      if (sql.includes('FROM conductores c')) return { rows: [driver] }
      if (sql.includes('FROM pedidos p')) return { rows: [order] }
      if (sql.includes('FROM vehiculos')) return { rows: [vehicle] }
      if (sql.includes('FROM rutas r')) return { rows: [route] }
      throw new Error(`Unexpected SQL in pagination test: ${sql}`)
    },
  }
}

const servers = []
let baseUrl

test('paginated list endpoints return normalized rows and totals', async () => {
  const pool = createPool()
  const authenticate = (req, _res, next) => {
    req.user = {
      id_usuario: 1,
      email: 'cliente@example.test',
      rol: req.get('x-test-role') ?? 'ADMIN',
    }
    next()
  }
  const requirePermission = () => (_req, _res, next) => next()
  const dependencies = { pool, authenticate, requirePermission }
  const app = express()
  app.use('/clientes', createClientesRouter(dependencies))
  app.use('/conductores', createConductoresRouter(dependencies))
  app.use('/pedidos', createPedidosRouter(dependencies))
  app.use('/rutas', createRutasRouter(dependencies))
  app.use('/vehiculos', createVehiculosRouter(dependencies))
  app.use((error, _req, res, _next) => res.status(500).json({ detail: error.message }))

  const server = app.listen(0, '127.0.0.1')
  servers.push(server)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`

  const cases = [
    ['/clientes', 'latitud', -12.05],
    ['/conductores', 'horas_max_conduccion', 8],
    ['/pedidos', 'peso_kg', 5],
    ['/rutas', 'distancia_km', 12],
    ['/vehiculos', 'capacidad_kg', 500],
  ]

  for (const [path, field, expected] of cases) {
    const response = await fetch(`${baseUrl}${path}?page=1&limit=2`)
    assert.equal(response.status, 200, path)
    const result = await response.json()
    assert.equal(result.pagination.total, 1, path)
    assert.equal(result.pagination.page, 1, path)
    assert.equal(result.data.length, 1, path)
    assert.equal(result.data[0][field], expected, path)
  }

  for (const path of ['/conductores', '/pedidos', '/rutas']) {
    const response = await fetch(`${baseUrl}${path}`)
    assert.equal(response.status, 200, path)
    assert.equal((await response.json()).length, 1, path)
  }

  const orderResponse = await fetch(`${baseUrl}/pedidos/3`)
  assert.equal(orderResponse.status, 200)
  assert.equal((await orderResponse.json()).peso_kg, 5)

  for (const role of ['CLIENTE', 'CONDUCTOR']) {
    const response = await fetch(`${baseUrl}/pedidos?page=1&limit=2`, {
      headers: { 'x-test-role': role },
    })
    assert.equal(response.status, 200, role)
    assert.equal((await response.json()).data.length, 1, role)
  }
})

test('optimization persists a plan without assigning a driver', async () => {
  const orderForOptimization = {
    id_pedido: 8,
    id_cliente: 1,
    direccion_entrega: 'Lima',
    latitud: -12.06,
    longitud: -77.15,
    peso_kg: 20,
    volumen_m3: 0.5,
    prioridad: 'ESTANDAR',
    tipo_producto: 'NO_PERECEDERO',
    hora_inicio: '05:00',
    hora_fin: '22:00',
    tolerancia_minutos: 0,
    penalizacion_por_minuto: 0.5,
  }
  const vehicleForOptimization = {
    id_vehiculo: 9,
    placa: 'VEHICULO',
    capacidad_kg: 100,
    capacidad_m3: 4,
    consumo_km_l: 5,
    factor_co2_kg_km: 0.2,
    tipo_combustible: 'DIESEL',
    costo_adquisicion: 0,
    costo_soat_anual: 0,
    costo_seguro_anual: 0,
    depreciacion_anual: 0,
  }
  const client = {
    async query(sql) {
      assert.ok(sql === 'BEGIN' || sql === 'COMMIT', sql)
      return { rows: [] }
    },
    release() {},
  }
  const pool = {
    async query(sql) {
      if (sql.includes('INNER JOIN ventanas_tiempo')) return { rows: [orderForOptimization] }
      if (sql.includes('INNER JOIN tipos_vehiculo')) return { rows: [vehicleForOptimization] }
      if (sql.includes("WHERE c.estado IN ('DISPONIBLE','DESCANSO')")) return { rows: [] }
      if (sql.includes('FROM ubicaciones')) return { rows: [] }
      if (sql.includes('FROM trafico')) return { rows: [] }
      if (sql.includes('FROM incidentes i')) return { rows: [] }
      if (sql.includes('FROM obstaculos')) return { rows: [] }
      if (sql.includes('FROM asignaciones a INNER JOIN rutas r')) return { rows: [] }
      throw new Error(`Unexpected optimization SQL: ${sql}`)
    },
    async connect() {
      return client
    },
  }
  const authenticate = (req, _res, next) => {
    req.user = { id_usuario: 1, rol: 'ADMIN' }
    next()
  }
  const requirePermission = () => (_req, _res, next) => next()
  const roads = {
    async matrix() { return { km: null, minutes: null } },
    isAvailable() { return false },
  }
  const app = express()
  app.use(express.json())
  app.use('/rutas', createRutasRouter({ pool, authenticate, requirePermission, roads }))

  const server = app.listen(0, '127.0.0.1')
  servers.push(server)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  const response = await fetch(`http://127.0.0.1:${server.address().port}/rutas/optimizar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fecha: '2026-11-20', iteraciones: 1 }),
  })
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.equal(result.rutas_creadas.length, 0)
  assert.equal(result.pedidos_no_planificados.length, 1)
})

after(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })))
})
