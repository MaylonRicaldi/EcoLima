import { Router } from 'express'
import { OPERATIONS } from '../core/permissions.js'
import {
  customerIdFor,
  isCustomer,
  isDriver,
  orderIdsForDriver,
} from '../core/accessScope.js'

const ESTADOS_PEDIDO = new Set([
  'PENDIENTE',
  'ASIGNADO',
  'EN_RUTA',
  'ENTREGADO',
  'CANCELADO',
  'FALLIDO',
])
const PRIORIDADES_PEDIDO = new Set(['EXPRESS', 'ESTANDAR', 'ECONOMICO'])
const TIPOS_PRODUCTO = new Set(['PERECEDERO', 'NO_PERECEDERO', 'QUIMICO'])

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
      if (error instanceof HttpError) {
        return res.status(error.status).json({ detail: error.detail })
      }
      return next(error)
    }
  }
}

function parsePagination(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  const hasPage = query.page !== undefined
  const hasLimit = query.limit !== undefined
  if (!hasPage && !hasLimit) return null
  const page = Math.max(parseInt(query.page, 10) || 1, 1)
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit)
  return { page, limit, offset: (page - 1) * limit }
}

function addError(errors, field, message, type = 'value_error', loc = 'body') {
  errors.push({ loc: [loc, field], msg: message, type })
}

function parseInteger(value, field, errors) {
  if (value === undefined) {
    addError(errors, field, 'Field required', 'missing')
    return undefined
  }
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^[-+]?\d+$/.test(value.trim()) ? Number(value) : NaN
  if (!Number.isSafeInteger(parsed)) {
    addError(errors, field, 'Input should be a valid integer, unable to parse string as an integer', 'int_parsing')
    return undefined
  }
  if (parsed <= 0) {
    addError(errors, field, 'Input should be greater than 0', 'greater_than')
    return undefined
  }
  return parsed
}

function parseString(value, field, errors, { required = true, nullable = false, minLength, maxLength } = {}) {
  if (value === undefined) {
    if (required) addError(errors, field, 'Field required', 'missing')
    return undefined
  }
  if (value === null && nullable) return null
  if (typeof value !== 'string') {
    addError(errors, field, 'Input should be a valid string', 'string_type')
    return undefined
  }
  if (minLength !== undefined && value.length < minLength) {
    addError(errors, field, `String should have at least ${minLength} character${minLength === 1 ? '' : 's'}`, 'string_too_short')
    return undefined
  }
  if (maxLength !== undefined && value.length > maxLength) {
    addError(errors, field, `String should have at most ${maxLength} character${maxLength === 1 ? '' : 's'}`, 'string_too_long')
    return undefined
  }
  return value
}

function parseDecimal(value, field, errors, { gt } = {}) {
  if (value === undefined) {
    addError(errors, field, 'Field required', 'missing')
    return undefined
  }
  if (typeof value !== 'number' && typeof value !== 'string') {
    addError(errors, field, 'Input should be a valid decimal', 'decimal_type')
    return undefined
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    addError(errors, field, 'Input should be a valid decimal', 'decimal_parsing')
    return undefined
  }
  if (gt !== undefined && parsed <= gt) {
    addError(errors, field, `Input should be greater than ${gt}`, 'greater_than')
    return undefined
  }
  return String(value)
}

function normalizeChoice(value, field, errors, validValues, defaultValue) {
  if (value === undefined && defaultValue !== undefined) return defaultValue
  const parsed = parseString(value, field, errors)
  if (parsed === undefined) return undefined
  const normalized = parsed.toUpperCase().trim()
  if (!validValues.has(normalized)) {
    const message = field === 'prioridad'
      ? 'Prioridad de pedido no válida'
      : field === 'tipo_producto'
        ? 'Tipo de producto no válido'
        : 'Estado de pedido no válido'
    addError(errors, field, message)
    return undefined
  }
  return normalized
}

function validatePedido(body) {
  const errors = []
  const data = {}
  data.id_cliente = parseInteger(body.id_cliente, 'id_cliente', errors)
  data.id_ventana_tiempo = parseInteger(body.id_ventana_tiempo, 'id_ventana_tiempo', errors)
  data.direccion_entrega = parseString(body.direccion_entrega, 'direccion_entrega', errors, { minLength: 1, maxLength: 500 })
  if (data.direccion_entrega !== undefined) {
    data.direccion_entrega = data.direccion_entrega.trim()
    if (!data.direccion_entrega) addError(errors, 'direccion_entrega', 'La dirección de entrega no puede estar vacía')
  }
  data.referencia = parseString(body.referencia, 'referencia', errors, { required: false, nullable: true, maxLength: 500 })
  if (typeof data.referencia === 'string') {
    data.referencia = data.referencia.trim() || null
  }
  data.latitud = parseDecimal(body.latitud, 'latitud', errors)
  if (data.latitud !== undefined && (Number(data.latitud) < -13 || Number(data.latitud) > -11)) {
    addError(errors, 'latitud', 'La latitud debe estar entre -13 y -11')
  }
  data.longitud = parseDecimal(body.longitud, 'longitud', errors)
  if (data.longitud !== undefined && (Number(data.longitud) < -78 || Number(data.longitud) > -76)) {
    addError(errors, 'longitud', 'La longitud debe estar entre -78 y -76')
  }
  data.peso_kg = parseDecimal(body.peso_kg, 'peso_kg', errors, { gt: 0 })
  data.volumen_m3 = parseDecimal(body.volumen_m3, 'volumen_m3', errors, { gt: 0 })
  data.prioridad = normalizeChoice(body.prioridad, 'prioridad', errors, PRIORIDADES_PEDIDO, 'ESTANDAR')
  data.tipo_producto = normalizeChoice(body.tipo_producto, 'tipo_producto', errors, TIPOS_PRODUCTO)
  data.estado = normalizeChoice(body.estado, 'estado', errors, ESTADOS_PEDIDO, 'PENDIENTE')
  return { data, errors }
}

function validateEstadoPedido(body) {
  const errors = []
  const estado = normalizeChoice(body.estado, 'estado', errors, ESTADOS_PEDIDO)
  return { data: { estado }, errors }
}

function pathId(value, field) {
  const id = Number(value)
  if (!/^[-+]?\d+$/.test(value) || !Number.isSafeInteger(id)) {
    throw new HttpError(422, [{
      loc: ['path', field],
      msg: 'Input should be a valid integer, unable to parse string as an integer',
      type: 'int_parsing',
    }])
  }
  return id
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

const PEDIDO_COLUMNS = `p.id_pedido, p.id_cliente, p.id_ventana_tiempo,
  p.direccion_entrega, p.referencia, p.latitud, p.longitud, p.peso_kg,
  p.volumen_m3, p.prioridad, p.tipo_producto, p.estado, p.fecha_registro`
const PEDIDO_LIST_COLUMNS = `p.id_pedido, p.id_cliente, p.id_ventana_tiempo,
  p.direccion_entrega, p.prioridad, p.tipo_producto, p.estado, p.fecha_registro,
  p.peso_kg, p.volumen_m3`
const PEDIDO_RETURNING = `id_pedido, id_cliente, id_ventana_tiempo,
  direccion_entrega, referencia, latitud, longitud, peso_kg, volumen_m3,
  prioridad, tipo_producto, estado, fecha_registro`

function serializePedido(row) {
  const result = { ...row }
  for (const field of ['latitud', 'longitud', 'peso_kg', 'volumen_m3']) {
    if (result[field] != null) result[field] = Number(result[field])
  }
  return result
}

async function buildPedidosScope(pool, user) {
  const values = []
  const conditions = []
  if (isCustomer(user)) {
    const customerId = await customerIdFor(pool, user)
    if (customerId == null) return { empty: true, values, conditions }
    values.push(customerId)
    conditions.push(`p.id_cliente = $${values.length}`)
  } else if (isDriver(user)) {
    const orderIds = [...(await orderIdsForDriver(pool, user) ?? [])].sort((a, b) => a - b)
    if (orderIds.length === 0) return { empty: true, values, conditions }
    values.push(orderIds)
    conditions.push(`p.id_pedido = ANY($${values.length}::integer[])`)
  }
  return { empty: false, values, conditions }
}

async function selectPedidos(pool, user, id, pagination = null) {
  const scope = await buildPedidosScope(pool, user)
  if (scope.empty) return pagination ? { data: [], pagination: { total: 0, page: pagination.page, limit: pagination.limit, totalPages: 0 } } : []
  const values = [...scope.values]
  const conditions = [...scope.conditions]
  if (id !== undefined) {
    values.push(id)
    conditions.push(`p.id_pedido = $${values.length}`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  if (pagination) {
    const listValues = [...values, pagination.limit, pagination.offset]
    const limitIdx = values.length + 1
    const offsetIdx = values.length + 2
    const [rowsRes, countRes] = await Promise.all([
      pool.query(
        `SELECT ${PEDIDO_LIST_COLUMNS} FROM pedidos p ${where} ORDER BY p.id_pedido DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        listValues
      ),
      pool.query(`SELECT COUNT(*)::int AS total FROM pedidos p ${where}`, values),
    ])
    const total = countRes.rows[0]?.total ?? 0
    return {
      data: rowsRes.rows.map(serializePedido),
      pagination: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
      },
    }
  }

  const columns = id !== undefined ? PEDIDO_COLUMNS : PEDIDO_LIST_COLUMNS
  const order = id !== undefined ? 'ORDER BY p.id_pedido' : 'ORDER BY p.id_pedido DESC'
  const { rows } = await pool.query(
    `SELECT ${columns} FROM pedidos p ${where} ${order}`,
    values
  )
  return rows.map(serializePedido)
}

async function routeForPedido(client, idPedido) {
  const { rows } = await client.query(
    `SELECT rp.id_ruta, rp.estado_entrega, r.estado AS estado_ruta
     FROM ruta_pedidos rp
     INNER JOIN rutas r ON r.id_ruta = rp.id_ruta
     WHERE rp.id_pedido = $1 AND r.estado <> 'CANCELADA'
     ORDER BY rp.id_ruta DESC LIMIT 1 FOR UPDATE OF rp, r`,
    [idPedido]
  )
  return rows[0] ?? null
}

async function reviewEstadoContraRuta(client, idPedido, estado) {
  const route = await routeForPedido(client, idPedido)
  if (!route) return null
  if (route.estado_entrega === 'ENTREGADO' || route.estado_entrega === 'FALLIDO') {
    if (estado !== route.estado_entrega) {
      throw new HttpError(
        409,
        `El pedido ya está ${route.estado_entrega.toLowerCase()} en la ruta ${route.id_ruta} y no se puede cambiar a ${estado.toLowerCase()}. Una entrega cerrada queda como registro.`
      )
    }
    return route
  }
  if (route.estado_ruta !== 'COMPLETADA' && !['ENTREGADO', 'FALLIDO'].includes(estado)) {
    throw new HttpError(
      409,
      `El pedido ya está asignado a la ruta ${route.id_ruta}. No se puede pasar a ${estado.toLowerCase()} desde aquí: la ruta lo sigue repartiendo y los dos módulos dejarían de coincidir. Cámbielo en el módulo Rutas.`
    )
  }
  return route
}

async function closeRoute(client, idRoute) {
  await client.query('UPDATE rutas SET estado = $1 WHERE id_ruta = $2', ['COMPLETADA', idRoute])
  await client.query('UPDATE asignaciones SET estado = $1 WHERE id_ruta = $2', ['COMPLETADA', idRoute])
  await client.query(
    `UPDATE conductores SET estado='DISPONIBLE', horas_conduccion_acumuladas=0
     WHERE id_conductor IN (SELECT id_conductor FROM asignaciones WHERE id_ruta=$1)`,
    [idRoute]
  )
}

async function propagateEstadoToRoute(client, idPedido, route, estado) {
  await client.query(
    `UPDATE ruta_pedidos
     SET estado_entrega=$1,
         hora_llegada_real=CASE
           WHEN $1 IN ('ENTREGADO','FALLIDO') THEN COALESCE(hora_llegada_real, CURRENT_TIMESTAMP)
           ELSE NULL
         END
     WHERE id_ruta=$2 AND id_pedido=$3`,
    [estado, route.id_ruta, idPedido]
  )
  const { rows: closedRows } = await client.query(
    `SELECT COUNT(*) AS count FROM ruta_pedidos
     WHERE id_ruta=$1 AND estado_entrega IN ('ENTREGADO','FALLIDO')`,
    [route.id_ruta]
  )
  const { rows: totalRows } = await client.query(
    'SELECT COUNT(*) AS count FROM ruta_pedidos WHERE id_ruta=$1',
    [route.id_ruta]
  )
  const closed = Number(closedRows[0].count)
  const total = Number(totalRows[0].count)
  if (total && closed >= total) {
    await closeRoute(client, route.id_ruta)
  } else {
    await client.query(
      `UPDATE rutas SET estado='EN_CURSO'
       WHERE id_ruta=$1 AND estado IN ('PLANIFICADA','REOPTIMIZADA')`,
      [route.id_ruta]
    )
  }
}

export function createPedidosRouter({ pool, authenticate, requirePermission }) {
  const router = Router()
  const read = [authenticate, requirePermission('pedidos', OPERATIONS.READ)]
  const write = [authenticate, requirePermission('pedidos', OPERATIONS.WRITE)]

  router.get('', ...read, endpoint(async (req, res) => {
    const pagination = parsePagination(req.query)
    if (pagination) {
      return res.json(await selectPedidos(pool, req.user, undefined, pagination))
    }
    return res.json(await selectPedidos(pool, req.user))
  }))

  router.get('/:id_pedido', ...read, endpoint(async (req, res) => {
    const id = pathId(req.params.id_pedido, 'id_pedido')
    const rows = await selectPedidos(pool, req.user, id)
    const list = Array.isArray(rows) ? rows : []
    if (!list[0]) throw new HttpError(404, 'El pedido no existe')
    return res.json(serializePedido(list[0]))
  }))

  router.post('', ...write, endpoint(async (req, res) => {
    const { data, errors } = validatePedido(req.body ?? {})
    if (errors.length) return res.status(422).json({ detail: errors })
    const order = await transaction(pool, async (client) => {
      const customer = await client.query(
        `SELECT id_cliente FROM clientes WHERE id_cliente=$1 AND estado='ACTIVO'`,
        [data.id_cliente]
      )
      if (!customer.rows[0]) throw new HttpError(400, 'El cliente no existe o está inactivo')
      const window = await client.query(
        'SELECT id_ventana FROM ventanas_tiempo WHERE id_ventana=$1',
        [data.id_ventana_tiempo]
      )
      if (!window.rows[0]) throw new HttpError(400, 'La ventana de tiempo no existe')
      const { rows } = await client.query(
        `INSERT INTO pedidos (
          id_cliente, id_ventana_tiempo, direccion_entrega, referencia,
          latitud, longitud, ubicacion, peso_kg, volumen_m3, prioridad,
          tipo_producto, estado
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          ST_SetSRID(ST_MakePoint($6,$5),4326),
          $7,$8,$9,$10,$11
        )
        RETURNING ${PEDIDO_RETURNING}`,
        [
          data.id_cliente, data.id_ventana_tiempo, data.direccion_entrega, data.referencia,
          data.latitud, data.longitud, data.peso_kg, data.volumen_m3,
          data.prioridad, data.tipo_producto, data.estado,
        ]
      )
      return rows[0]
    })
    return res.status(201).json(serializePedido(order))
  }))

  router.put('/:id_pedido', ...write, endpoint(async (req, res) => {
    const id = pathId(req.params.id_pedido, 'id_pedido')
    const { data, errors } = validatePedido(req.body ?? {})
    if (errors.length) return res.status(422).json({ detail: errors })
    const order = await transaction(pool, async (client) => {
      const existing = await client.query('SELECT id_pedido FROM pedidos WHERE id_pedido=$1 FOR UPDATE', [id])
      if (!existing.rows[0]) throw new HttpError(404, 'El pedido no existe')
      const customer = await client.query(
        `SELECT id_cliente FROM clientes WHERE id_cliente=$1 AND estado='ACTIVO'`,
        [data.id_cliente]
      )
      if (!customer.rows[0]) throw new HttpError(400, 'El cliente no existe o está inactivo')
      const window = await client.query(
        'SELECT id_ventana FROM ventanas_tiempo WHERE id_ventana=$1',
        [data.id_ventana_tiempo]
      )
      if (!window.rows[0]) throw new HttpError(400, 'La ventana de tiempo no existe')
      const route = await reviewEstadoContraRuta(client, id, data.estado)
      const { rows } = await client.query(
        `UPDATE pedidos SET
          id_cliente=$1, id_ventana_tiempo=$2, direccion_entrega=$3,
          referencia=$4, latitud=$5, longitud=$6,
          ubicacion=ST_SetSRID(ST_MakePoint($6,$5),4326),
          peso_kg=$7, volumen_m3=$8, prioridad=$9, tipo_producto=$10, estado=$11
         WHERE id_pedido=$12
         RETURNING ${PEDIDO_RETURNING}`,
        [
          data.id_cliente, data.id_ventana_tiempo, data.direccion_entrega,
          data.referencia, data.latitud, data.longitud, data.peso_kg, data.volumen_m3,
          data.prioridad, data.tipo_producto, data.estado, id,
        ]
      )
      if (
        route
        && route.estado_ruta !== 'COMPLETADA'
        && ['ENTREGADO', 'FALLIDO'].includes(data.estado)
        && route.estado_entrega !== data.estado
      ) {
        await propagateEstadoToRoute(client, id, route, data.estado)
      }
      return rows[0]
    })
    return res.json(serializePedido(order))
  }))

  router.patch('/:id_pedido/estado', ...write, endpoint(async (req, res) => {
    const id = pathId(req.params.id_pedido, 'id_pedido')
    const { data, errors } = validateEstadoPedido(req.body ?? {})
    if (errors.length) return res.status(422).json({ detail: errors })
    const order = await transaction(pool, async (client) => {
      const route = await reviewEstadoContraRuta(client, id, data.estado)
      const { rows } = await client.query(
        `UPDATE pedidos SET estado=$1 WHERE id_pedido=$2
         RETURNING ${PEDIDO_RETURNING}`,
        [data.estado, id]
      )
      if (!rows[0]) throw new HttpError(404, 'El pedido no existe')
      if (
        route
        && route.estado_ruta !== 'COMPLETADA'
        && route.estado_entrega !== data.estado
      ) {
        await propagateEstadoToRoute(client, id, route, data.estado)
      }
      return rows[0]
    })
    return res.json(serializePedido(order))
  }))

  return router
}
