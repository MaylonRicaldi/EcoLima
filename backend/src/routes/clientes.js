import { Router } from 'express'
import { OPERATIONS } from '../core/permissions.js'

const CLIENT_COLUMNS = `c.id_cliente, c.nombre, c.documento, c.telefono, c.email,
  c.direccion, c.referencia, c.latitud, c.longitud, c.horario_apertura,
  c.horario_cierre, c.restricciones_acceso, c.estado`
const WINDOW_COLUMNS = `vt.id_ventana, vt.hora_inicio, vt.hora_fin,
  vt.tolerancia_minutos, vt.penalizacion_por_minuto, vt.es_ocasional,
  (SELECT COUNT(*) FROM pedidos p WHERE p.id_ventana_tiempo = vt.id_ventana) AS pedidos_asociados`
const CUSTOMER_STATES = new Set(['ACTIVO', 'INACTIVO'])

function validationResponse(res, errors) {
  return res.status(422).json({
    detail: errors.map(({ loc, message, type }) => ({
      loc,
      msg: message,
      type,
    })),
  })
}

function bodyErrors(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return [value, []]
  return [{}, [{ loc: ['body'], message: 'Input should be a valid dictionary or object to extract fields from', type: 'model_attributes_type' }]]
}

function add(errors, field, message, type = 'value_error') {
  errors.push({ loc: ['body', field], message, type })
}

function parseString(body, result, errors, field, {
  required = false,
  defaultValue,
  nullable = false,
  min,
  max,
  normalize,
} = {}) {
  if (!(field in body)) {
    if (defaultValue !== undefined) result[field] = defaultValue
    else if (required) add(errors, field, 'Field required', 'missing')
    else result[field] = null
    return
  }
  const value = body[field]
  if (value === null && nullable) {
    result[field] = null
    return
  }
  if (typeof value !== 'string') {
    add(errors, field, 'Input should be a valid string', 'string_type')
    return
  }
  if (min !== undefined && value.length < min) add(errors, field, `String should have at least ${min} characters`, 'string_too_short')
  if (max !== undefined && value.length > max) add(errors, field, `String should have at most ${max} characters`, 'string_too_long')
  result[field] = normalize ? normalize(value) : value
}

function parseFloatField(body, result, errors, field, { required = false, min, max } = {}) {
  if (!(field in body)) {
    if (required) add(errors, field, 'Field required', 'missing')
    return
  }
  const value = body[field]
  if (typeof value === 'boolean' || value === null || value === '') {
    add(errors, field, 'Input should be a valid number', 'float_parsing')
    return
  }
  const number = Number(value)
  if (!Number.isFinite(number)) {
    add(errors, field, 'Input should be a valid number', 'float_parsing')
    return
  }
  if (min !== undefined && number < min) add(errors, field, `Input should be greater than or equal to ${min}`, 'greater_than_equal')
  if (max !== undefined && number > max) add(errors, field, `Input should be less than or equal to ${max}`, 'less_than_equal')
  result[field] = number
}

function normalizeTime(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(value)
  if (!match) return { error: 'El horario debe tener formato HH:MM', type: 'value_error' }
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { error: 'El horario debe estar entre 00:00 y 23:59', type: 'value_error' }
  }
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseTime(body, result, errors, field, required = false) {
  if (!(field in body)) {
    if (required) add(errors, field, 'Field required', 'missing')
    return
  }
  if (body[field] === null) {
    result[field] = null
    return
  }
  if (typeof body[field] !== 'string') {
    add(errors, field, 'El horario debe tener formato HH:MM')
    return
  }
  const time = normalizeTime(body[field])
  if (time && typeof time === 'object') add(errors, field, time.error, time.type)
  else result[field] = time
}

function validateCustomer(value, mode) {
  const [body, errors] = bodyErrors(value)
  const result = {}
  parseString(body, result, errors, 'nombre', { required: true, min: 2, max: 150, normalize: (text) => text.trim() })
  parseString(body, result, errors, 'documento', { nullable: true, max: 20 })
  parseString(body, result, errors, 'telefono', { nullable: true, max: 20 })
  parseString(body, result, errors, 'email', { nullable: true, max: 150 })
  parseString(body, result, errors, 'direccion', { required: true, min: 5 })
  parseString(body, result, errors, 'referencia', { nullable: true })
  parseFloatField(body, result, errors, 'latitud', { required: true, min: -13, max: -11 })
  parseFloatField(body, result, errors, 'longitud', { required: true, min: -78, max: -76 })
  parseTime(body, result, errors, 'horario_apertura')
  parseTime(body, result, errors, 'horario_cierre')
  parseString(body, result, errors, 'restricciones_acceso', { nullable: true })
  if (mode === 'create') {
    if (!('estado' in body)) result.estado = 'ACTIVO'
    else if (typeof body.estado !== 'string') add(errors, 'estado', 'Input should be a valid string', 'string_type')
    else {
      result.estado = body.estado
      if (!CUSTOMER_STATES.has(result.estado)) add(errors, 'estado', 'El estado debe ser ACTIVO o INACTIVO')
    }
  }
  return { result, errors }
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1' || ['true', 'yes', 'on', 'y', 't'].includes(String(value).toLowerCase())) return true
  if (value === 0 || value === '0' || ['false', 'no', 'off', 'n', 'f'].includes(String(value).toLowerCase())) return false
  return null
}

function validateWindow(value) {
  const [body, errors] = bodyErrors(value)
  const result = {}
  parseTime(body, result, errors, 'hora_inicio', true)
  parseTime(body, result, errors, 'hora_fin', true)

  if (!('tolerancia_minutos' in body)) result.tolerancia_minutos = 0
  else {
    const tolerance = Number(body.tolerancia_minutos)
    if (!Number.isInteger(tolerance)) add(errors, 'tolerancia_minutos', 'Input should be a valid integer', 'int_parsing')
    else if (tolerance < 0) add(errors, 'tolerancia_minutos', 'Input should be greater than or equal to 0', 'greater_than_equal')
    else result.tolerancia_minutos = tolerance
  }

  if (!('penalizacion_por_minuto' in body)) result.penalizacion_por_minuto = 0.5
  else {
    const raw = body.penalizacion_por_minuto
    const penalty = Number(raw)
    if (typeof raw === 'boolean' || raw === '' || !Number.isFinite(penalty)) {
      add(errors, 'penalizacion_por_minuto', 'Input should be a valid decimal', 'decimal_parsing')
    } else {
      const precision = String(raw).split('.')[1]?.length ?? 0
      if (precision > 2) add(errors, 'penalizacion_por_minuto', 'Decimal input should have no more than 2 decimal places', 'decimal_max_places')
      if (penalty < 0) add(errors, 'penalizacion_por_minuto', 'Input should be greater than or equal to 0', 'greater_than_equal')
      if (String(Math.trunc(Math.abs(penalty))).length > 8) add(errors, 'penalizacion_por_minuto', 'Decimal input should have no more than 10 digits in total', 'decimal_max_digits')
      result.penalizacion_por_minuto = penalty
    }
  }

  if (!('es_ocasional' in body)) result.es_ocasional = false
  else {
    const occasional = parseBoolean(body.es_ocasional)
    if (occasional === null) add(errors, 'es_ocasional', 'Input should be a valid boolean', 'bool_parsing')
    else result.es_ocasional = occasional
  }

  if (typeof result.hora_inicio === 'string' && typeof result.hora_fin === 'string') {
    const minutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
    const start = minutes(result.hora_inicio)
    const end = minutes(result.hora_fin)
    if (end <= start) {
      errors.push({ loc: ['body'], message: 'La hora de fin debe ser posterior a la hora de inicio', type: 'value_error' })
    } else {
      if (start < 5 * 60) errors.push({ loc: ['body'], message: 'La ventana no puede empezar antes de las 05:00, que es el inicio del horario de atención', type: 'value_error' })
      if (end > 22 * 60) errors.push({ loc: ['body'], message: 'La ventana no puede terminar después de las 22:00, que es el cierre del horario de atención', type: 'value_error' })
    }
  }
  return { result, errors }
}

function parseId(value, name) {
  if (!/^[+-]?\d+$/.test(value)) return { error: true }
  const id = Number(value)
  if (!Number.isSafeInteger(id)) return { error: true }
  return { id, name }
}

function idValidation(name) {
  return (req, res, next) => {
    const parsed = parseId(req.params[name], name)
    if (parsed.error) {
      return res.status(422).json({
        detail: [{
          loc: ['path', name],
          msg: 'Input should be a valid integer, unable to parse string as an integer',
          type: 'int_parsing',
        }],
      })
    }
    req[name] = parsed.id
    return next()
  }
}

function run(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next)
}

function customerResponse(row) {
  if (!row) return row
  const result = { ...row }
  for (const field of ['latitud', 'longitud']) {
    if (result[field] !== null && result[field] !== undefined) result[field] = Number(result[field])
  }
  for (const field of ['horario_apertura', 'horario_cierre']) {
    if (typeof result[field] === 'string' && result[field].length >= 5) result[field] = result[field].slice(0, 5)
  }
  return result
}

function windowResponse(row) {
  if (!row) return row
  const result = { ...row }
  for (const field of ['hora_inicio', 'hora_fin']) {
    if (typeof result[field] === 'string' && result[field].length >= 5) result[field] = result[field].slice(0, 5)
  }
  if (result.penalizacion_por_minuto !== null && result.penalizacion_por_minuto !== undefined) {
    result.penalizacion_por_minuto = Number(result.penalizacion_por_minuto)
  }
  if (result.tolerancia_minutos !== undefined) result.tolerancia_minutos = Number(result.tolerancia_minutos)
  if (result.pedidos_asociados !== undefined) result.pedidos_asociados = Number(result.pedidos_asociados)
  return result
}

export function createClientesRouter({ pool, authenticate, requirePermission }) {
  const router = Router()
  const read = requirePermission('clientes', OPERATIONS.READ)
  const write = requirePermission('clientes', OPERATIONS.WRITE)

  const getCustomer = async (id) => {
    const { rows } = await pool.query(`SELECT ${CLIENT_COLUMNS} FROM clientes c WHERE c.id_cliente = $1`, [id])
    return rows[0] ? customerResponse(rows[0]) : null
  }
  const getWindow = async (id) => {
    const { rows } = await pool.query(`SELECT ${WINDOW_COLUMNS} FROM ventanas_tiempo vt WHERE vt.id_ventana = $1`, [id])
    return rows[0] ? windowResponse(rows[0]) : null
  }

  router.get('', authenticate, read, run(async (_req, res) => {
    const { rows } = await pool.query(`SELECT ${CLIENT_COLUMNS} FROM clientes c ORDER BY c.nombre`)
    return res.json(rows.map(customerResponse))
  }))

  router.get('/ventanas-tiempo', authenticate, read, run(async (_req, res) => {
    const { rows } = await pool.query(`SELECT ${WINDOW_COLUMNS} FROM ventanas_tiempo vt ORDER BY vt.hora_inicio, vt.hora_fin`)
    return res.json(rows.map(windowResponse))
  }))

  router.get('/ventanas-tiempo/disponibles', authenticate, read, run(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT id_ventana, hora_inicio, hora_fin, tolerancia_minutos, penalizacion_por_minuto
       FROM ventanas_tiempo WHERE es_ocasional = FALSE ORDER BY hora_inicio, hora_fin`
    )
    return res.json(rows.map(windowResponse))
  }))

  router.post('/ventanas-tiempo', authenticate, write, run(async (req, res) => {
    const { result: data, errors } = validateWindow(req.body)
    if (errors.length) return validationResponse(res, errors)
    const { rows } = await pool.query(
      `INSERT INTO ventanas_tiempo (
         hora_inicio, hora_fin, tolerancia_minutos, penalizacion_por_minuto, es_ocasional
       ) VALUES ($1::TIME, $2::TIME, $3, $4::DECIMAL(10,2), $5) RETURNING id_ventana`,
      [data.hora_inicio, data.hora_fin, data.tolerancia_minutos, data.penalizacion_por_minuto, data.es_ocasional]
    )
    return res.status(201).json(await getWindow(rows[0].id_ventana))
  }))

  router.put('/ventanas-tiempo/:id_ventana', authenticate, write, idValidation('id_ventana'), run(async (req, res) => {
    const { result: data, errors } = validateWindow(req.body)
    if (errors.length) return validationResponse(res, errors)
    const exists = await pool.query('SELECT 1 FROM ventanas_tiempo WHERE id_ventana = $1', [req.id_ventana])
    if (!exists.rows[0]) return res.status(404).json({ detail: 'La ventana de tiempo no existe' })
    await pool.query(
      `UPDATE ventanas_tiempo SET hora_inicio = $1::TIME, hora_fin = $2::TIME,
       tolerancia_minutos = $3, penalizacion_por_minuto = $4::DECIMAL(10,2)
       WHERE id_ventana = $5`,
      [data.hora_inicio, data.hora_fin, data.tolerancia_minutos, data.penalizacion_por_minuto, req.id_ventana]
    )
    return res.json(await getWindow(req.id_ventana))
  }))

  router.get('/ventanas-tiempo/:id_ventana', authenticate, read, idValidation('id_ventana'), run(async (req, res) => {
    const window = await getWindow(req.id_ventana)
    if (!window) return res.status(404).json({ detail: 'La ventana de tiempo no existe' })
    return res.json(window)
  }))

  router.delete('/ventanas-tiempo/:id_ventana', authenticate, write, idValidation('id_ventana'), run(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id_ventana, (SELECT COUNT(*) FROM pedidos p
       WHERE p.id_ventana_tiempo = ventanas_tiempo.id_ventana) AS pedidos_asociados
       FROM ventanas_tiempo WHERE id_ventana = $1`,
      [req.id_ventana]
    )
    const window = rows[0]
    if (!window) return res.status(404).json({ detail: 'La ventana de tiempo no existe' })
    const count = Number(window.pedidos_asociados)
    if (count > 0) {
      return res.status(409).json({
        detail: `La ventana está en uso por ${count} pedido(s) y no se puede borrar`,
      })
    }
    await pool.query('DELETE FROM ventanas_tiempo WHERE id_ventana = $1', [req.id_ventana])
    return res.json({ mensaje: 'Ventana de tiempo eliminada', id_ventana: req.id_ventana })
  }))

  router.get('/:id_cliente', authenticate, read, idValidation('id_cliente'), run(async (req, res) => {
    const customer = await getCustomer(req.id_cliente)
    if (!customer) return res.status(404).json({ detail: 'El cliente no existe' })
    return res.json(customer)
  }))

  router.post('', authenticate, write, run(async (req, res) => {
    const { result: data, errors } = validateCustomer(req.body, 'create')
    if (errors.length) return validationResponse(res, errors)
    if (data.email) {
      const duplicate = await pool.query('SELECT id_cliente FROM clientes WHERE LOWER(email) = LOWER($1)', [data.email])
      if (duplicate.rows[0]) return res.status(400).json({ detail: 'Ya existe un cliente registrado con ese correo' })
    }
    const { rows } = await pool.query(
      `INSERT INTO clientes (
         nombre, documento, telefono, email, direccion, referencia, latitud, longitud,
         horario_apertura, horario_cierre, restricciones_acceso, estado
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id_cliente`,
      [
        data.nombre, data.documento, data.telefono, data.email, data.direccion,
        data.referencia, data.latitud, data.longitud, data.horario_apertura,
        data.horario_cierre, data.restricciones_acceso, data.estado,
      ]
    )
    return res.status(201).json(await getCustomer(rows[0].id_cliente))
  }))

  router.put('/:id_cliente', authenticate, write, idValidation('id_cliente'), run(async (req, res) => {
    const { result: data, errors } = validateCustomer(req.body, 'update')
    if (errors.length) return validationResponse(res, errors)
    const existing = await pool.query('SELECT id_cliente FROM clientes WHERE id_cliente = $1', [req.id_cliente])
    if (!existing.rows[0]) return res.status(404).json({ detail: 'El cliente no existe' })
    if (data.email) {
      const duplicate = await pool.query(
        'SELECT id_cliente FROM clientes WHERE LOWER(email) = LOWER($1) AND id_cliente <> $2',
        [data.email, req.id_cliente]
      )
      if (duplicate.rows[0]) return res.status(400).json({ detail: 'Ya existe otro cliente registrado con ese correo' })
    }
    await pool.query(
      `UPDATE clientes SET nombre = $1, documento = $2, telefono = $3, email = $4,
       direccion = $5, referencia = $6, latitud = $7, longitud = $8,
       horario_apertura = $9, horario_cierre = $10, restricciones_acceso = $11
       WHERE id_cliente = $12`,
      [
        data.nombre, data.documento, data.telefono, data.email, data.direccion,
        data.referencia, data.latitud, data.longitud, data.horario_apertura,
        data.horario_cierre, data.restricciones_acceso, req.id_cliente,
      ]
    )
    return res.json(await getCustomer(req.id_cliente))
  }))

  router.patch('/:id_cliente/estado', authenticate, write, idValidation('id_cliente'), run(async (req, res) => {
    const [body, errors] = bodyErrors(req.body)
    const data = {}
    if (!('estado' in body)) add(errors, 'estado', 'Field required', 'missing')
    else if (typeof body.estado !== 'string') add(errors, 'estado', 'Input should be a valid string', 'string_type')
    else {
      data.estado = body.estado
      if (!CUSTOMER_STATES.has(data.estado)) add(errors, 'estado', 'El estado debe ser ACTIVO o INACTIVO')
    }
    if (errors.length) return validationResponse(res, errors)
    const { rows } = await pool.query(
      'UPDATE clientes SET estado = $1 WHERE id_cliente = $2 RETURNING id_cliente',
      [data.estado, req.id_cliente]
    )
    if (!rows[0]) return res.status(404).json({ detail: 'El cliente no existe' })
    return res.json(await getCustomer(rows[0].id_cliente))
  }))

  return router
}
