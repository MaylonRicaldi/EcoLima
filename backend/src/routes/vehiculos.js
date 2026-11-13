import { Router } from 'express'
import { OPERATIONS } from '../core/permissions.js'

const VEHICLE_COLUMNS = `id_vehiculo, id_tipo_vehiculo, placa, marca, modelo,
  anio_fabricacion, capacidad_kg, capacidad_m3, consumo_km_l, factor_co2_kg_km,
  tipo_combustible, costo_adquisicion, valor_actual, depreciacion_anual,
  costo_soat_anual, costo_seguro_anual, estado`
const STATES = new Set(['ACTIVO', 'MANTENIMIENTO', 'BAJA'])
const FUELS = new Set(['DIESEL', 'GNV', 'GASOLINA', 'ELECTRICO'])
const DECIMALS = [
  'capacidad_kg', 'capacidad_m3', 'consumo_km_l', 'factor_co2_kg_km',
  'costo_adquisicion', 'valor_actual', 'depreciacion_anual',
  'costo_soat_anual', 'costo_seguro_anual',
]

function validationResponse(res, errors) {
  return res.status(422).json({
    detail: errors.map(({ field, message, type }) => ({
      loc: ['body', field],
      msg: message,
      type,
    })),
  })
}

function validateBody(value, stateOnly = false) {
  const errors = []
  const body = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  if (body !== value) {
    errors.push({ field: 'body', message: 'Input should be a valid dictionary or object to extract fields from', type: 'model_attributes_type' })
  }
  const result = {}
  const required = (field) => {
    if (!(field in body)) errors.push({ field, message: 'Field required', type: 'missing' })
  }
  const numeric = (field, { optional = false, positive = false } = {}) => {
    if (!(field in body)) {
      if (!optional) required(field)
      else result[field] = null
      return
    }
    if (body[field] === null && optional) {
      result[field] = null
      return
    }
    if (typeof body[field] === 'boolean' || body[field] === '' || body[field] === null) {
      errors.push({ field, message: 'Input should be a valid decimal', type: 'decimal_parsing' })
      return
    }
    const number = Number(body[field])
    if (!Number.isFinite(number)) {
      errors.push({ field, message: 'Input should be a valid decimal', type: 'decimal_parsing' })
      return
    }
    if (positive && number <= 0) {
      errors.push({ field, message: 'Input should be greater than 0', type: 'greater_than' })
    } else if (optional && number < 0) {
      errors.push({ field, message: 'Input should be greater than or equal to 0', type: 'greater_than_equal' })
    }
    result[field] = number
  }

  if (stateOnly) {
    if (!('estado' in body)) required('estado')
    else if (typeof body.estado !== 'string') {
      errors.push({ field: 'estado', message: 'Input should be a valid string', type: 'string_type' })
    } else {
      result.estado = body.estado.toUpperCase().trim()
      if (!STATES.has(result.estado)) errors.push({ field: 'estado', message: 'Estado no válido', type: 'value_error' })
    }
    return { result, errors }
  }

  if (!('id_tipo_vehiculo' in body)) required('id_tipo_vehiculo')
  else {
    const idType = Number(body.id_tipo_vehiculo)
    if (!Number.isInteger(idType)) errors.push({ field: 'id_tipo_vehiculo', message: 'Input should be a valid integer', type: 'int_parsing' })
    else if (idType <= 0) errors.push({ field: 'id_tipo_vehiculo', message: 'Input should be greater than 0', type: 'greater_than' })
    else result.id_tipo_vehiculo = idType
  }

  if (!('placa' in body)) required('placa')
  else if (typeof body.placa !== 'string') {
    errors.push({ field: 'placa', message: 'Input should be a valid string', type: 'string_type' })
  } else {
    if (body.placa.length < 2) errors.push({ field: 'placa', message: 'String should have at least 2 characters', type: 'string_too_short' })
    if (body.placa.length > 15) errors.push({ field: 'placa', message: 'String should have at most 15 characters', type: 'string_too_long' })
    result.placa = body.placa.toUpperCase().trim()
    if (!/^[A-Z0-9]{2,3}-[0-9]{3,4}$/.test(result.placa)) {
      errors.push({ field: 'placa', message: 'La placa debe tener el formato ABC-123 o AB-1234', type: 'value_error' })
    }
  }

  for (const field of ['marca', 'modelo']) {
    if (!(field in body)) result[field] = null
    else if (body[field] === null) result[field] = null
    else if (typeof body[field] !== 'string') errors.push({ field, message: 'Input should be a valid string', type: 'string_type' })
    else {
      if (body[field].length > 50) errors.push({ field, message: 'String should have at most 50 characters', type: 'string_too_long' })
      result[field] = body[field]
    }
  }

  if (!('anio_fabricacion' in body)) result.anio_fabricacion = null
  else if (body.anio_fabricacion === null) result.anio_fabricacion = null
  else {
    const year = Number(body.anio_fabricacion)
    if (!Number.isInteger(year)) errors.push({ field: 'anio_fabricacion', message: 'Input should be a valid integer', type: 'int_parsing' })
    else if (year < 1990) errors.push({ field: 'anio_fabricacion', message: 'Input should be greater than or equal to 1990', type: 'greater_than_equal' })
    else if (year > 2026) errors.push({ field: 'anio_fabricacion', message: 'Input should be less than or equal to 2026', type: 'less_than_equal' })
    else result.anio_fabricacion = year
  }

  for (const field of DECIMALS) {
    numeric(field, {
      optional: field.startsWith('costo_') || field === 'valor_actual' || field === 'depreciacion_anual',
      positive: ['capacidad_kg', 'capacidad_m3', 'consumo_km_l', 'factor_co2_kg_km'].includes(field),
    })
  }

  if (!('tipo_combustible' in body)) required('tipo_combustible')
  else if (typeof body.tipo_combustible !== 'string') {
    errors.push({ field: 'tipo_combustible', message: 'Input should be a valid string', type: 'string_type' })
  } else {
    result.tipo_combustible = body.tipo_combustible.toUpperCase().trim()
    if (!FUELS.has(result.tipo_combustible)) errors.push({ field: 'tipo_combustible', message: 'Tipo de combustible no válido', type: 'value_error' })
  }

  if (!('estado' in body)) result.estado = 'ACTIVO'
  else if (typeof body.estado !== 'string') errors.push({ field: 'estado', message: 'Input should be a valid string', type: 'string_type' })
  else {
    result.estado = body.estado.toUpperCase().trim()
    if (!STATES.has(result.estado)) errors.push({ field: 'estado', message: 'Estado no válido', type: 'value_error' })
  }
  return { result, errors }
}

function parseId(value) {
  if (!/^[+-]?\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

function idValidation(name) {
  return (req, res, next) => {
    const id = parseId(req.params[name])
    if (id === null) {
      return res.status(422).json({
        detail: [{
          loc: ['path', name],
          msg: 'Input should be a valid integer, unable to parse string as an integer',
          type: 'int_parsing',
        }],
      })
    }
    req[name] = id
    return next()
  }
}

function responseRow(row) {
  if (!row) return row
  const result = { ...row }
  for (const field of DECIMALS) {
    if (result[field] !== null && result[field] !== undefined) result[field] = Number(result[field])
  }
  return result
}

function parsePagination(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  if (query.page === undefined && query.limit === undefined) return null
  const page = Math.max(parseInt(query.page, 10) || 1, 1)
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit)
  return { page, limit, offset: (page - 1) * limit }
}

export function createVehiculosRouter({ pool, authenticate, requirePermission }) {
  const router = Router()
  const read = requirePermission('vehiculos', OPERATIONS.READ)
  const write = requirePermission('vehiculos', OPERATIONS.WRITE)

  router.get('', authenticate, read, async (req, res, next) => {
    try {
      const pagination = parsePagination(req.query)
      if (pagination) {
        const [rowsRes, countRes] = await Promise.all([
          pool.query(
            `SELECT ${VEHICLE_COLUMNS} FROM vehiculos ORDER BY id_vehiculo LIMIT $1 OFFSET $2`,
            [pagination.limit, pagination.offset]
          ),
          pool.query('SELECT COUNT(*)::int AS total FROM vehiculos'),
        ])
        const total = countRes.rows[0]?.total ?? 0
        return res.json({
          data: rowsRes.rows.map(responseRow),
          pagination: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) },
        })
      }
      const { rows } = await pool.query(`SELECT ${VEHICLE_COLUMNS} FROM vehiculos ORDER BY id_vehiculo`)
      return res.json(rows.map(responseRow))
    } catch (error) {
      return next(error)
    }
  })

  router.get('/:id_vehiculo', authenticate, read, idValidation('id_vehiculo'), async (req, res, next) => {
    try {
      const { rows } = await pool.query(`SELECT ${VEHICLE_COLUMNS} FROM vehiculos WHERE id_vehiculo = $1`, [req.id_vehiculo])
      if (!rows[0]) return res.status(404).json({ detail: 'Vehículo no encontrado' })
      return res.json(responseRow(rows[0]))
    } catch (error) {
      return next(error)
    }
  })

  router.post('', authenticate, write, async (req, res, next) => {
    const { result: data, errors } = validateBody(req.body)
    if (errors.length) return validationResponse(res, errors)
    try {
      const type = await pool.query('SELECT id_tipo FROM tipos_vehiculo WHERE id_tipo = $1', [data.id_tipo_vehiculo])
      if (type.rows[0] === undefined) return res.status(400).json({ detail: 'El tipo de vehículo no existe' })

      const plate = await pool.query('SELECT id_vehiculo FROM vehiculos WHERE placa = $1', [data.placa])
      if (plate.rows[0]) return res.status(409).json({ detail: 'La placa ya está registrada' })

      const result = await pool.query(
        `INSERT INTO vehiculos (
           id_tipo_vehiculo, placa, marca, modelo, anio_fabricacion, capacidad_kg,
           capacidad_m3, consumo_km_l, factor_co2_kg_km, tipo_combustible,
           costo_adquisicion, valor_actual, depreciacion_anual, costo_soat_anual,
           costo_seguro_anual, estado
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         RETURNING id_vehiculo`,
        [
          data.id_tipo_vehiculo, data.placa, data.marca, data.modelo,
          data.anio_fabricacion, data.capacidad_kg, data.capacidad_m3,
          data.consumo_km_l, data.factor_co2_kg_km, data.tipo_combustible,
          data.costo_adquisicion, data.valor_actual, data.depreciacion_anual,
          data.costo_soat_anual, data.costo_seguro_anual, data.estado,
        ]
      )
      const { rows } = await pool.query(`SELECT ${VEHICLE_COLUMNS} FROM vehiculos WHERE id_vehiculo = $1`, [result.rows[0].id_vehiculo])
      return res.status(201).json(responseRow(rows[0]))
    } catch (error) {
      return next(error)
    }
  })

  router.put('/:id_vehiculo', authenticate, write, idValidation('id_vehiculo'), async (req, res, next) => {
    const { result: data, errors } = validateBody(req.body)
    if (errors.length) return validationResponse(res, errors)
    try {
      const existing = await pool.query('SELECT id_vehiculo FROM vehiculos WHERE id_vehiculo = $1', [req.id_vehiculo])
      if (!existing.rows[0]) return res.status(404).json({ detail: 'Vehículo no encontrado' })

      const type = await pool.query('SELECT id_tipo FROM tipos_vehiculo WHERE id_tipo = $1', [data.id_tipo_vehiculo])
      if (type.rows[0] === undefined) return res.status(400).json({ detail: 'El tipo de vehículo no existe' })

      const plate = await pool.query(
        'SELECT id_vehiculo FROM vehiculos WHERE placa = $1 AND id_vehiculo <> $2',
        [data.placa, req.id_vehiculo]
      )
      if (plate.rows[0]) return res.status(409).json({ detail: 'La placa ya está registrada en otro vehículo' })

      await pool.query(
        `UPDATE vehiculos SET
           id_tipo_vehiculo = $1, placa = $2, marca = $3, modelo = $4,
           anio_fabricacion = $5, capacidad_kg = $6, capacidad_m3 = $7,
           consumo_km_l = $8, factor_co2_kg_km = $9, tipo_combustible = $10,
           costo_adquisicion = $11, valor_actual = $12, depreciacion_anual = $13,
           costo_soat_anual = $14, costo_seguro_anual = $15, estado = $16
         WHERE id_vehiculo = $17`,
        [
          data.id_tipo_vehiculo, data.placa, data.marca, data.modelo,
          data.anio_fabricacion, data.capacidad_kg, data.capacidad_m3,
          data.consumo_km_l, data.factor_co2_kg_km, data.tipo_combustible,
          data.costo_adquisicion, data.valor_actual, data.depreciacion_anual,
          data.costo_soat_anual, data.costo_seguro_anual, data.estado, req.id_vehiculo,
        ]
      )
      const { rows } = await pool.query(`SELECT ${VEHICLE_COLUMNS} FROM vehiculos WHERE id_vehiculo = $1`, [req.id_vehiculo])
      return res.json(responseRow(rows[0]))
    } catch (error) {
      return next(error)
    }
  })

  router.patch('/:id_vehiculo/estado', authenticate, write, idValidation('id_vehiculo'), async (req, res, next) => {
    const { result: data, errors } = validateBody(req.body, true)
    if (errors.length) return validationResponse(res, errors)
    try {
      const existing = await pool.query('SELECT id_vehiculo FROM vehiculos WHERE id_vehiculo = $1', [req.id_vehiculo])
      if (!existing.rows[0]) return res.status(404).json({ detail: 'Vehículo no encontrado' })
      await pool.query('UPDATE vehiculos SET estado = $1 WHERE id_vehiculo = $2', [data.estado, req.id_vehiculo])
      const { rows } = await pool.query(`SELECT ${VEHICLE_COLUMNS} FROM vehiculos WHERE id_vehiculo = $1`, [req.id_vehiculo])
      return res.json(responseRow(rows[0]))
    } catch (error) {
      return next(error)
    }
  })

  return router
}
