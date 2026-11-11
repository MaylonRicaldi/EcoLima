import { Router } from 'express'
import { OPERATIONS } from '../core/permissions.js'
import { conductorIdFor, isDriver } from '../core/accessScope.js'
import { defaultDepot } from '../services/calculations.js'

// app.js integration:
// const { localRouter, mapaRouter } = createMapaRouters({ pool, authenticate, requirePermission })
// app.use('/local', localRouter)
// app.use('/mapa', mapaRouter)

const DRIVER_COLORS = [
  '#059669',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#be123c',
  '#4d7c0f',
  '#9333ea',
  '#ea580c',
]

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function addError(errors, field, message, loc = 'body', type = 'value_error') {
  errors.push({ loc: [loc, field], msg: message, type })
}

function sendValidation(res, errors) {
  return res.status(422).json({ detail: errors })
}

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function numeric(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || value.trim() === '') return null
  const result = Number(value)
  return Number.isFinite(result) ? result : null
}

function validateLocation(body) {
  const data = body !== null && typeof body === 'object' && !Array.isArray(body) ? body : {}
  const errors = []
  if (typeof data.direccion !== 'string') addError(errors, 'direccion', 'Field required', 'body', 'missing')
  else if (data.direccion.trim().length < 5) addError(errors, 'direccion', 'Escriba la dirección del local')
  const latitude = numeric(data.latitud)
  if (latitude === null) addError(errors, 'latitud', 'Input should be a valid number', 'body', typeof data.latitud === 'undefined' ? 'missing' : 'float_parsing')
  else if (latitude < -13 || latitude > -11) addError(errors, 'latitud', 'La latitud está fuera del área de Lima')
  const longitude = numeric(data.longitud)
  if (longitude === null) addError(errors, 'longitud', 'Input should be a valid number', 'body', typeof data.longitud === 'undefined' ? 'missing' : 'float_parsing')
  else if (longitude < -78 || longitude > -76) addError(errors, 'longitud', 'La longitud está fuera del área de Lima')
  return { data: { ...data, latitud: latitude, longitud: longitude }, errors }
}

export function createMapaRouters({ pool, authenticate, requirePermission }) {
  const localRouter = Router()
  const mapaRouter = Router()

  localRouter.get('/', authenticate, requirePermission('rutas', OPERATIONS.READ), asyncRoute(async (_req, res) => {
    const { rows: [row] } = await pool.query(
      `SELECT direccion, latitud, longitud FROM ubicaciones
       WHERE tipo = 'LOCAL_OPERATIVA' LIMIT 1`
    )
    const location = row
      ? {
          latitud: Number(row.latitud),
          longitud: Number(row.longitud),
          direccion: row.direccion,
          origen: 'registrado',
        }
      : { ...defaultDepot(), origen: 'respaldo' }
    return res.json({ ...location, hora_retorno_local: '21:00' })
  }))

  localRouter.put('/', authenticate, requirePermission('rutas', OPERATIONS.WRITE), asyncRoute(async (req, res) => {
    const { data, errors } = validateLocation(req.body)
    if (errors.length) return sendValidation(res, errors)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query("DELETE FROM ubicaciones WHERE tipo = 'LOCAL_OPERATIVA'")
      const { rows: [row] } = await client.query(
        `INSERT INTO ubicaciones (direccion, referencia, latitud, longitud, geom, tipo)
         VALUES ($1, 'Local de la empresa. Punto de partida y de retorno.',
                 $2, $3, ST_SetSRID(ST_MakePoint($3, $2), 4326), 'LOCAL_OPERATIVA')
         RETURNING id_ubicacion, direccion, latitud, longitud`,
        [data.direccion.trim(), data.latitud, data.longitud]
      )
      await client.query('COMMIT')
      return res.json({
        ...row,
        latitud: Number(row.latitud),
        longitud: Number(row.longitud),
        mensaje: 'Local actualizado. Las rutas nuevas saldrán de aquí y los vehículos volverán aquí de noche.',
      })
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
  }))

  mapaRouter.get('/rutas', authenticate, requirePermission('rutas', OPERATIONS.READ), asyncRoute(async (req, res) => {
    const errors = []
    let date = req.query.fecha
    if (typeof date !== 'undefined' && !isDate(date)) {
      addError(errors, 'fecha', 'Input should be a valid date', 'query', 'date_from_datetime_parsing')
    }
    let driverId = null
    if (typeof req.query.id_conductor !== 'undefined') {
      driverId = numeric(req.query.id_conductor)
      if (!Number.isInteger(driverId)) addError(errors, 'id_conductor', 'Input should be a valid integer', 'query', 'int_parsing')
    }
    if (errors.length) return sendValidation(res, errors)

    if (isDriver(req.user)) {
      const ownDriverId = await conductorIdFor(pool, req.user)
      if (driverId !== null && Number(driverId) !== Number(ownDriverId)) {
        return res.status(403).json({ detail: 'Sólo puede consultar sus propias rutas' })
      }
      driverId = ownDriverId
    }

    const conditions = ["r.estado IN ('PLANIFICADA','EN_CURSO','REOPTIMIZADA')"]
    const values = []
    if (date) {
      values.push(date)
      conditions.push(`r.fecha = $${values.length}::date`)
    }
    if (driverId !== null) {
      values.push(driverId)
      conditions.push(`EXISTS (
        SELECT 1 FROM asignaciones a
        WHERE a.id_ruta = r.id_ruta AND a.id_conductor = $${values.length}
      )`)
    }
    const { rows } = await pool.query(
      `SELECT r.id_ruta, r.fecha, r.estado, r.distancia_km, r.duracion_minutos,
              a.id_conductor, a.id_vehiculo, co.nombre AS conductor_nombre,
              co.apellido AS conductor_apellido, v.placa
       FROM rutas r
       LEFT JOIN asignaciones a ON a.id_ruta = r.id_ruta
       LEFT JOIN conductores co ON co.id_conductor = a.id_conductor
       LEFT JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.fecha DESC, r.id_ruta`,
      values
    )
    const colors = new Map()
    const routes = []
    for (const row of rows) {
      let color
      let identifier
      if (row.id_conductor !== null) {
        if (!colors.has(row.id_conductor)) colors.set(row.id_conductor, DRIVER_COLORS[colors.size % DRIVER_COLORS.length])
        color = colors.get(row.id_conductor)
        identifier = `R-${row.id_conductor}`
      } else {
        color = '#64748b'
        identifier = `R-${row.id_ruta}`
      }
      const [stopsResult, ordersResult] = await Promise.all([
        pool.query(
          `SELECT orden, latitud, longitud, tipo_parada FROM paradas_ruta
           WHERE id_ruta = $1 ORDER BY orden`,
          [row.id_ruta]
        ),
        pool.query(
          `SELECT rp.orden_visita, rp.id_pedido, rp.estado_entrega,
                  p.latitud, p.longitud, p.direccion_entrega
           FROM ruta_pedidos rp JOIN pedidos p ON p.id_pedido = rp.id_pedido
           WHERE rp.id_ruta = $1 ORDER BY rp.orden_visita`,
          [row.id_ruta]
        ),
      ])
      routes.push({
        id_ruta: row.id_ruta,
        identificador: identifier,
        color,
        fecha: row.fecha,
        estado: row.estado,
        distancia_km: Number(row.distancia_km || 0),
        duracion_minutos: Number(row.duracion_minutos || 0),
        id_conductor: row.id_conductor,
        id_vehiculo: row.id_vehiculo,
        conductor: row.conductor_nombre
          ? `${row.conductor_nombre} ${row.conductor_apellido}`.trim()
          : null,
        placa: row.placa,
        paradas: stopsResult.rows,
        pedidos: ordersResult.rows,
      })
    }

    const { rows: [localRow] } = await pool.query(
      `SELECT direccion, latitud, longitud FROM ubicaciones
       WHERE tipo = 'LOCAL_OPERATIVA' LIMIT 1`
    )
    const local = localRow
      ? {
          latitud: Number(localRow.latitud),
          longitud: Number(localRow.longitud),
          direccion: localRow.direccion,
          origen: 'registrado',
        }
      : { ...defaultDepot(), origen: 'respaldo' }
    return res.json({
      rutas: routes,
      local,
      total: routes.length,
      solo_conductor: driverId !== null,
    })
  }))

  return { localRouter, mapaRouter }
}
