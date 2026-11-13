import { Router } from 'express'
import { OPERATIONS } from '../core/permissions.js'
import { createRoadsService } from '../services/roads.js'
import * as D from '../services/optimizationData.js'
import { ProblemaVRPTW, MTC_NO_CIRCULA } from '../services/optimizer.js'
import { persistOptimization, persistReoptimization } from '../services/routePersistence.js'
import { evaluateSuggestedOrder } from '../services/ordenSuggested.js'

const ROUTE_COLUMNS = `
  r.id_ruta, r.fecha, r.hora_inicio, r.hora_fin, r.distancia_km,
  r.duracion_minutos, r.distancia_base_km, r.duracion_base_minutos,
  r.combustible_litros, r.costo_total, r.co2_kg, r.co2_evitable_kg,
  r.cumplimiento_ventanas_pct, r.estado, r.algoritmo_utilizado`
const ROUTE_STATES = new Set(['PLANIFICADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA', 'REOPTIMIZADA'])
const ASSIGNMENT_STATES = new Set(['ASIGNADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA'])
const DELIVERY_STATES = new Set(['PENDIENTE', 'ENTREGADO', 'FALLIDO', 'REPROGRAMADO'])
const ALGORITHMS = new Set(['GA', 'TABU', 'ACO', 'SA'])

class HttpError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : 'Error de validación')
    this.status = status
    this.detail = detail
  }
}

function endpoint(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res)
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.status).json({ detail: error.detail })
      return next(error)
    }
  }
}

function parsePagination(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  if (query.page === undefined && query.limit === undefined) return null
  const page = Math.max(parseInt(query.page, 10) || 1, 1)
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit)
  return { page, limit, offset: (page - 1) * limit }
}

function parseId(value, field) {
  if (!/^[+-]?\d+$/.test(String(value))) {
    throw new HttpError(422, [{
      loc: ['path', field],
      msg: 'Input should be a valid integer, unable to parse string as an integer',
      type: 'int_parsing',
    }])
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) {
    throw new HttpError(422, [{
      loc: ['path', field],
      msg: 'Input should be a valid integer, unable to parse string as an integer',
      type: 'int_parsing',
    }])
  }
  return parsed
}

function dateText(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
}

function validation(errors) {
  if (errors.length) throw new HttpError(422, errors)
}

function bodyObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(422, [{
      loc: ['body'],
      msg: value === undefined
        ? 'Field required'
        : 'Input should be a valid dictionary or object to extract fields from',
      type: value === undefined ? 'missing' : 'model_attributes_type',
    }])
  }
  return value
}

function integerField(body, field, { required = true, min = 0, max = Number.MAX_SAFE_INTEGER, fallback } = {}, errors) {
  const value = body[field]
  if (value === undefined) {
    if (fallback !== undefined) return fallback
    if (required) errors.push({ loc: ['body', field], msg: 'Field required', type: 'missing' })
    return undefined
  }
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  if (!Number.isSafeInteger(number)) {
    errors.push({ loc: ['body', field], msg: 'Input should be a valid integer', type: 'int_parsing' })
    return undefined
  }
  if (number < min) {
    errors.push({
      loc: ['body', field],
      msg: min === 1 ? 'Input should be greater than 0' : `Input should be greater than or equal to ${min}`,
      type: min === 1 ? 'greater_than' : 'greater_than_equal',
    })
  }
  if (number > max) {
    errors.push({ loc: ['body', field], msg: `Input should be less than or equal to ${max}`, type: 'less_than_equal' })
  }
  return number
}

function parseOptimizationBody(value, reoptimization = false) {
  const body = bodyObject(value)
  const errors = []
  const iterations = integerField(body, 'iteraciones', {
    min: 1, max: 2000, fallback: reoptimization ? 200 : 250,
  }, errors)
  const seed = body.semilla === undefined || body.semilla === null
    ? null : integerField(body, 'semilla', { min: -Number.MAX_SAFE_INTEGER }, errors)
  let algorithm
  let date
  let reason
  if (!reoptimization) {
    algorithm = body.algoritmo ?? 'SA'
    if (typeof algorithm !== 'string' || !ALGORITHMS.has(algorithm)) {
      errors.push({ loc: ['body', 'algoritmo'], msg: 'El algoritmo debe ser GA, TABU, ACO o SA', type: 'value_error' })
    }
    date = body.fecha ?? null
    if (date !== null && (typeof date !== 'string'
      || !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || Number.isNaN(Date.parse(`${date}T00:00:00Z`))
      || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) {
      errors.push({ loc: ['body', 'fecha'], msg: 'Input should be a valid date', type: 'date_parsing' })
    }
  } else {
    reason = body.motivo ?? null
    if (reason !== null && typeof reason !== 'string') {
      errors.push({ loc: ['body', 'motivo'], msg: 'Input should be a valid string', type: 'string_type' })
    }
  }
  validation(errors)
  return reoptimization
    ? { iteraciones: iterations, semilla: seed, motivo: reason }
    : { iteraciones: iterations, semilla: seed, algoritmo: algorithm, fecha: date }
}

function enumBody(value, field, validValues) {
  const body = bodyObject(value)
  if (typeof body[field] !== 'string') {
    throw new HttpError(422, [{
      loc: ['body', field],
      msg: body[field] === undefined ? 'Field required' : 'Input should be a valid string',
      type: body[field] === undefined ? 'missing' : 'string_type',
    }])
  }
  if (!validValues.has(body[field])) {
    throw new HttpError(422, [{ loc: ['body', field], msg: 'Estado no válido', type: 'value_error' }])
  }
  return body[field]
}

async function transaction(pool, callback) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

function numericRow(row, fields) {
  if (!row) return row
  const result = { ...row }
  for (const field of fields) {
    if (result[field] !== null && result[field] !== undefined) result[field] = Number(result[field])
  }
  return result
}

const routeNumberFields = [
  'distancia_km', 'duracion_minutos', 'distancia_base_km',
  'duracion_base_minutos', 'combustible_litros', 'costo_total', 'co2_kg',
  'co2_evitable_kg', 'cumplimiento_ventanas_pct',
]
const detailNumberFields = [
  'latitud', 'longitud', 'peso_kg', 'volumen_m3', 'tiempo_servicio',
  'tiempo_espera', 'penalizacion', 'horas_conduccion', 'horas_descanso',
  'distancia_km', 'co2_kg', 'combustible_l', 'costo_total',
  'ahorro_combustible_l', 'ahorro_economico', 'co2_ahorrado_kg',
  'cumplimiento_ventanas_pct', 'reduccion_co2_pct', 'reduccion_distancia_pct',
]

async function driverIdFor(pool, user) {
  if (user?.rol !== 'CONDUCTOR') return null
  const { rows } = await pool.query(
    'SELECT id_conductor FROM conductores WHERE id_usuario = $1',
    [Number(user.id_usuario)]
  )
  return rows[0]?.id_conductor ?? null
}

async function assertRouteAccess(pool, user, routeId) {
  if (user?.rol === 'ADMIN' || user?.rol === 'OPERADOR') return
  if (user?.rol !== 'CONDUCTOR') {
    throw new HttpError(403, 'No tiene permisos para actualizar entregas')
  }
  const { rows } = await pool.query(
    `SELECT 1 FROM asignaciones a
     INNER JOIN conductores c ON c.id_conductor = a.id_conductor
     WHERE a.id_ruta = $1 AND c.id_usuario = $2`,
    [routeId, Number(user.id_usuario)]
  )
  if (!rows.length) {
    throw new HttpError(403, 'Esta ruta no está asignada a usted. Solo puede actualizar sus propias entregas.')
  }
}

function routeFactoryDependencies(options) {
  const { pool, authenticate, requirePermission } = options
  if (!pool || !authenticate || !requirePermission) {
    throw new TypeError('pool, authenticate y requirePermission son obligatorios')
  }
  return {
    pool,
    authenticate,
    requirePermission,
    roads: options.roads ?? createRoadsService(),
  }
}

export function createRutasRouter(options) {
  const { pool, authenticate, requirePermission, roads } = routeFactoryDependencies(options)
  const router = Router()
  const read = requirePermission('rutas', OPERATIONS.READ)
  const write = requirePermission('rutas', OPERATIONS.WRITE)

  router.post('/optimizar', authenticate, write, endpoint(async (req, res) => {
    const input = parseOptimizationBody(req.body)
    const date = input.fecha ?? new Date().toISOString().slice(0, 10)
    const [orders, fleet, drivers, depot] = await Promise.all([
      D.pendingOrders(pool), D.activeFleet(pool), D.availableDrivers(pool), D.operationalDepot(pool),
    ])
    if (!orders.length) throw new HttpError(400, 'No hay pedidos pendientes para optimizar')
    if (!fleet.length) throw new HttpError(400, 'No hay vehículos activos disponibles')

    const weekday = (() => {
      const day = new Date(`${date}T00:00:00Z`).getUTCDay()
      return day || 7
    })()
    const blocked = []
    const eligible = fleet.filter((vehicle) => {
      const digits = String(vehicle.placa ?? '').replace(/\D/g, '')
      const last = digits ? Number(digits.at(-1)) : null
      const allowed = last == null || !MTC_NO_CIRCULA[weekday]?.has(last)
      if (!allowed) blocked.push(vehicle.placa)
      return allowed
    })
    const warnings = []
    if (blocked.length) warnings.push(`Vehículos excluidos por la restricción vehicular del día ${weekday}: ${blocked.join(', ')}`)
    if (!eligible.length) {
      throw new HttpError(400, `Ningún vehículo activo puede circular hoy por la restricción vehicular que le corresponde por su placa. Excluidas: ${blocked.join(', ')}`)
    }
    if (!drivers.length) warnings.push('No hay conductores disponibles con licencia vigente.')
    const [traffic, incidents, obstacles, firstRoutes] = await Promise.all([
      D.currentTraffic(pool), D.activeIncidents(pool), D.activeObstacles(pool),
      D.driversWithRoutesOnDate(pool, date),
    ])
    if (traffic.length) warnings.push(`Se aplicó tráfico registrado en ${traffic.length} tramos.`)
    if (incidents.length) warnings.push(`Hay ${incidents.length} incidentes activos registrados.`)
    if (obstacles.length) warnings.push(`Se esquivan ${obstacles.length} obstrucción(es) de la calzada.`)
    const started = process.hrtime.bigint()
    const problem = new ProblemaVRPTW(orders, eligible, drivers, depot, date, {
      trafico: traffic, incidentes: incidents, obstaculos: obstacles,
      primera_ruta: firstRoutes, roads,
    })
    await problem.preparar_distancias()
    const routes = problem.asignar_conductores(problem.optimizar({
      semilla: input.semilla ?? 42, iteraciones: input.iteraciones,
    }))
    const planned = []
    const unplanned = []
    for (const route of routes) {
      if (route.vehiculo.carga_kg > route.vehiculo.capacidad_kg
        || route.vehiculo.carga_m3 > route.vehiculo.capacidad_m3) {
        for (const customer of route.secuencia) {
          unplanned.push({ id_pedido: customer.id_pedido, motivo: 'Excede la capacidad del vehículo (RN-006)' })
        }
      } else if (!route.conductor) {
        for (const customer of route.secuencia) {
          unplanned.push({ id_pedido: customer.id_pedido, motivo: 'No hay conductores disponibles con licencia vigente para asignar' })
        }
      } else {
        planned.push(route)
      }
    }
    const elapsedSeconds = () => Number(process.hrtime.bigint() - started) / 1e9
    const [created] = await transaction(pool, (client) => persistOptimization(
      client, problem, planned, date, req.user.id_usuario, input.algoritmo, elapsedSeconds()
    ))
    const seconds = Number(elapsedSeconds().toFixed(3))
    if (!problem._usar_calles_reales) {
      warnings.push('No se pudo consultar el motor de rutas: las distancias son una estimación por factor de rodeo, no el trazado real de las calles')
    }
    const plannedIds = new Set(created.flatMap((route) => route.pedidos.map(String)))
    for (const customer of problem.clientes) {
      if (!plannedIds.has(String(customer.id_pedido)) && !unplanned.some((item) => String(item.id_pedido) === String(customer.id_pedido))) {
        unplanned.push({
          id_pedido: customer.id_pedido,
          motivo: 'Ningun vehiculo con capacidad suficiente disponible (RN-006)',
        })
      }
    }
    return res.json({
      rutas_creadas: created.map((route) => {
        const { pedidos: _orders, ...summary } = route
        return summary
      }),
      pedidos_planificados: planned.reduce((count, route) => count + route.secuencia.length, 0),
      pedidos_no_planificados: unplanned,
      vehiculos_elegibles: eligible.length,
      conductores_disponibles: drivers.length,
      segundos_resueltos: seconds,
      calles_reales: problem._usar_calles_reales,
      advertencias: warnings,
    })
  }))

  router.get('', authenticate, read, endpoint(async (req, res) => {
    const driverId = await driverIdFor(pool, req.user)
    const estado = req.query.estado ?? null
    const where = `WHERE ($1::text IS NULL OR r.estado = $1)
         AND ($2::integer IS NULL OR EXISTS (
           SELECT 1 FROM asignaciones a
           WHERE a.id_ruta = r.id_ruta AND a.id_conductor = $2
         ))`
    const values = [estado, driverId]
    const pagination = parsePagination(req.query)
    if (pagination) {
      const [rowsRes, countRes] = await Promise.all([
        pool.query(
          `SELECT ${ROUTE_COLUMNS} FROM rutas r ${where}
           ORDER BY r.fecha DESC, r.id_ruta DESC
           LIMIT $3 OFFSET $4`,
          [...values, pagination.limit, pagination.offset]
        ),
        pool.query(`SELECT COUNT(*)::int AS total FROM rutas r ${where}`, values),
      ])
      const total = countRes.rows[0]?.total ?? 0
      return res.json({
        data: rowsRes.rows.map((row) => numericRow(row, routeNumberFields)),
        pagination: {
          total,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(total / pagination.limit),
        },
      })
    }
    const { rows } = await pool.query(
      `SELECT ${ROUTE_COLUMNS} FROM rutas r ${where}
       ORDER BY r.fecha DESC, r.id_ruta DESC`,
      values
    )
    return res.json(rows.map((row) => numericRow(row, routeNumberFields)))
  }))

  router.get('/:id_ruta', authenticate, read, endpoint(async (req, res) => {
    const routeId = parseId(req.params.id_ruta, 'id_ruta')
    const driverId = await driverIdFor(pool, req.user)
    const { rows: routes } = await pool.query(
      `SELECT ${ROUTE_COLUMNS} FROM rutas r
       WHERE r.id_ruta = $1 AND ($2::integer IS NULL OR EXISTS (
         SELECT 1 FROM asignaciones a
         WHERE a.id_ruta = r.id_ruta AND a.id_conductor = $2
       ))`,
      [routeId, driverId]
    )
    if (!routes[0]) throw new HttpError(404, 'La ruta no existe o no tiene acceso')
    const [stops, orders, assignments, indicators] = await Promise.all([
      pool.query(
        `SELECT id_parada, orden, latitud, longitud, hora_llegada_estimada,
                hora_llegada_real, tiempo_servicio, tiempo_espera, tipo_parada
         FROM paradas_ruta WHERE id_ruta = $1 ORDER BY orden`,
        [routeId]
      ),
      pool.query(
        `SELECT rp.orden_visita, rp.hora_llegada_estimada,
                rp.hora_llegada_real, rp.tiempo_espera, rp.penalizacion,
                rp.estado_entrega, pe.id_pedido, pe.direccion_entrega,
                pe.latitud, pe.longitud, pe.peso_kg, pe.volumen_m3,
                pe.prioridad, pe.tipo_producto, pe.estado AS estado_pedido,
                cl.nombre AS cliente_nombre
         FROM ruta_pedidos rp
         INNER JOIN pedidos pe ON pe.id_pedido = rp.id_pedido
         INNER JOIN clientes cl ON cl.id_cliente = pe.id_cliente
         WHERE rp.id_ruta = $1 ORDER BY rp.orden_visita`,
        [routeId]
      ),
      pool.query(
        `SELECT a.id_asignacion, a.hora_salida, a.hora_retorno,
                a.horas_conduccion, a.horas_descanso, a.descanso_requerido,
                a.estado, v.id_vehiculo, v.placa, t.nombre AS tipo_vehiculo,
                co.id_conductor, co.nombre AS conductor_nombre,
                co.apellido AS conductor_apellido
         FROM asignaciones a
         INNER JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
         INNER JOIN tipos_vehiculo t ON t.id_tipo = v.id_tipo_vehiculo
         INNER JOIN conductores co ON co.id_conductor = a.id_conductor
         WHERE a.id_ruta = $1`,
        [routeId]
      ),
      pool.query('SELECT * FROM indicadores_ruta WHERE id_ruta = $1', [routeId]),
    ])
    const visitStops = stops.rows.filter((stop) => stop.tipo_parada !== 'DESCANSO')
    const trace = await roads.routeTrace(visitStops)
    const result = numericRow(routes[0], routeNumberFields)
    result.paradas = stops.rows.map((row) => numericRow(row, detailNumberFields))
    result.pedidos = orders.rows.map((row) => numericRow(row, detailNumberFields))
    result.asignacion = numericRow(assignments.rows[0] ?? null, detailNumberFields)
    result.indicador = numericRow(indicators.rows[0] ?? null, detailNumberFields)
    result.trazado = trace
    result.trazado_real = roads.isAvailable()
    return res.json(result)
  }))

  router.patch('/:id_ruta/estado', authenticate, write, endpoint(async (req, res) => {
    const routeId = parseId(req.params.id_ruta, 'id_ruta')
    const state = enumBody(req.body, 'estado', ROUTE_STATES)
    const { rows } = await pool.query(
      `UPDATE rutas SET estado = $1 WHERE id_ruta = $2 RETURNING id_ruta`,
      [state, routeId]
    )
    if (!rows[0]) throw new HttpError(404, 'La ruta no existe')
    const { rows: updated } = await pool.query(
      `SELECT ${ROUTE_COLUMNS} FROM rutas r WHERE r.id_ruta = $1`,
      [routeId]
    )
    return res.json(numericRow(updated[0], routeNumberFields))
  }))

  router.post('/:id_ruta/reoptimizar', authenticate, write, endpoint(async (req, res) => {
    const routeId = parseId(req.params.id_ruta, 'id_ruta')
    const input = parseOptimizationBody(req.body, true)
    const started = process.hrtime.bigint()
    const { rows } = await pool.query('SELECT fecha, estado FROM rutas WHERE id_ruta = $1', [routeId])
    const routeRow = rows[0]
    if (!routeRow) throw new HttpError(404, 'La ruta no existe')
    if (['COMPLETADA', 'CANCELADA'].includes(routeRow.estado)) {
      throw new HttpError(400, `No se puede corregir el recorrido de una ruta ${routeRow.estado.toLowerCase()}: ya está cerrada y solo queda como registro.`)
    }
    const [vehicle, driver, allOrders, closed, depot, traffic, incidents, obstacles, firstRoutes] = await Promise.all([
      D.vehicleForRoute(pool, routeId), D.driverForRoute(pool, routeId),
      D.ordersForRoute(pool, routeId), D.closedDeliveriesForRoute(pool, routeId),
      D.operationalDepot(pool), D.currentTraffic(pool), D.activeIncidents(pool),
      D.activeObstacles(pool), D.driversWithRoutesOnDate(pool, routeRow.fecha),
    ])
    if (!vehicle || !driver) throw new HttpError(400, 'La ruta todavía no tiene vehículo y conductor asignados. La reoptimización conserva los que ya tiene, así que primero hay que asignarlos.')
    if (!allOrders.length) throw new HttpError(400, 'La ruta no tiene pedidos que reoptimizar')
    const previousOrder = allOrders.map((order) => order.id_pedido)
    const pending = allOrders.filter((order) => !closed.has(order.id_pedido))
    if (!pending.length) throw new HttpError(409, 'Esta ruta ya no tiene pedidos por entregar: están todos entregados o fallidos. Una ruta cerrada no se vuelve a optimizar.')
    const warnings = []
    if (closed.size) warnings.push(`${closed.size} entrega(s) ya cerrada(s) se conservan como registro y no se tocan`)
    if (vehicle.estado !== 'ACTIVO') warnings.push(`El vehículo ${vehicle.placa} está ${vehicle.estado.toLowerCase()}. La reoptimización no cambia de vehículo, así que se reordena igualmente.`)
    if (!(driver.categorias_licencia ?? []).length) warnings.push(`${driver.nombre} ${driver.apellido} no tiene licencia vigente. La reoptimización no cambia de conductor.`)
    const problem = new ProblemaVRPTW(pending, [vehicle], [driver], depot, routeRow.fecha, {
      trafico: traffic, incidentes: incidents, obstaculos: obstacles,
      primera_ruta: firstRoutes, roads,
    })
    await problem.preparar_distancias()
    if (!problem._usar_calles_reales) warnings.push('No se pudo consultar el motor de rutas: el recorrido se calculó con una estimación por factor de rodeo')
    const [optimized, reason] = problem.reoptimizar_secuencia(
      problem.vehiculos[0], problem.conductores[0],
      pending.map((order) => order.id_pedido),
      { semilla: input.semilla ?? 42, iteraciones: input.iteraciones }
    )
    if (reason) throw new HttpError(409, reason)
    const summary = await transaction(pool, (client) =>
      persistReoptimization(client, routeId, problem, optimized, routeRow.fecha, closed)
    )
    const newOrder = summary.orden_pedidos
    if (input.motivo) warnings.push(`Motivo registrado: ${input.motivo}`)
    return res.json({
      id_ruta: routeId, vehiculo: vehicle.placa, id_vehiculo: vehicle.id_vehiculo,
      conductor: `${driver.nombre} ${driver.apellido}`.trim(),
      id_conductor: driver.id_conductor, pedidos: newOrder,
      orden_anterior: previousOrder, orden_nuevo: newOrder,
      orden_cambio: newOrder.length !== previousOrder.length
        || newOrder.some((id, index) => String(id) !== String(previousOrder[index])),
      distancia_km: summary.distancia_km, duracion_minutos: summary.duracion_minutos,
      costo_total: summary.costo_total, co2_kg: summary.co2_kg,
      cumplimiento_ventanas_pct: summary.cumplimiento_ventanas_pct,
      cambio: summary.cambio,
      segundos_resueltos: Number((Number(process.hrtime.bigint() - started) / 1e9).toFixed(3)),
      calles_reales: problem._usar_calles_reales,
      advertencias: warnings,
    })
  }))

  router.post('/:id_ruta/pedidos', authenticate, write, endpoint(async (req, res) => {
    const routeId = parseId(req.params.id_ruta, 'id_ruta')
    const errors = []
    const orderId = integerField(bodyObject(req.body), 'id_pedido', { min: 1 }, errors)
    validation(errors)
    await assertRouteAccess(pool, req.user, routeId)
    return enqueueOrder(pool, roads, routeId, orderId, res)
  }))

  router.post('/:id_ruta/pedidos/:id_pedido/anticipar', authenticate, write, endpoint(async (req, res) => {
    const routeId = parseId(req.params.id_ruta, 'id_ruta')
    const orderId = parseId(req.params.id_pedido, 'id_pedido')
    await assertRouteAccess(pool, req.user, routeId)
    const { rows: pending } = await pool.query(
      `SELECT id_pedido, orden_visita FROM ruta_pedidos
       WHERE id_ruta=$1 AND estado_entrega='PENDIENTE' ORDER BY orden_visita`,
      [routeId]
    )
    if (!pending.some((row) => String(row.id_pedido) === String(orderId))) {
      throw new HttpError(404, 'El pedido no está pendiente en esta ruta. Una entrega ya cerrada no se mueve.')
    }
    if (pending.length < 2) throw new HttpError(409, 'Es la única entrega que falta: no hay nada que adelantar.')
    const first = pending[0]
    if (String(first.id_pedido) === String(orderId)) {
      return res.json({ id_ruta: routeId, id_pedido: orderId, cambiado: false, mensaje: 'Ese pedido ya era el primero.' })
    }
    const selected = pending.find((row) => String(row.id_pedido) === String(orderId))
    await transaction(pool, async (client) => {
      await client.query(
        `UPDATE ruta_pedidos SET orden_visita=$1 WHERE id_ruta=$2 AND id_pedido=$3`,
        [first.orden_visita, routeId, orderId]
      )
      await client.query(
        `UPDATE ruta_pedidos SET orden_visita=$1 WHERE id_ruta=$2 AND id_pedido=$3`,
        [selected.orden_visita, routeId, first.id_pedido]
      )
    })
    const recalculated = await recalculateOrder(pool, roads, routeId)
    if (recalculated.motivo) throw new HttpError(409, recalculated.motivo)
    return res.json({
      id_ruta: routeId, id_pedido: orderId, cambiado: true,
      orden: recalculated.orden_pedidos ?? [],
      distancia_km: recalculated.distancia_km,
      duracion_minutos: recalculated.duracion_minutos,
      mensaje: 'Pedido adelantado: pasa a ser el siguiente. El que venía ahora vuelve a la cola, y los demás no se tocan.',
    })
  }))

  router.get('/:id_ruta/pedidos/:id_pedido/orden-sugerido', authenticate, read, endpoint(async (req, res) => {
    const routeId = parseId(req.params.id_ruta, 'id_ruta')
    const orderId = parseId(req.params.id_pedido, 'id_pedido')
    await assertRouteAccess(pool, req.user, routeId)
    return res.json(await evaluateSuggestedOrder(pool, routeId, orderId, { roads }))
  }))

  router.patch('/:id_ruta/pedidos/:id_pedido/estado', authenticate, read, endpoint(async (req, res) => {
    const routeId = parseId(req.params.id_ruta, 'id_ruta')
    const orderId = parseId(req.params.id_pedido, 'id_pedido')
    const state = enumBody(req.body, 'estado_entrega', DELIVERY_STATES)
    const body = bodyObject(req.body)
    let arrival = body.hora_llegada_real ?? null
    if (arrival != null && (typeof arrival !== 'string' || Number.isNaN(Date.parse(arrival)))) {
      throw new HttpError(422, [{
        loc: ['body', 'hora_llegada_real'],
        msg: 'Input should be a valid datetime',
        type: 'datetime_parsing',
      }])
    }
    await assertRouteAccess(pool, req.user, routeId)
    const result = await transaction(pool, async (client) => {
      const { rows: currentRows } = await client.query(
        `SELECT estado_entrega FROM ruta_pedidos WHERE id_ruta=$1 AND id_pedido=$2`,
        [routeId, orderId]
      )
      const current = currentRows[0]?.estado_entrega
      if (current == null) throw new HttpError(404, 'El pedido no pertenece a esta ruta')
      if (['ENTREGADO', 'FALLIDO'].includes(current) && state !== current) {
        throw new HttpError(409, `El pedido ya está ${current.toLowerCase()} y no se puede cambiar a ${state.toLowerCase()}. Una entrega cerrada queda como registro.`)
      }
      await client.query(
        `UPDATE ruta_pedidos SET estado_entrega=$1,
           hora_llegada_real=CASE
             WHEN $1 IN ('ENTREGADO','FALLIDO') THEN COALESCE($2::timestamp,CURRENT_TIMESTAMP)
             ELSE NULL END
         WHERE id_ruta=$3 AND id_pedido=$4`,
        [state, arrival, routeId, orderId]
      )
      const orderState = { ENTREGADO: 'ENTREGADO', FALLIDO: 'FALLIDO', REPROGRAMADO: 'PENDIENTE' }[state]
      if (orderState) await client.query('UPDATE pedidos SET estado=$1 WHERE id_pedido=$2', [orderState, orderId])
      const { rows: closedRows } = await client.query(
        `SELECT COUNT(*) AS count FROM ruta_pedidos
         WHERE id_ruta=$1 AND estado_entrega IN ('ENTREGADO','FALLIDO')`,
        [routeId]
      )
      const { rows: totalRows } = await client.query(
        `SELECT COUNT(*) AS count FROM ruta_pedidos WHERE id_ruta=$1`,
        [routeId]
      )
      if (Number(totalRows[0].count) && Number(closedRows[0].count) >= Number(totalRows[0].count)) {
        await closeRoute(client, routeId)
      } else {
        await client.query(
          `UPDATE rutas SET estado='EN_CURSO' WHERE id_ruta=$1 AND estado IN ('PLANIFICADA','REOPTIMIZADA')`,
          [routeId]
        )
        await client.query(
          `UPDATE asignaciones SET estado='EN_CURSO' WHERE id_ruta=$1 AND estado='ASIGNADA'`,
          [routeId]
        )
      }
      const { rows } = await client.query(
        'SELECT * FROM ruta_pedidos WHERE id_ruta=$1 AND id_pedido=$2',
        [routeId, orderId]
      )
      return rows[0]
    })
    return res.json(result)
  }))
  return router
}

async function enqueueOrder(pool, roads, routeId, orderId, res) {
  const response = await transaction(pool, async (client) => {
    const { rows: routes } = await client.query(
      'SELECT estado, fecha FROM rutas WHERE id_ruta=$1',
      [routeId]
    )
    const route = routes[0]
    if (!route) throw new HttpError(404, 'La ruta no existe')
    if (['COMPLETADA', 'CANCELADA'].includes(route.estado)) {
      throw new HttpError(409, `La ruta está ${route.estado.toLowerCase()} y ya no acepta pedidos.`)
    }
    const { rows: orderRows } = await client.query(
      `SELECT p.id_pedido, p.estado, p.id_ventana_tiempo,
              rp.id_ruta AS id_ruta_actual
       FROM pedidos p LEFT JOIN ruta_pedidos rp ON rp.id_pedido=p.id_pedido
       WHERE p.id_pedido=$1`,
      [orderId]
    )
    const order = orderRows[0]
    if (!order) throw new HttpError(404, 'El pedido no existe')
    if (!['PENDIENTE', 'ASIGNADO'].includes(order.estado)) {
      throw new HttpError(409, `El pedido está ${order.estado.toLowerCase()} y no se puede encargar.`)
    }
    if (order.id_ruta_actual != null) {
      throw new HttpError(409, `El pedido ya está en la ruta ${order.id_ruta_actual} y no se puede volver a encargar. Un envío sólo puede estar en una ruta.`)
    }
    const { rows: windows } = await client.query(
      `SELECT vt.hora_inicio, vt.hora_fin, r.fecha
       FROM ventanas_tiempo vt, rutas r
       WHERE vt.id_ventana=$1 AND r.id_ruta=$2`,
      [order.id_ventana_tiempo, routeId]
    )
    if (windows[0] && String(windows[0].hora_fin) < String(windows[0].hora_inicio)) {
      throw new HttpError(409, 'La ventana de entrega del pedido no es válida.')
    }
    const { rows: nextRows } = await client.query(
      'SELECT COALESCE(MAX(orden_visita),0)+1 AS next FROM ruta_pedidos WHERE id_ruta=$1',
      [routeId]
    )
    const nextPosition = Number(nextRows[0].next)
    const recommendation = await evaluateSuggestedOrder(client, routeId, orderId, { roads })
    await client.query(
      `INSERT INTO ruta_pedidos (id_ruta,id_pedido,orden_visita,estado_entrega)
       VALUES ($1,$2,$3,'PENDIENTE')`,
      [routeId, orderId, nextPosition]
    )
    await client.query(
      `UPDATE pedidos SET estado='ASIGNADO' WHERE id_pedido=$1 AND estado='PENDIENTE'`,
      [orderId]
    )
    await client.query(
      `UPDATE rutas SET estado='EN_CURSO' WHERE id_ruta=$1 AND estado='PLANIFICADA'`,
      [routeId]
    )
    return {
      id_ruta: routeId, id_pedido: orderId, orden_actual: nextPosition,
      recomendacion,
      mensaje: 'Pedido encargado al conductor. Revise el orden sugerido antes de aplicarlo.',
    }
  })
  return res.json(response)
}

async function recalculateOrder(pool, roads, routeId) {
  const { rows } = await pool.query('SELECT fecha FROM rutas WHERE id_ruta=$1', [routeId])
  const date = rows[0]?.fecha
  const [vehicle, driver, orders, closed, depot, traffic, incidents, obstacles, firstRoutes] = await Promise.all([
    D.vehicleForRoute(pool, routeId), D.driverForRoute(pool, routeId),
    D.ordersForRoute(pool, routeId), D.closedDeliveriesForRoute(pool, routeId),
    D.operationalDepot(pool), D.currentTraffic(pool), D.activeIncidents(pool),
    D.activeObstacles(pool), D.driversWithRoutesOnDate(pool, date),
  ])
  if (!vehicle || !driver) return { motivo: 'La ruta no tiene vehículo ni conductor asignados, así que no se puede recalcular su recorrido.' }
  const pending = orders.filter((order) => !closed.has(order.id_pedido))
  if (!pending.length) return { motivo: 'La ruta ya no tiene pedidos por entregar.' }
  const problem = new ProblemaVRPTW(pending, [vehicle], [driver], depot, date, {
    trafico: traffic, incidentes: incidents, obstaculos: obstacles,
    primera_ruta: firstRoutes, roads,
  })
  await problem.preparar_distancias()
  const [fixed, reason] = problem.fijar_secuencia(
    problem.vehiculos[0], problem.conductores[0], pending.map((order) => order.id_pedido)
  )
  if (reason) return { motivo: reason }
  return transaction(pool, (client) =>
    persistReoptimization(client, routeId, problem, fixed, date, closed)
  )
}

async function closeRoute(client, routeId) {
  await client.query(`UPDATE rutas SET estado='COMPLETADA' WHERE id_ruta=$1`, [routeId])
  await client.query(`UPDATE asignaciones SET estado='COMPLETADA' WHERE id_ruta=$1`, [routeId])
  await client.query(
    `UPDATE conductores SET estado='DISPONIBLE', horas_conduccion_acumuladas=0
     WHERE id_conductor IN (SELECT id_conductor FROM asignaciones WHERE id_ruta=$1)`,
    [routeId]
  )
}

export function createAsignacionesRouter(options) {
  const { pool, authenticate, requirePermission } = routeFactoryDependencies(options)
  const router = Router()
  const read = requirePermission('asignaciones', OPERATIONS.READ)
  const write = requirePermission('asignaciones', OPERATIONS.WRITE)

  router.get('', authenticate, read, endpoint(async (req, res) => {
    const driverId = await driverIdFor(pool, req.user)
    const { rows } = await pool.query(
      `SELECT a.id_asignacion, a.id_ruta, a.fecha_asignacion, a.hora_salida,
              a.hora_retorno, a.horas_conduccion, a.horas_descanso,
              a.descanso_requerido, a.estado, v.id_vehiculo, v.placa,
              co.id_conductor, co.nombre AS conductor_nombre,
              co.apellido AS conductor_apellido, r.fecha AS ruta_fecha,
              r.distancia_km, r.co2_kg
       FROM asignaciones a
       INNER JOIN vehiculos v ON v.id_vehiculo=a.id_vehiculo
       INNER JOIN conductores co ON co.id_conductor=a.id_conductor
       INNER JOIN rutas r ON r.id_ruta=a.id_ruta
       WHERE ($1::text IS NULL OR a.estado=$1)
         AND ($2::integer IS NULL OR a.id_conductor=$2)
       ORDER BY a.fecha_asignacion DESC`,
      [req.query.estado ?? null, driverId]
    )
    return res.json(rows.map((row) => numericRow(row, detailNumberFields)))
  }))

  router.post('', authenticate, write, endpoint(async (req, res) => {
    const body = bodyObject(req.body)
    const errors = []
    const routeId = integerField(body, 'id_ruta', { min: 1 }, errors)
    const vehicleId = integerField(body, 'id_vehiculo', { min: 1 }, errors)
    const driverId = integerField(body, 'id_conductor', { min: 1 }, errors)
    let departure = body.hora_salida ?? null
    if (departure != null && (typeof departure !== 'string' || Number.isNaN(Date.parse(departure)))) {
      errors.push({ loc: ['body', 'hora_salida'], msg: 'Input should be a valid datetime', type: 'datetime_parsing' })
    }
    validation(errors)
    const assignment = await transaction(pool, async (client) => {
      const { rows: routeRows } = await client.query('SELECT fecha FROM rutas WHERE id_ruta=$1', [routeId])
      const route = routeRows[0]
      if (!route) throw new HttpError(404, 'La ruta no existe')
      const { rows: vehicleRows } = await client.query(
        `SELECT id_vehiculo, placa FROM vehiculos WHERE id_vehiculo=$1 AND estado='ACTIVO'`,
        [vehicleId]
      )
      if (!vehicleRows[0]) throw new HttpError(400, 'El vehículo no existe o no está activo')
      const weekday = (() => {
        const day = new Date(`${dateText(route.fecha)}T00:00:00Z`).getUTCDay()
        return day || 7
      })()
      const digits = String(vehicleRows[0].placa).replace(/\D/g, '')
      if (digits && MTC_NO_CIRCULA[weekday]?.has(Number(digits.at(-1)))) {
        throw new HttpError(400, 'Vehiculo no elegible por restriccion vehicular MTC hoy (RN-003)')
      }
      const { rows: driverRows } = await client.query(
        `SELECT c.id_conductor FROM conductores c
         WHERE c.id_conductor=$1 AND EXISTS (
           SELECT 1 FROM licencias l WHERE l.id_conductor=c.id_conductor AND l.estado='VIGENTE'
         )`,
        [driverId]
      )
      if (!driverRows[0]) throw new HttpError(400, 'El conductor no existe o no tiene licencia vigente')
      const { rows: existsRows } = await client.query('SELECT id_asignacion FROM asignaciones WHERE id_ruta=$1', [routeId])
      if (existsRows[0]) throw new HttpError(400, 'La ruta ya tiene una asignación registrada')
      const { rows } = await client.query(
        `INSERT INTO asignaciones (id_ruta,id_vehiculo,id_conductor,hora_salida,estado)
         VALUES ($1,$2,$3,$4,'ASIGNADA') RETURNING id_asignacion`,
        [routeId, vehicleId, driverId, departure]
      )
      const { rows: result } = await client.query(
        'SELECT * FROM asignaciones WHERE id_asignacion=$1',
        [rows[0].id_asignacion]
      )
      return result[0]
    })
    return res.status(201).json(assignment)
  }))

  router.patch('/:id_asignacion/estado', authenticate, write, endpoint(async (req, res) => {
    const assignmentId = parseId(req.params.id_asignacion, 'id_asignacion')
    const state = enumBody(req.body, 'estado', ASSIGNMENT_STATES)
    const result = await transaction(pool, async (client) => {
      const { rows } = await client.query(
        `UPDATE asignaciones SET estado=$1,
           hora_retorno=CASE WHEN $1='COMPLETADA' THEN CURRENT_TIMESTAMP ELSE hora_retorno END
         WHERE id_asignacion=$2 RETURNING id_asignacion`,
        [state, assignmentId]
      )
      if (!rows[0]) throw new HttpError(404, 'La asignación no existe')
      if (state === 'COMPLETADA') {
        await client.query(
          `UPDATE conductores SET estado='DISPONIBLE'
           WHERE id_conductor=(SELECT id_conductor FROM asignaciones WHERE id_asignacion=$1)`,
          [assignmentId]
        )
      }
      const { rows: updated } = await client.query('SELECT * FROM asignaciones WHERE id_asignacion=$1', [assignmentId])
      return updated[0]
    })
    return res.json(result)
  }))
  return router
}

export function createObstaculosRutasRouter(options) {
  const { pool, authenticate, requirePermission, roads } = routeFactoryDependencies(options)
  const router = Router()
  const write = requirePermission('rutas', OPERATIONS.WRITE)
  router.post('/:id_obstaculo/optimizar-ruta', authenticate, write, endpoint(async (req, res) => {
    const obstacleId = parseId(req.params.id_obstaculo, 'id_obstaculo')
    const input = parseOptimizationBody(req.body, true)
    const { rows: obstacleRows } = await pool.query(
      `SELECT id_obstaculo,tipo,descripcion,latitud,longitud,nivel
       FROM obstaculos WHERE id_obstaculo=$1`,
      [obstacleId]
    )
    const obstacle = obstacleRows[0]
    if (!obstacle) throw new HttpError(404, 'El obstáculo no existe')
    const { rows: routes } = await pool.query(
      `SELECT r.id_ruta FROM rutas r
       INNER JOIN paradas_ruta pr ON pr.id_ruta=r.id_ruta
       WHERE r.estado IN ('PLANIFICADA','EN_CURSO','REOPTIMIZADA')
         AND pr.tipo_parada='ENTREGA'
         AND EXISTS (
           SELECT 1 FROM ruta_pedidos rp
           WHERE rp.id_ruta=r.id_ruta AND rp.estado_entrega='PENDIENTE'
         )
       ORDER BY abs(pr.latitud-$1)+abs(pr.longitud-$2),r.id_ruta
       LIMIT 1`,
      [Number(obstacle.latitud), Number(obstacle.longitud)]
    )
    if (!routes[0]) {
      throw new HttpError(409, 'No hay ninguna ruta activa con entregas pendientes cerca del obstáculo. El cono queda registrado y se tendrá en cuenta en la próxima optimización.')
    }
    const reqLike = {
      body: {
        ...input,
        motivo: input.motivo ?? `Obstáculo #${obstacleId} (${obstacle.tipo}) en el recorrido`,
      },
    }
    const response = await reoptimizeById(pool, roads, routes[0].id_ruta, reqLike)
    response.advertencias.push('El cono se mantiene en la calzada: seguirá apareciendo en los mapas hasta que alguien lo quite')
    return res.json(response)
  }))
  return router
}

async function reoptimizeById(pool, roads, routeId, { body }) {
  const start = process.hrtime.bigint()
  const { rows } = await pool.query('SELECT fecha,estado FROM rutas WHERE id_ruta=$1', [routeId])
  const routeRow = rows[0]
  if (!routeRow) throw new HttpError(404, 'La ruta no existe')
  if (['COMPLETADA', 'CANCELADA'].includes(routeRow.estado)) {
    throw new HttpError(400, `No se puede corregir el recorrido de una ruta ${routeRow.estado.toLowerCase()}: ya está cerrada y solo queda como registro.`)
  }
  const [vehicle, driver, orders, closed, depot, traffic, incidents, obstacles, firstRoutes] = await Promise.all([
    D.vehicleForRoute(pool, routeId), D.driverForRoute(pool, routeId),
    D.ordersForRoute(pool, routeId), D.closedDeliveriesForRoute(pool, routeId),
    D.operationalDepot(pool), D.currentTraffic(pool), D.activeIncidents(pool),
    D.activeObstacles(pool), D.driversWithRoutesOnDate(pool, routeRow.fecha),
  ])
  if (!vehicle || !driver) throw new HttpError(400, 'La ruta todavía no tiene vehículo y conductor asignados. La reoptimización conserva los que ya tiene, así que primero hay que asignarlos.')
  if (!orders.length) throw new HttpError(400, 'La ruta no tiene pedidos que reoptimizar')
  const previous = orders.map((order) => order.id_pedido)
  const pending = orders.filter((order) => !closed.has(order.id_pedido))
  if (!pending.length) throw new HttpError(409, 'Esta ruta ya no tiene pedidos por entregar: están todos entregados o fallidos. Una ruta cerrada no se vuelve a optimizar.')
  const warnings = []
  if (closed.size) warnings.push(`${closed.size} entrega(s) ya cerrada(s) se conservan como registro y no se tocan`)
  if (vehicle.estado !== 'ACTIVO') warnings.push(`El vehículo ${vehicle.placa} está ${vehicle.estado.toLowerCase()}. La reoptimización no cambia de vehículo, así que se reordena igualmente.`)
  if (!(driver.categorias_licencia ?? []).length) warnings.push(`${driver.nombre} ${driver.apellido} no tiene licencia vigente. La reoptimización no cambia de conductor.`)
  const problem = new ProblemaVRPTW(pending, [vehicle], [driver], depot, routeRow.fecha, {
    trafico: traffic, incidentes: incidents, obstaculos: obstacles,
    primera_ruta: firstRoutes, roads,
  })
  await problem.preparar_distancias()
  if (!problem._usar_calles_reales) warnings.push('No se pudo consultar el motor de rutas: el recorrido se calculó con una estimación por factor de rodeo')
  const [optimized, reason] = problem.reoptimizar_secuencia(
    problem.vehiculos[0], problem.conductores[0], pending.map((order) => order.id_pedido),
    { semilla: body.semilla ?? 42, iteraciones: body.iteraciones }
  )
  if (reason) throw new HttpError(409, reason)
  const summary = await transaction(pool, (client) => persistReoptimization(client, routeId, problem, optimized, routeRow.fecha, closed))
  if (body.motivo) warnings.push(`Motivo registrado: ${body.motivo}`)
  const newOrder = summary.orden_pedidos
  return {
    id_ruta: routeId, vehiculo: vehicle.placa, id_vehiculo: vehicle.id_vehiculo,
    conductor: `${driver.nombre} ${driver.apellido}`.trim(),
    id_conductor: driver.id_conductor, pedidos: newOrder, orden_anterior: previous,
    orden_nuevo: newOrder,
    orden_cambio: newOrder.length !== previous.length
      || newOrder.some((id, index) => String(id) !== String(previous[index])),
    distancia_km: summary.distancia_km, duracion_minutos: summary.duracion_minutos,
    costo_total: summary.costo_total, co2_kg: summary.co2_kg,
    cumplimiento_ventanas_pct: summary.cumplimiento_ventanas_pct,
    cambio: summary.cambio,
    segundos_resueltos: Number((Number(process.hrtime.bigint() - start) / 1e9).toFixed(3)),
    calles_reales: problem._usar_calles_reales, advertencias: warnings,
  }
}
