import { Router } from 'express'
import { OPERATIONS } from '../core/permissions.js'

const ESTADOS_CONDUCTOR = new Set([
  'DISPONIBLE',
  'EN_RUTA',
  'DESCANSO',
  'INACTIVO',
])
const ESTADOS_LICENCIA = new Set(['VIGENTE', 'VENCIDA', 'SUSPENDIDA'])
const LICENCIAS = {
  'A-I': { clase: 'A', nivel: 1, oficial: 'A-I' },
  'A-IIA': { clase: 'A', nivel: 2, oficial: 'A-IIa' },
  'A-IIB': { clase: 'A', nivel: 3, oficial: 'A-IIb' },
  'A-IIIA': { clase: 'A', nivel: 4, oficial: 'A-IIIa' },
  'A-IIIB': { clase: 'A', nivel: 5, oficial: 'A-IIIb' },
  'A-IIIC': { clase: 'A', nivel: 6, oficial: 'A-IIIc' },
  'B-I': { clase: 'B', nivel: 1, oficial: 'B-I' },
  'B-IIA': { clase: 'B', nivel: 2, oficial: 'B-IIa' },
  'B-IIB': { clase: 'B', nivel: 3, oficial: 'B-IIb' },
  'B-IIC': { clase: 'B', nivel: 4, oficial: 'B-IIc' },
}
const REQUISITOS_VEHICULO = {
  MOTO: { clase: 'B', nivel: 3, categoria: 'B-IIB' },
  CAMIONETA: { clase: 'A', nivel: 1, categoria: 'A-I' },
  FURGON: { clase: 'A', nivel: 1, categoria: 'A-I' },
}

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

function validationResponse(res, errors) {
  return res.status(422).json({ detail: errors })
}

function addError(errors, field, message, type = 'value_error', loc = 'body') {
  errors.push({ loc: [loc, field], msg: message, type })
}

function parseInteger(value, field, errors, { required = true, nullable = false, gt, ge } = {}) {
  if (value === undefined) {
    if (required) addError(errors, field, 'Field required', 'missing')
    return undefined
  }
  if (value === null && nullable) return null
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^[-+]?\d+$/.test(value.trim()) ? Number(value) : NaN
  if (!Number.isSafeInteger(parsed)) {
    addError(errors, field, 'Input should be a valid integer, unable to parse string as an integer', 'int_parsing')
    return undefined
  }
  if (gt !== undefined && parsed <= gt) {
    addError(errors, field, `Input should be greater than ${gt}`, 'greater_than')
    return undefined
  }
  if (ge !== undefined && parsed < ge) {
    addError(errors, field, `Input should be greater than or equal to ${ge}`, 'greater_than_equal')
    return undefined
  }
  return parsed
}

function parseString(value, field, errors, {
  required = true,
  nullable = false,
  minLength,
  maxLength,
} = {}) {
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

function parseDecimal(value, field, errors, { gt, ge, le } = {}) {
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
  if (ge !== undefined && parsed < ge) {
    addError(errors, field, `Input should be greater than or equal to ${ge}`, 'greater_than_equal')
    return undefined
  }
  if (le !== undefined && parsed > le) {
    addError(errors, field, `Input should be less than or equal to ${le}`, 'less_than_equal')
    return undefined
  }
  return String(value)
}

function parseTime(value, field, errors) {
  const text = parseString(value, field, errors)
  if (text === undefined) return undefined
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?$/.exec(text)
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] ?? 0) > 59) {
    addError(errors, field, 'Input should be in a valid time format, e.g. 13:45', 'time_parsing')
    return undefined
  }
  return text
}

function parseDate(value, field, errors) {
  const text = parseString(value, field, errors)
  if (text === undefined) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)
  const date = match ? new Date(`${text}T00:00:00.000Z`) : null
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    addError(errors, field, 'Input should be a valid date or datetime, input is too short', 'date_from_datetime_parsing')
    return undefined
  }
  return text
}

function parseState(value, field, errors, options) {
  const parsed = parseString(value, field, errors, options)
  if (parsed === undefined) return undefined
  const normalized = parsed.toUpperCase().trim()
  if (!ESTADOS_CONDUCTOR.has(normalized)) {
    addError(errors, field, 'Estado de conductor no válido')
    return undefined
  }
  return normalized
}

function validateConductor(body) {
  const errors = []
  const data = {}
  data.id_usuario = parseInteger(body.id_usuario, 'id_usuario', errors, {
    required: false,
    nullable: true,
    gt: 0,
  })
  data.dni = parseString(body.dni, 'dni', errors, { minLength: 8, maxLength: 8 })
  if (data.dni !== undefined) {
    data.dni = data.dni.trim()
    if (!/^\d{8}$/.test(data.dni)) addError(errors, 'dni', 'El DNI debe contener exactamente 8 dígitos')
  }
  data.nombre = parseString(body.nombre, 'nombre', errors, { minLength: 1, maxLength: 100 })
  if (data.nombre !== undefined) {
    data.nombre = data.nombre.trim()
    if (!data.nombre) addError(errors, 'nombre', 'El campo no puede estar vacío')
  }
  data.apellido = parseString(body.apellido, 'apellido', errors, { minLength: 1, maxLength: 100 })
  if (data.apellido !== undefined) {
    data.apellido = data.apellido.trim()
    if (!data.apellido) addError(errors, 'apellido', 'El campo no puede estar vacío')
  }
  data.telefono = parseString(body.telefono, 'telefono', errors, {
    required: false,
    nullable: true,
    maxLength: 30,
  })
  data.anios_experiencia = parseInteger(body.anios_experiencia, 'anios_experiencia', errors, { ge: 0 })
  data.hora_disponibilidad_inicio = parseTime(body.hora_disponibilidad_inicio, 'hora_disponibilidad_inicio', errors)
  data.hora_disponibilidad_fin = parseTime(body.hora_disponibilidad_fin, 'hora_disponibilidad_fin', errors)
  data.horas_max_conduccion = parseDecimal(body.horas_max_conduccion, 'horas_max_conduccion', errors, { gt: 0, le: 8 })
  data.horas_conduccion_acumuladas = parseDecimal(body.horas_conduccion_acumuladas, 'horas_conduccion_acumuladas', errors, { ge: 0 })
  data.estado = body.estado === undefined
    ? 'DISPONIBLE'
    : parseState(body.estado, 'estado', errors)
  return { data, errors }
}

function validateEstadoConductor(body) {
  const errors = []
  const estado = parseState(body.estado, 'estado', errors)
  return { data: { estado }, errors }
}

function validateLicencia(body) {
  const errors = []
  const data = {}
  data.id_conductor = parseInteger(body.id_conductor, 'id_conductor', errors, { gt: 0 })
  data.numero = parseString(body.numero, 'numero', errors, { minLength: 1, maxLength: 50 })
  if (data.numero !== undefined) {
    data.numero = data.numero.trim()
    if (!data.numero) addError(errors, 'numero', 'El número de licencia no puede estar vacío')
  }
  data.categoria = parseString(body.categoria, 'categoria', errors)
  if (data.categoria !== undefined) {
    data.categoria = data.categoria.toUpperCase().trim()
    if (!LICENCIAS[data.categoria]) addError(errors, 'categoria', 'Categoría de licencia no válida')
  }
  data.fecha_emision = parseDate(body.fecha_emision, 'fecha_emision', errors)
  data.fecha_vencimiento = parseDate(body.fecha_vencimiento, 'fecha_vencimiento', errors)
  if (data.fecha_emision && data.fecha_vencimiento && data.fecha_vencimiento <= data.fecha_emision) {
    addError(errors, 'fecha_vencimiento', 'La fecha de vencimiento debe ser posterior a la fecha de emisión')
  }
  data.estado = body.estado === undefined ? 'VIGENTE' : parseString(body.estado, 'estado', errors)
  if (body.estado !== undefined && data.estado !== undefined) {
    data.estado = data.estado.toUpperCase().trim()
    if (!ESTADOS_LICENCIA.has(data.estado)) addError(errors, 'estado', 'Estado de licencia no válido')
  }
  return { data, errors }
}

function validateEstadoLicencia(body) {
  const errors = []
  let estado = parseString(body.estado, 'estado', errors)
  if (estado !== undefined) {
    estado = estado.toUpperCase().trim()
    if (!ESTADOS_LICENCIA.has(estado)) addError(errors, 'estado', 'Estado de licencia no válido')
  }
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

function serializeConductor(row) {
  const result = { ...row }
  for (const field of ['horas_max_conduccion', 'horas_conduccion_acumuladas']) {
    if (result[field] != null) result[field] = Number(result[field])
  }
  return result
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

function highestLicense(categories) {
  let highest = null
  for (const category of categories) {
    if (LICENCIAS[category] && (!highest || LICENCIAS[category].nivel > LICENCIAS[highest].nivel)) {
      highest = category
    }
  }
  return highest
}

function isLicensed(categories, vehicleType) {
  const required = REQUISITOS_VEHICULO[String(vehicleType ?? '').trim().toUpperCase()]
  return Boolean(required && categories.some((category) => (
    LICENCIAS[category]
      && LICENCIAS[category].clase === required.clase
      && LICENCIAS[category].nivel >= required.nivel
  )))
}

function licenseReason(category, vehicleType) {
  const normalizedType = String(vehicleType ?? '').trim().toUpperCase()
  const current = LICENCIAS[category]
  if (!current) return 'No tiene licencia registrada'
  if (!vehicleType) return 'El vehículo no tiene tipo asignado'
  const required = REQUISITOS_VEHICULO[normalizedType]
  if (!required) return `No hay requisito de licencia definido para el tipo de vehículo ${normalizedType}`
  if (isLicensed([category], normalizedType)) return ''
  if (current.clase !== required.clase) {
    const forClass = current.clase === 'A' ? 'autos y camiones' : 'motos y mototaxis'
    return `Una licencia ${current.oficial} no sirve para un ${normalizedType}: los brevetes de esa clase habilitan para ${forClass} y un ${normalizedType} necesita ${LICENCIAS[required.categoria].oficial}`
  }
  if (current.nivel > required.nivel) {
    return `No habilita para manejar un ${normalizedType}: se necesita ${LICENCIAS[required.categoria].oficial} o una categoría menor`
  }
  return `Necesita licencia ${LICENCIAS[required.categoria].oficial} para manejar un ${normalizedType} y tiene ${current.oficial}`
}

export function createConductoresRouter({ pool, authenticate, requirePermission }) {
  const router = Router()
  const permit = (resource, operation) => [authenticate, requirePermission(resource, operation)]
  const conductorRead = permit('conductores', OPERATIONS.READ)
  const conductorWrite = permit('conductores', OPERATIONS.WRITE)
  const licenseRead = permit('licencias', OPERATIONS.READ)
  const licenseWrite = permit('licencias', OPERATIONS.WRITE)
  const conductorColumns = `
    c.id_conductor, c.id_usuario, c.dni, c.nombre, c.apellido, c.telefono,
    c.anios_experiencia, c.hora_disponibilidad_inicio, c.hora_disponibilidad_fin,
    c.horas_max_conduccion, c.horas_conduccion_acumuladas, c.estado,
    u.email AS usuario_email`

  const parsePagination = (query, { defaultLimit = 12, maxLimit = 50 } = {}) => {
    if (query.page === undefined && query.limit === undefined) return null
    const page = Math.max(parseInt(query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit)
    return { page, limit, offset: (page - 1) * limit }
  }

  router.get('', ...conductorRead, endpoint(async (req, res) => {
    const pagination = parsePagination(req.query)
    const baseSql = `FROM conductores c LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario`
    if (pagination) {
      const [rowsRes, countRes] = await Promise.all([
        pool.query(
          `SELECT ${conductorColumns} ${baseSql} ORDER BY c.id_conductor LIMIT $1 OFFSET $2`,
          [pagination.limit, pagination.offset]
        ),
        pool.query(`SELECT COUNT(*)::int AS total ${baseSql}`),
      ])
      const total = countRes.rows[0]?.total ?? 0
      return res.json({
        data: rowsRes.rows.map(serializeConductor),
        pagination: { total, page: pagination.page, limit: pagination.limit, totalPages: Math.ceil(total / pagination.limit) },
      })
    }
    const { rows } = await pool.query(
      `SELECT ${conductorColumns} ${baseSql} ORDER BY c.id_conductor`
    )
    return res.json(rows.map(serializeConductor))
  }))

  router.get('/:id_conductor', ...conductorRead, endpoint(async (req, res) => {
    const id = pathId(req.params.id_conductor, 'id_conductor')
    const { rows } = await pool.query(
      `SELECT ${conductorColumns}
       FROM conductores c LEFT JOIN usuarios u ON u.id_usuario = c.id_usuario
       WHERE c.id_conductor = $1`,
      [id]
    )
    if (!rows[0]) throw new HttpError(404, 'Conductor no encontrado')
    return res.json(serializeConductor(rows[0]))
  }))

  router.post('', ...conductorWrite, endpoint(async (req, res) => {
    const { data, errors } = validateConductor(req.body ?? {})
    if (errors.length) return validationResponse(res, errors)
    const id = await transaction(pool, async (client) => {
      if (data.id_usuario != null) {
        const user = await client.query('SELECT id_usuario FROM usuarios WHERE id_usuario = $1', [data.id_usuario])
        if (!user.rows[0]) throw new HttpError(404, 'El usuario indicado no existe')
        const linked = await client.query('SELECT id_conductor FROM conductores WHERE id_usuario = $1', [data.id_usuario])
        if (linked.rows[0]) throw new HttpError(409, 'El usuario ya está asociado a un conductor')
      }
      const dni = await client.query('SELECT id_conductor FROM conductores WHERE dni = $1', [data.dni])
      if (dni.rows[0]) throw new HttpError(409, 'El DNI ya está registrado')
      const result = await client.query(
        `INSERT INTO conductores (
          id_usuario, dni, nombre, apellido, telefono, anios_experiencia,
          hora_disponibilidad_inicio, hora_disponibilidad_fin,
          horas_max_conduccion, horas_conduccion_acumuladas, estado
        ) VALUES ($1,$2,$3,$4,$5,$6,$7::time,$8::time,$9,$10,$11)
        RETURNING id_conductor`,
        [
          data.id_usuario ?? null, data.dni, data.nombre, data.apellido, data.telefono,
          data.anios_experiencia, data.hora_disponibilidad_inicio, data.hora_disponibilidad_fin,
          data.horas_max_conduccion, data.horas_conduccion_acumuladas, data.estado,
        ]
      )
      return result.rows[0].id_conductor
    })
    return res.status(201).json({ message: 'Conductor registrado correctamente', id_conductor: id })
  }))

  router.put('/:id_conductor', ...conductorWrite, endpoint(async (req, res) => {
    const id = pathId(req.params.id_conductor, 'id_conductor')
    const { data, errors } = validateConductor(req.body ?? {})
    if (errors.length) return validationResponse(res, errors)
    await transaction(pool, async (client) => {
      const conductor = await client.query('SELECT id_conductor FROM conductores WHERE id_conductor = $1 FOR UPDATE', [id])
      if (!conductor.rows[0]) throw new HttpError(404, 'Conductor no encontrado')
      if (data.id_usuario != null) {
        const user = await client.query('SELECT id_usuario FROM usuarios WHERE id_usuario = $1', [data.id_usuario])
        if (!user.rows[0]) throw new HttpError(404, 'El usuario indicado no existe')
        const linked = await client.query(
          'SELECT id_conductor FROM conductores WHERE id_usuario = $1 AND id_conductor <> $2',
          [data.id_usuario, id]
        )
        if (linked.rows[0]) throw new HttpError(409, 'El usuario ya está asociado a otro conductor')
      }
      const dni = await client.query(
        'SELECT id_conductor FROM conductores WHERE dni = $1 AND id_conductor <> $2',
        [data.dni, id]
      )
      if (dni.rows[0]) throw new HttpError(409, 'El DNI ya está registrado en otro conductor')
      await client.query(
        `UPDATE conductores SET
          id_usuario=$1, dni=$2, nombre=$3, apellido=$4, telefono=$5,
          anios_experiencia=$6, hora_disponibilidad_inicio=$7::time,
          hora_disponibilidad_fin=$8::time, horas_max_conduccion=$9,
          horas_conduccion_acumuladas=$10, estado=$11
         WHERE id_conductor=$12`,
        [
          data.id_usuario ?? null, data.dni, data.nombre, data.apellido, data.telefono,
          data.anios_experiencia, data.hora_disponibilidad_inicio, data.hora_disponibilidad_fin,
          data.horas_max_conduccion, data.horas_conduccion_acumuladas, data.estado, id,
        ]
      )
    })
    return res.json({ message: 'Conductor actualizado correctamente' })
  }))

  router.patch('/:id_conductor/estado', ...conductorWrite, endpoint(async (req, res) => {
    const id = pathId(req.params.id_conductor, 'id_conductor')
    const { data, errors } = validateEstadoConductor(req.body ?? {})
    if (errors.length) return validationResponse(res, errors)
    const { rows } = await pool.query(
      `UPDATE conductores SET estado=$1 WHERE id_conductor=$2
       RETURNING id_conductor, estado`,
      [data.estado, id]
    )
    if (!rows[0]) throw new HttpError(404, 'Conductor no encontrado')
    return res.json({ message: 'Estado actualizado correctamente', ...rows[0] })
  }))

  router.get('/:id_conductor/vehiculos-compatibles', ...conductorRead, endpoint(async (req, res) => {
    const id = pathId(req.params.id_conductor, 'id_conductor')
    const { rows: conductors } = await pool.query(
      'SELECT id_conductor, nombre, apellido FROM conductores WHERE id_conductor=$1',
      [id]
    )
    const conductor = conductors[0]
    if (!conductor) throw new HttpError(404, 'Conductor no encontrado')
    const { rows: licenseRows } = await pool.query(
      `SELECT categoria FROM licencias
       WHERE id_conductor=$1 AND estado='VIGENTE' AND fecha_vencimiento >= CURRENT_DATE`,
      [id]
    )
    const categories = licenseRows.map((row) => row.categoria)
    const { rows: vehicles } = await pool.query(
      `SELECT v.id_vehiculo, v.placa, v.capacidad_kg, v.capacidad_m3, v.estado,
              t.nombre AS tipo_vehiculo
       FROM vehiculos v INNER JOIN tipos_vehiculo t ON t.id_tipo=v.id_tipo_vehiculo
       ORDER BY t.nombre, v.placa`
    )
    return res.json({
      id_conductor: id,
      conductor: `${conductor.nombre} ${conductor.apellido}`.trim(),
      categorias_licencia: categories,
      vehiculos: vehicles.map((vehicle) => {
        const habilitado = isLicensed(categories, vehicle.tipo_vehiculo)
        return {
          ...vehicle,
          capacidad_kg: vehicle.capacidad_kg == null ? null : Number(vehicle.capacidad_kg),
          capacidad_m3: vehicle.capacidad_m3 == null ? null : Number(vehicle.capacidad_m3),
          habilitado,
          motivo: habilitado ? '' : licenseReason(highestLicense(categories) ?? '', vehicle.tipo_vehiculo),
        }
      }),
    })
  }))

  router.get('/:id_conductor/licencias', ...licenseRead, endpoint(async (req, res) => {
    const id = pathId(req.params.id_conductor, 'id_conductor')
    const exists = await pool.query('SELECT id_conductor FROM conductores WHERE id_conductor=$1', [id])
    if (!exists.rows[0]) throw new HttpError(404, 'Conductor no encontrado')
    const { rows } = await pool.query(
      `SELECT id_licencia, id_conductor, numero, categoria,
              TO_CHAR(fecha_emision, 'YYYY-MM-DD') AS fecha_emision,
              TO_CHAR(fecha_vencimiento, 'YYYY-MM-DD') AS fecha_vencimiento,
              estado
       FROM licencias WHERE id_conductor=$1 ORDER BY id_licencia`,
      [id]
    )
    return res.json(rows)
  }))

  router.post('/:id_conductor/licencias', ...licenseWrite, endpoint(async (req, res) => {
    const id = pathId(req.params.id_conductor, 'id_conductor')
    const { data, errors } = validateLicencia(req.body ?? {})
    if (errors.length) return validationResponse(res, errors)
    if (data.id_conductor !== id) {
      throw new HttpError(400, 'El id_conductor de la URL no coincide con el enviado')
    }
    const licenseId = await transaction(pool, async (client) => {
      const conductor = await client.query('SELECT id_conductor FROM conductores WHERE id_conductor=$1', [id])
      if (!conductor.rows[0]) throw new HttpError(404, 'Conductor no encontrado')
      const result = await client.query(
        `INSERT INTO licencias (
          id_conductor, numero, categoria, fecha_emision, fecha_vencimiento, estado
        ) VALUES ($1,$2,$3,$4::date,$5::date,$6) RETURNING id_licencia`,
        [id, data.numero, data.categoria, data.fecha_emision, data.fecha_vencimiento, data.estado]
      )
      return result.rows[0].id_licencia
    })
    return res.status(201).json({ message: 'Licencia registrada correctamente', id_licencia: licenseId })
  }))

  router.put('/:id_conductor/licencias/:id_licencia', ...licenseWrite, endpoint(async (req, res) => {
    const id = pathId(req.params.id_conductor, 'id_conductor')
    const licenseId = pathId(req.params.id_licencia, 'id_licencia')
    const { data, errors } = validateLicencia(req.body ?? {})
    if (errors.length) return validationResponse(res, errors)
    if (data.id_conductor !== id) {
      throw new HttpError(400, 'El id_conductor de la URL no coincide con el enviado')
    }
    const updated = await transaction(pool, async (client) => {
      const result = await client.query(
        `UPDATE licencias SET numero=$1, categoria=$2, fecha_emision=$3::date,
          fecha_vencimiento=$4::date, estado=$5
         WHERE id_licencia=$6 AND id_conductor=$7 RETURNING id_licencia`,
        [data.numero, data.categoria, data.fecha_emision, data.fecha_vencimiento, data.estado, licenseId, id]
      )
      return result.rows[0]
    })
    if (!updated) throw new HttpError(404, 'Licencia no encontrada para este conductor')
    return res.json({ message: 'Licencia actualizada correctamente' })
  }))

  router.patch('/:id_conductor/licencias/:id_licencia/estado', ...licenseWrite, endpoint(async (req, res) => {
    const id = pathId(req.params.id_conductor, 'id_conductor')
    const licenseId = pathId(req.params.id_licencia, 'id_licencia')
    const { data, errors } = validateEstadoLicencia(req.body ?? {})
    if (errors.length) return validationResponse(res, errors)
    const { rows } = await pool.query(
      `UPDATE licencias SET estado=$1
       WHERE id_licencia=$2 AND id_conductor=$3
       RETURNING id_licencia, estado`,
      [data.estado, licenseId, id]
    )
    if (!rows[0]) throw new HttpError(404, 'Licencia no encontrada para este conductor')
    return res.json({ message: 'Estado de licencia actualizado correctamente', ...rows[0] })
  }))

  return router
}
