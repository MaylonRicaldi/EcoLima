import { Router } from 'express'
import { OPERATIONS } from '../core/permissions.js'
import { haversineKm } from '../services/calculations.js'
import { evaluateSaturation, minutesBetween, minutesWithinWindow } from '../services/saturation.js'
import { PARAMS } from '../core/parameters.js'

// app.js integration (middleware comes from createAuthMiddleware):
// const { traficoRouter, incidentesRouter, obstaculosRouter, operacionRouter, evaluacionRouter } =
//   createOperacionRouters({ pool, authenticate, requirePermission })
// app.use('/trafico', traficoRouter)
// app.use('/incidentes', incidentesRouter)
// app.use('/obstaculos', obstaculosRouter)
// app.use('/operacion', operacionRouter)
// app.use('/rutas', evaluacionRouter)

const ACTIVE_ROUTE_STATES = "('PLANIFICADA','EN_CURSO','REOPTIMIZADA')"

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function withPermission(router, method, path, authenticate, requirePermission, resource, operation, handler) {
  router[method](path, authenticate, requirePermission(resource, operation), asyncRoute(handler))
}

function addError(errors, field, message, loc = 'body', type = 'value_error') {
  errors.push({ loc: [loc, field], msg: message, type })
}

function sendValidation(res, errors) {
  return res.status(422).json({ detail: errors })
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function numeric(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isTime(value) {
  if (typeof value !== 'string') return false
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d+)?)?$/.exec(value)
  return Boolean(match)
}

function timeMinutes(value) {
  const [hours, minutes] = String(value).split(':').map(Number)
  return hours * 60 + minutes
}

function round(value, digits = 2) {
  const scale = 10 ** digits
  return Math.round((Number(value) + Number.EPSILON) * scale) / scale
}

function projectObstacle(row) {
  return {
    id_obstaculo: row.id_obstaculo,
    tipo: row.tipo,
    descripcion: row.descripcion,
    latitud: Number(row.latitud),
    longitud: Number(row.longitud),
    nivel: row.nivel,
    id_usuario: row.id_usuario,
    fecha_registro: row.fecha_registro,
    resuelto: row.resuelto,
    id_ruta: row.id_ruta ?? null,
    distancia_conductores_afectados_km: row.distancia_conductores_afectados_km ?? null,
  }
}

function projectTraffic(row) {
  return {
    id_trafico: row.id_trafico,
    fecha_hora: row.fecha_hora,
    segmento: row.segmento,
    latitud: Number(row.latitud),
    longitud: Number(row.longitud),
    nivel_congestion: row.nivel_congestion,
    velocidad_kmh: row.velocidad_kmh === null ? null : Number(row.velocidad_kmh),
    fuente: row.fuente,
  }
}

function projectIncident(row) {
  return {
    id_incidente: row.id_incidente,
    tipo: row.tipo,
    descripcion: row.descripcion,
    latitud: Number(row.latitud),
    longitud: Number(row.longitud),
    fecha_hora: row.fecha_hora,
    nivel: row.nivel,
    fuente: row.fuente,
    estado: row.estado,
  }
}

function validateObstacle(body) {
  const data = isObject(body) ? body : {}
  const errors = []
  const types = ['CONO', 'OBRA', 'ARBOL', 'BACHE', 'BLOQUEO_CALLE', 'OTRO']
  const levels = ['ALTO', 'MEDIO', 'BAJO']
  if (typeof data.tipo !== 'string') addError(errors, 'tipo', 'Field required', 'body', 'missing')
  else if (!types.includes(data.tipo)) addError(errors, 'tipo', `El tipo de obstáculo debe ser uno de: ${types.join(', ')}`)
  if (typeof data.descripcion !== 'string') addError(errors, 'descripcion', 'Field required', 'body', 'missing')
  else if (data.descripcion.trim().length < 5) addError(errors, 'descripcion', 'Describa el obstáculo para que el conductor reconozca el punto')
  if (numeric(data.latitud) === null) addError(errors, 'latitud', 'Input should be a valid number', 'body', typeof data.latitud === 'undefined' ? 'missing' : 'float_parsing')
  else if (numeric(data.latitud) < -13 || numeric(data.latitud) > -11) addError(errors, 'latitud', 'La latitud está fuera del área de Lima')
  if (numeric(data.longitud) === null) addError(errors, 'longitud', 'Input should be a valid number', 'body', typeof data.longitud === 'undefined' ? 'missing' : 'float_parsing')
  else if (numeric(data.longitud) < -78 || numeric(data.longitud) > -76) addError(errors, 'longitud', 'La longitud está fuera del área de Lima')
  if (typeof data.nivel !== 'undefined' && !levels.includes(data.nivel)) addError(errors, 'nivel', 'El nivel debe ser ALTO, MEDIO o BAJO')
  if (typeof data.id_ruta !== 'undefined' && (!Number.isInteger(numeric(data.id_ruta)) || numeric(data.id_ruta) <= 0)) addError(errors, 'id_ruta', 'Input should be greater than 0')
  return { data, errors }
}

function validateTraffic(body) {
  const data = isObject(body) ? body : {}
  const errors = []
  if (typeof data.segmento !== 'string') addError(errors, 'segmento', 'Field required', 'body', 'missing')
  else if (data.segmento.length < 3) addError(errors, 'segmento', 'String should have at least 3 characters')
  else if (data.segmento.length > 150) addError(errors, 'segmento', 'String should have at most 150 characters')
  const lat = numeric(data.latitud)
  if (lat === null) addError(errors, 'latitud', 'Input should be a valid number', 'body', typeof data.latitud === 'undefined' ? 'missing' : 'float_parsing')
  else if (lat < -13 || lat > -11) addError(errors, 'latitud', 'Input should be greater than or equal to -13 and less than or equal to -11')
  const lon = numeric(data.longitud)
  if (lon === null) addError(errors, 'longitud', 'Input should be a valid number', 'body', typeof data.longitud === 'undefined' ? 'missing' : 'float_parsing')
  else if (lon < -78 || lon > -76) addError(errors, 'longitud', 'Input should be greater than or equal to -78 and less than or equal to -76')
  if (!['VERDE', 'AMARILLO', 'ROJO'].includes(data.nivel_congestion)) {
    addError(errors, 'nivel_congestion', typeof data.nivel_congestion === 'undefined' ? 'Field required' : 'El nivel de congestión debe ser VERDE, AMARILLO o ROJO', 'body', typeof data.nivel_congestion === 'undefined' ? 'missing' : 'value_error')
  }
  if (typeof data.velocidad_kmh !== 'undefined' && data.velocidad_kmh !== null) {
    const speed = numeric(data.velocidad_kmh)
    if (speed === null || speed < 0) addError(errors, 'velocidad_kmh', 'Input should be greater than or equal to 0')
  }
  const source = data.fuente ?? 'MANUAL'
  if (!['WAZE', 'SIMAT', 'MANUAL'].includes(source)) addError(errors, 'fuente', 'La fuente debe ser WAZE, SIMAT o MANUAL')
  return { data: { ...data, latitud: lat, longitud: lon, fuente: source }, errors }
}

function validateIncident(body) {
  const data = isObject(body) ? body : {}
  const errors = []
  if (!['ACCIDENTE', 'AVERIA', 'ROBO', 'BLOQUEO', 'CLIMA'].includes(data.tipo)) {
    addError(errors, 'tipo', typeof data.tipo === 'undefined' ? 'Field required' : 'El tipo de incidente no es válido', 'body', typeof data.tipo === 'undefined' ? 'missing' : 'value_error')
  }
  if (typeof data.descripcion !== 'string') addError(errors, 'descripcion', 'Field required', 'body', 'missing')
  else if (data.descripcion.length < 5) addError(errors, 'descripcion', 'String should have at least 5 characters')
  const lat = numeric(data.latitud)
  if (lat === null) addError(errors, 'latitud', 'Input should be a valid number', 'body', typeof data.latitud === 'undefined' ? 'missing' : 'float_parsing')
  else if (lat < -13 || lat > -11) addError(errors, 'latitud', 'Input should be greater than or equal to -13 and less than or equal to -11')
  const lon = numeric(data.longitud)
  if (lon === null) addError(errors, 'longitud', 'Input should be a valid number', 'body', typeof data.longitud === 'undefined' ? 'missing' : 'float_parsing')
  else if (lon < -78 || lon > -76) addError(errors, 'longitud', 'Input should be greater than or equal to -78 and less than or equal to -76')
  if (!['ALTO', 'MEDIO', 'BAJO'].includes(data.nivel)) {
    addError(errors, 'nivel', typeof data.nivel === 'undefined' ? 'Field required' : 'El nivel debe ser ALTO, MEDIO o BAJO', 'body', typeof data.nivel === 'undefined' ? 'missing' : 'value_error')
  }
  if (data.fuente !== undefined && data.fuente !== null && typeof data.fuente !== 'string') addError(errors, 'fuente', 'Input should be a valid string', 'body', 'string_type')
  return { data: { ...data, latitud: lat, longitud: lon }, errors }
}

function validateDateTimeQuery(query) {
  const errors = []
  for (const field of ['fecha', 'hora_inicio', 'hora_fin']) {
    const value = query[field]
    if (typeof value === 'undefined') addError(errors, field, 'Field required', 'query', 'missing')
    else if (field === 'fecha' ? !isDate(value) : !isTime(value)) {
      addError(
        errors,
        field,
        field === 'fecha' ? 'Input should be a valid date' : 'Input should be in a valid time format',
        'query',
        field === 'fecha' ? 'date_from_datetime_parsing' : 'time_parsing'
      )
    }
  }
  const peso = typeof query.peso_kg === 'undefined' ? 0 : numeric(query.peso_kg)
  const volumen = typeof query.volumen_m3 === 'undefined' ? 0 : numeric(query.volumen_m3)
  for (const [field, value] of [['peso_kg', peso], ['volumen_m3', volumen]]) {
    if (value === null || value < 0) addError(errors, field, 'Input should be greater than or equal to 0', 'query', 'greater_than_equal')
  }
  return { errors, peso, volumen }
}

function asNumber(value) {
  return Number(value || 0)
}

async function findSuggestedWindow(pool, date, start, end, weight, volume) {
  const { rows: drivers } = await pool.query(
    `SELECT c.hora_disponibilidad_inicio, c.hora_disponibilidad_fin,
            c.horas_max_conduccion, c.horas_conduccion_acumuladas
     FROM conductores c
     WHERE c.estado IN ('DISPONIBLE','DESCANSO')
       AND NOT EXISTS (
         SELECT 1 FROM asignaciones a JOIN rutas r ON r.id_ruta = a.id_ruta
         WHERE a.id_conductor = c.id_conductor AND r.estado IN ${ACTIVE_ROUTE_STATES}
       )
       AND EXISTS (
         SELECT 1 FROM licencias l WHERE l.id_conductor = c.id_conductor
           AND l.estado = 'VIGENTE' AND l.fecha_vencimiento >= $1::date
       )`,
    [date]
  )
  const { rows: [capacity] } = await pool.query(
    `SELECT COALESCE(sum(v.capacidad_kg), 0) AS kg,
            COALESCE(sum(v.capacidad_m3), 0) AS m3
     FROM vehiculos v
     WHERE v.estado = 'ACTIVO'
       AND NOT EXISTS (
         SELECT 1 FROM asignaciones a JOIN rutas r ON r.id_ruta = a.id_ruta
         WHERE a.id_vehiculo = v.id_vehiculo AND r.estado IN ${ACTIVE_ROUTE_STATES}
       )`
  )
  if ((weight && asNumber(capacity.kg) < weight) || (volume && asNumber(capacity.m3) < volume)) return null

  const { rows: candidates } = await pool.query(
    `SELECT id_ventana, hora_inicio, hora_fin, tolerancia_minutos,
            penalizacion_por_minuto, es_ocasional
     FROM ventanas_tiempo WHERE es_ocasional = FALSE AND hora_fin > hora_inicio`
  )
  let best = null
  let bestScore = null
  for (const window of candidates) {
    if (String(window.hora_inicio).slice(0, 5) === String(start).slice(0, 5)
      && String(window.hora_fin).slice(0, 5) === String(end).slice(0, 5)) continue
    const duration = minutesBetween(window.hora_inicio, window.hora_fin)
    if (duration <= 0) continue
    let freeMinutes = 0
    for (const driver of drivers) {
      const overlap = minutesWithinWindow(
        driver.hora_disponibilidad_inicio, driver.hora_disponibilidad_fin,
        window.hora_inicio, window.hora_fin
      )
      const remaining = Number(driver.horas_max_conduccion) - Number(driver.horas_conduccion_acumuladas)
      if (overlap > 0 && remaining > 0) freeMinutes += Math.min(duration, overlap)
    }
    if (freeMinutes < PARAMS.minimumFreeWindowMinutes) continue
    const distance = Math.abs(timeMinutes(window.hora_inicio) - timeMinutes(start))
    const score = distance - (freeMinutes / 60) * 30
    if (bestScore === null || score < bestScore) {
      best = window
      bestScore = score
    }
  }
  if (!best) return null
  return {
    id_ventana: best.id_ventana,
    hora_inicio: best.hora_inicio,
    hora_fin: best.hora_fin,
    tolerancia_minutos: best.tolerancia_minutos,
    penalizacion_por_minuto: Number(best.penalizacion_por_minuto),
    motivo: 'Es la ventana del catálogo más cercana a la suya que todavía tiene conductores con jornada libre',
  }
}

export function createOperacionRouters({ pool, authenticate, requirePermission }) {
  const traficoRouter = Router()
  const incidentesRouter = Router()
  const obstaculosRouter = Router()
  const operacionRouter = Router()
  const evaluacionRouter = Router()

  withPermission(obstaculosRouter, 'get', '/', authenticate, requirePermission, 'incidentes', OPERATIONS.READ, async (req, res) => {
    const rawIncludeResolved = req.query.incluir_resueltos
    const parsedIncludeResolved = typeof rawIncludeResolved === 'undefined'
      ? false
      : ['true', '1', 'yes', 'y', 'on', 't'].includes(String(rawIncludeResolved).toLowerCase())
        ? true
        : ['false', '0', 'no', 'n', 'off', 'f'].includes(String(rawIncludeResolved).toLowerCase())
          ? false
          : null
    if (parsedIncludeResolved === null) return sendValidation(res, [{ loc: ['query', 'incluir_resueltos'], msg: 'Input should be a valid boolean', type: 'bool_parsing' }])
    const { rows } = await pool.query(
      `SELECT o.id_obstaculo, o.tipo, o.descripcion, o.latitud, o.longitud,
              o.nivel, o.id_usuario, o.fecha_registro, o.resuelto
       FROM obstaculos o WHERE ($1::boolean OR o.resuelto = FALSE)
       ORDER BY o.resuelto, o.fecha_registro DESC`,
      [parsedIncludeResolved]
    )
    return res.json(rows.map(projectObstacle))
  })

  withPermission(obstaculosRouter, 'post', '/', authenticate, requirePermission, 'incidentes', OPERATIONS.WRITE, async (req, res) => {
    const { data, errors } = validateObstacle(req.body)
    if (errors.length) return sendValidation(res, errors)
    const { rows: [row] } = await pool.query(
      `INSERT INTO obstaculos (
         tipo, descripcion, latitud, longitud, ubicacion, nivel, id_usuario
       )
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($4, $3), 4326), $5, $6)
       RETURNING id_obstaculo, tipo, descripcion, latitud, longitud,
                 nivel, id_usuario, fecha_registro, resuelto`,
      [data.tipo, data.descripcion.trim(), numeric(data.latitud), numeric(data.longitud), data.nivel ?? 'MEDIO', req.user.id_usuario]
    )
    return res.status(201).json(projectObstacle(row))
  })

  withPermission(obstaculosRouter, 'delete', '/:id_obstaculo', authenticate, requirePermission, 'incidentes', OPERATIONS.WRITE, async (req, res) => {
    const id = numeric(req.params.id_obstaculo)
    if (!Number.isInteger(id)) return sendValidation(res, [{ loc: ['path', 'id_obstaculo'], msg: 'Input should be a valid integer', type: 'int_parsing' }])
    const result = await pool.query('DELETE FROM obstaculos WHERE id_obstaculo = $1', [id])
    if (!result.rowCount) return res.status(404).json({ detail: 'El obstáculo no existe' })
    return res.json({ id_obstaculo: id, quitado: true })
  })

  withPermission(operacionRouter, 'get', '/saturacion', authenticate, requirePermission, 'trafico', OPERATIONS.READ, async (req, res) => {
    const { errors, peso, volumen } = validateDateTimeQuery(req.query)
    if (errors.length) return sendValidation(res, errors)
    if (timeMinutes(req.query.hora_fin) <= timeMinutes(req.query.hora_inicio)) {
      return res.status(400).json({ detail: 'La hora de fin debe ser posterior a la de inicio' })
    }
    return res.json(await evaluateSaturation(pool, {
      date: req.query.fecha,
      startTime: req.query.hora_inicio,
      endTime: req.query.hora_fin,
      weightKg: peso,
      volumeM3: volumen,
    }))
  })

  withPermission(operacionRouter, 'post', '/ventana-sugerida', authenticate, requirePermission, 'trafico', OPERATIONS.READ, async (req, res) => {
    const data = isObject(req.body) ? req.body : {}
    const errors = []
    for (const field of ['fecha', 'hora_inicio', 'hora_fin']) {
      if (typeof data[field] === 'undefined') addError(errors, field, 'Field required', 'body', 'missing')
      else if (field === 'fecha' ? !isDate(data[field]) : !isTime(data[field])) addError(errors, field, field === 'fecha' ? 'Input should be a valid date' : 'Input should be in a valid time format')
    }
    const weight = typeof data.peso_kg === 'undefined' ? 0 : numeric(data.peso_kg)
    const volume = typeof data.volumen_m3 === 'undefined' ? 0 : numeric(data.volumen_m3)
    if (weight === null || weight < 0) addError(errors, 'peso_kg', 'Input should be greater than or equal to 0')
    if (volume === null || volume < 0) addError(errors, 'volumen_m3', 'Input should be greater than or equal to 0')
    if (errors.length) return sendValidation(res, errors)
    const suggested = await findSuggestedWindow(pool, data.fecha, data.hora_inicio, data.hora_fin, weight, volume)
    return res.json({ ventana_sugerida: suggested, hay_alternativa: suggested !== null })
  })

  withPermission(traficoRouter, 'get', '/', authenticate, requirePermission, 'trafico', OPERATIONS.READ, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT t.id_trafico, t.fecha_hora, t.segmento, t.latitud, t.longitud,
              t.nivel_congestion, t.velocidad_kmh, t.fuente
       FROM trafico t
       WHERE ($1::text IS NULL OR t.nivel_congestion = $1)
       ORDER BY t.fecha_hora DESC, t.id_trafico DESC`,
      [req.query.nivel ?? null]
    )
    return res.json(rows.map(projectTraffic))
  })

  withPermission(traficoRouter, 'post', '/', authenticate, requirePermission, 'trafico', OPERATIONS.WRITE, async (req, res) => {
    const { data, errors } = validateTraffic(req.body)
    if (errors.length) return sendValidation(res, errors)
    const { rows: [row] } = await pool.query(
      `INSERT INTO trafico (segmento, latitud, longitud, nivel_congestion, velocidad_kmh, fuente)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_trafico, fecha_hora, segmento, latitud, longitud,
                 nivel_congestion, velocidad_kmh, fuente`,
      [data.segmento, data.latitud, data.longitud, data.nivel_congestion, data.velocidad_kmh ?? null, data.fuente]
    )
    return res.status(201).json(projectTraffic(row))
  })

  withPermission(incidentesRouter, 'get', '/', authenticate, requirePermission, 'incidentes', OPERATIONS.READ, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT i.id_incidente, i.tipo, i.descripcion, i.latitud, i.longitud,
              i.fecha_hora, i.nivel, i.fuente, i.estado
       FROM incidentes i
       WHERE ($1::text IS NULL OR i.estado = $1)
         AND ($2::text IS NULL OR i.tipo = $2)
       ORDER BY i.fecha_hora DESC, i.id_incidente DESC`,
      [req.query.estado ?? null, req.query.tipo ?? null]
    )
    return res.json(rows.map(projectIncident))
  })

  withPermission(incidentesRouter, 'post', '/', authenticate, requirePermission, 'incidentes', OPERATIONS.WRITE, async (req, res) => {
    const { data, errors } = validateIncident(req.body)
    if (errors.length) return sendValidation(res, errors)
    const { rows: [row] } = await pool.query(
      `INSERT INTO incidentes (
         tipo, descripcion, latitud, longitud, ubicacion, nivel, fuente, estado
       )
       VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($4, $3), 4326)::geography, $5, $6, 'ACTIVO')
       RETURNING id_incidente, tipo, descripcion, latitud, longitud, fecha_hora, nivel, fuente, estado`,
      [data.tipo, data.descripcion, data.latitud, data.longitud, data.nivel, data.fuente || 'MANUAL']
    )
    return res.status(201).json(projectIncident(row))
  })

  withPermission(incidentesRouter, 'patch', '/:id_incidente/estado', authenticate, requirePermission, 'incidentes', OPERATIONS.WRITE, async (req, res) => {
    const id = numeric(req.params.id_incidente)
    if (!Number.isInteger(id)) return sendValidation(res, [{ loc: ['path', 'id_incidente'], msg: 'Input should be a valid integer', type: 'int_parsing' }])
    const data = isObject(req.body) ? req.body : {}
    if (!['ACTIVO', 'RESUELTO', 'CANCELADO'].includes(data.estado)) {
      return sendValidation(res, [{ loc: ['body', 'estado'], msg: typeof data.estado === 'undefined' ? 'Field required' : 'El estado no es válido', type: typeof data.estado === 'undefined' ? 'missing' : 'value_error' }])
    }
    const { rows: [row] } = await pool.query(
      `UPDATE incidentes SET estado = $1 WHERE id_incidente = $2
       RETURNING id_incidente, tipo, descripcion, latitud, longitud, fecha_hora, nivel, fuente, estado`,
      [data.estado, id]
    )
    if (!row) return res.status(404).json({ detail: 'El incidente no existe' })
    return res.json(projectIncident(row))
  })

  withPermission(evaluacionRouter, 'get', '/:id_ruta/evaluar-reoptimizacion', authenticate, requirePermission, 'trafico', OPERATIONS.READ, async (req, res) => {
    const id = numeric(req.params.id_ruta)
    if (!Number.isInteger(id)) return sendValidation(res, [{ loc: ['path', 'id_ruta'], msg: 'Input should be a valid integer', type: 'int_parsing' }])
    const { rows: [route] } = await pool.query(
      'SELECT r.id_ruta, r.estado, r.fecha FROM rutas r WHERE r.id_ruta = $1', [id]
    )
    if (!route) return res.status(404).json({ detail: 'La ruta no existe' })
    const { rows: stops } = await pool.query(
      'SELECT latitud, longitud, tipo_parada FROM paradas_ruta WHERE id_ruta = $1', [id]
    )
    const deliveryStops = stops.filter((stop) => stop.tipo_parada === 'ENTREGA')
    const { rows: incidents } = await pool.query(
      `SELECT id_incidente, tipo, descripcion, latitud, longitud, nivel
       FROM incidentes WHERE estado = 'ACTIVO'`
    )
    const incidentsOnRoute = []
    for (const incident of incidents) {
      for (const stop of deliveryStops) {
        const distance = haversineKm(Number(stop.latitud), Number(stop.longitud), Number(incident.latitud), Number(incident.longitud))
        if (distance <= 2) {
          incidentsOnRoute.push({
            id_incidente: incident.id_incidente,
            tipo: incident.tipo,
            descripcion: incident.descripcion,
            nivel: incident.nivel,
            distancia_km: round(distance),
          })
          break
        }
      }
    }
    const reasons = []
    if (incidentsOnRoute.length) reasons.push('Incidente activo a menos de 2 km del recorrido (RN-017c)')

    const { rows: traffic } = await pool.query(
      `SELECT latitud, longitud, nivel_congestion, segmento FROM trafico
       WHERE fecha_hora = (SELECT MAX(fecha_hora) FROM trafico)`
    )
    const congestedOnRoute = []
    for (const segment of traffic) {
      for (const stop of deliveryStops) {
        const distance = haversineKm(Number(stop.latitud), Number(stop.longitud), Number(segment.latitud), Number(segment.longitud))
        if (distance <= 2) {
          congestedOnRoute.push({
            segmento: segment.segmento,
            nivel: segment.nivel_congestion,
            distancia_km: round(distance),
          })
          break
        }
      }
    }
    if (congestedOnRoute.some((segment) => segment.nivel === 'ROJO')) reasons.push('Tramo con congestión ROJO sobre el recorrido (RN-012)')

    const { rows: [totals] } = await pool.query(
      'SELECT count(*) AS total FROM ruta_pedidos WHERE id_ruta = $1', [id]
    )
    const { rows: [cancelled] } = await pool.query(
      `SELECT count(*) AS total FROM ruta_pedidos rp JOIN pedidos p ON p.id_pedido = rp.id_pedido
       WHERE rp.id_ruta = $1 AND p.estado = 'CANCELADO'`, [id]
    )
    const total = Number(totals.total)
    const cancelledCount = Number(cancelled.total)
    if (total && cancelledCount / total > 0.10) reasons.push(`Cancelación de ${cancelledCount}/${total} pedidos supera el 10% (RN-017b)`)

    const { rows: [express] } = await pool.query(
      `SELECT count(*) AS total FROM pedidos p
       WHERE p.prioridad = 'EXPRESS' AND p.estado = 'PENDIENTE'
         AND NOT EXISTS (SELECT 1 FROM ruta_pedidos rp WHERE rp.id_pedido = p.id_pedido)`
    )
    const expressCount = Number(express.total)
    if (expressCount) reasons.push(`${expressCount} pedido(s) EXPRESS sin planificar`)
    return res.json({
      id_ruta: id,
      requiere_reoptimizacion: reasons.length > 0,
      motivos: reasons,
      incidentes_en_ruta: incidentsOnRoute,
      tramos_congestionados: congestedOnRoute,
    })
  })

  withPermission(evaluacionRouter, 'get', '/pendientes-reoptimizacion', authenticate, requirePermission, 'trafico', OPERATIONS.READ, async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT r.id_ruta, r.fecha, r.estado, r.distancia_km,
              count(rp.id_pedido) AS pedidos,
              count(*) FILTER (WHERE rp.estado_entrega = 'ENTREGADO') AS entregados
       FROM rutas r LEFT JOIN ruta_pedidos rp ON rp.id_ruta = r.id_ruta
       WHERE r.estado IN ${ACTIVE_ROUTE_STATES}
       GROUP BY r.id_ruta ORDER BY r.fecha DESC, r.id_ruta DESC`
    )
    return res.json(rows.map((row) => ({
      ...row,
      pedidos: Number(row.pedidos),
      entregados: Number(row.entregados),
      distancia_km: row.distancia_km === null ? null : Number(row.distancia_km),
    })))
  })

  return {
    traficoRouter,
    incidentesRouter,
    obstaculosRouter,
    operacionRouter,
    evaluacionRouter,
  }
}
