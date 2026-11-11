import test from 'node:test'
import assert from 'node:assert/strict'
import { ProblemaVRPTW, SeededRandom } from '../src/services/optimizer.js'
import { evaluateSuggestedOrder } from '../src/services/ordenSuggested.js'
import { persistOptimization } from '../src/services/routePersistence.js'

const depot = { latitud: -12.055, longitud: -77.143, direccion: 'Base' }
const date = '2026-11-11'

function order(id, overrides = {}) {
  return {
    id_pedido: id,
    id_cliente: id,
    direccion_entrega: `Entrega ${id}`,
    latitud: -12.06 - id / 1000,
    longitud: -77.15 - id / 1000,
    peso_kg: 20,
    volumen_m3: 0.5,
    prioridad: 'ESTANDAR',
    tipo_producto: 'NO_PERECEDERO',
    hora_inicio: '05:00',
    hora_fin: '22:00',
    tolerancia_minutos: 0,
    penalizacion_por_minuto: 0.5,
    ...overrides,
  }
}

function vehicle(id, overrides = {}) {
  return {
    id_vehiculo: id,
    placa: `ABC-12${id}`,
    capacidad_kg: 100,
    capacidad_m3: 4,
    consumo_km_l: 5,
    factor_co2_kg_km: 0.2,
    tipo_combustible: 'DIESEL',
    tipo_nombre: 'FURGON',
    costo_adquisicion: 0,
    costo_soat_anual: 0,
    costo_seguro_anual: 0,
    ...overrides,
  }
}

function driver(id, overrides = {}) {
  return {
    id_conductor: id,
    id_usuario: id,
    nombre: `Driver${id}`,
    apellido: 'Test',
    hora_disponibilidad_inicio: '05:00',
    hora_disponibilidad_fin: '22:00',
    horas_max_conduccion: 8,
    horas_conduccion_acumuladas: 0,
    latitud_inicio: -12.07,
    longitud_inicio: -77.16,
    categorias_licencia: ['A-I'],
    ...overrides,
  }
}

test('VRPTW keeps weight and volume limits and separates incompatible cargo', () => {
  const problem = new ProblemaVRPTW(
    [
      order(1, { peso_kg: 70, tipo_producto: 'PERECEDERO' }),
      order(2, { peso_kg: 50, tipo_producto: 'QUIMICO' }),
      order(3, { peso_kg: 20, tipo_producto: 'NO_PERECEDERO' }),
    ],
    [vehicle(1), vehicle(2, { placa: 'ABC-123' })],
    [],
    depot,
    date
  )

  const routes = problem.solucion_inicial()
  assert.equal(routes.length, 2)
  assert.deepEqual(
    routes.flatMap((route) => route.secuencia.map((item) => item.id_pedido)).sort(),
    [1, 2, 3]
  )
  for (const route of routes) {
    assert.ok(route.vehiculo.carga_kg <= route.vehiculo.capacidad_kg)
    assert.ok(route.vehiculo.carga_m3 <= route.vehiculo.capacidad_m3)
    const kinds = route.secuencia.map((item) => item.tipo_producto)
    assert.equal(kinds.includes('PERECEDERO') && kinds.includes('QUIMICO'), false)
  }
})

test('MTC restriction excludes the matching final plate digit on the day', () => {
  const blocked = new ProblemaVRPTW(
    [order(1)],
    [vehicle(1, { placa: 'ABC-120' })],
    [],
    depot,
    '2026-11-09'
  )
  const eligible = new ProblemaVRPTW(
    [order(1)],
    [vehicle(1, { placa: 'ABC-121' })],
    [],
    depot,
    '2026-11-09'
  )
  assert.equal(blocked.solucion_inicial().length, 0)
  assert.equal(eligible.solucion_inicial().length, 1)
})

test('route evaluation applies late-window penalties and returns to driver start', () => {
  const customer = order(1, {
    latitud: -12.15,
    longitud: -77.143,
    hora_inicio: '05:00',
    hora_fin: '05:01',
  })
  const problem = new ProblemaVRPTW(
    [customer], [vehicle(1)], [driver(1)], depot, date,
    { primera_ruta: new Set() }
  )
  const [route, reason] = problem.fijar_secuencia(
    problem.vehiculos[0], problem.conductores[0], [1]
  )
  assert.equal(reason, null)
  assert.ok(route.secuencia[0].penalizacion > 0)

  const visit = problem._idx_parada(route.secuencia[0])
  const start = problem._idx_origen(route.conductor)
  assert.equal(start, 1)
  assert.ok(route.distancia_km >= problem._distancia(start, visit) * 2 - 0.01)
})

test('simulated annealing is seeded, preserves assigned orders and valid loads', () => {
  const problem = new ProblemaVRPTW(
    Array.from({ length: 5 }, (_, index) => order(index + 1)),
    [vehicle(1), vehicle(2)],
    [],
    depot,
    date
  )
  const first = problem.optimizar({ semilla: 17, iteraciones: 80, rng: new SeededRandom(17) })
  const ids = first.flatMap((route) => route.secuencia.map((item) => item.id_pedido)).sort()
  assert.deepEqual(ids, [1, 2, 3, 4, 5])
  for (const route of first) {
    assert.ok(route.vehiculo.carga_kg <= route.vehiculo.capacidad_kg)
    assert.ok(route.vehiculo.carga_m3 <= route.vehiculo.capacidad_m3)
  }
})

test('exchange moves use the uniform shape and can be reverted', () => {
  const problem = new ProblemaVRPTW(
    [order(1), order(2)],
    [vehicle(1)],
    [],
    depot,
    date
  )
  const routes = problem.solucion_inicial()
  const original = [...routes[0].secuencia]
  const indices = [0, 1]
  const rng = {
    random: () => 0.1,
    choice: (items) => items[0],
    randrange: () => indices.shift(),
  }

  const move = problem._vecino(routes, rng)
  assert.equal(move.length, 6)
  problem._rehacer(routes, move)
  assert.deepEqual(routes[0].secuencia, original)
})

test('suggested order keeps the current delivery when its time window is urgent', async () => {
  const pool = {
    async query(sql) {
      if (sql.includes("estado_entrega IN ('ENTREGADO','FALLIDO')")) {
        return { rows: [{ latitud: -12, longitud: -77 }] }
      }
      if (sql.includes("estado_entrega = 'PENDIENTE'")) {
        return { rows: [{
          id_pedido: 2, direccion_entrega: 'Current', latitud: -12.1,
          longitud: -77, hora_fin: '05:20', tolerancia_minutos: 0,
          penalizacion_por_minuto: 0.5,
        }] }
      }
      if (sql.includes('WHERE p.id_pedido = $1')) {
        return { rows: [{
          id_pedido: 3, direccion_entrega: 'New', latitud: -12.001,
          longitud: -77, hora_fin: '12:00', tolerancia_minutos: 0,
          penalizacion_por_minuto: 0.5,
        }] }
      }
      throw new Error(`Unexpected SQL: ${sql}`)
    },
  }
  const roads = {
    async matrix([[,], [lat]]) {
      const current = lat < -12.05
      return {
        km: [[0, current ? 8 : 0.1], [current ? 8 : 0.1, 0]],
        minutes: [[0, current ? 30 : 1], [current ? 30 : 1, 0]],
      }
    },
  }
  const suggestion = await evaluateSuggestedOrder(pool, 9, 3, {
    roads,
    now: new Date('2026-11-11T10:00:00'),
  })
  assert.equal(suggestion.recomendacion, 'MANTENER')
  assert.equal(suggestion.motivo, 'URGENTE_ACTUAL')
  assert.equal(suggestion.actual.urgente, true)
  assert.equal(suggestion.nuevo.urgente, false)
})

test('route persistence writes a complete parameterized SQL plan', async () => {
  const statements = []
  const client = {
    async query(sql, values = []) {
      statements.push(sql)
      const placeholders = [...sql.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]))
      assert.equal(Math.max(0, ...placeholders), values.length, sql)
      if (sql.includes('INSERT INTO rutas')) return { rows: [{ id_ruta: 31 }] }
      return { rows: [], rowCount: 1 }
    },
  }
  const problem = new ProblemaVRPTW(
    [order(1)], [vehicle(1)], [driver(1)], depot, date,
    { primera_ruta: new Set() }
  )
  const route = problem.solucion_inicial()[0]
  route.conductor = problem.conductores[0]
  const [created, warnings] = await persistOptimization(
    client, problem, [route], date, 5, 'SA', 0.1
  )
  assert.equal(warnings.length, 0)
  assert.equal(created[0].id_ruta, 31)
  assert.deepEqual(created[0].pedidos, [1])
  assert.ok(statements.some((sql) => sql.includes('INSERT INTO paradas_ruta')))
  assert.ok(statements.some((sql) => sql.includes('INSERT INTO ruta_pedidos')))
  assert.ok(statements.some((sql) => sql.includes('INSERT INTO asignaciones')))
  assert.ok(statements.some((sql) => sql.includes('INSERT INTO indicadores_ruta')))
})
