import { Router } from 'express'
import { OPERATIONS } from '../core/permissions.js'
import { equivalentTrees } from '../services/calculations.js'
import { PARAMS } from '../core/parameters.js'

// app.js integration:
// const { indicadoresRouter, sostenibilidadRouter, reportesRouter } =
//   createIndicadoresRouters({ pool, authenticate, requirePermission })
// app.use('/', indicadoresRouter)
// app.use('/sostenibilidad', sostenibilidadRouter)
// app.use('/reportes', reportesRouter)

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}

function addError(errors, field, message, loc = 'query', type = 'value_error') {
  errors.push({ loc: [loc, field], msg: message, type })
}

function sendValidation(res, errors) {
  return res.status(422).json({ detail: errors })
}

function number(value) {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function round(value) {
  return Math.round((number(value) + Number.EPSILON) * 100) / 100
}

function isoDateToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function integerQuery(value, field, errors, required = false) {
  if (typeof value === 'undefined') {
    if (required) addError(errors, field, 'Field required', 'query', 'missing')
    return null
  }
  if (value === 'null' && !required) return null
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) {
    addError(errors, field, 'Input should be a valid integer', 'query', 'int_parsing')
    return null
  }
  return parsed
}

function compensationColumns() {
  return `cc.id_compensacion, cc.co2_total_kg, cc.co2_a_compensar_kg,
          cc.factor_captura_arbol_kg, cc.arboles_necesarios,
          cc.proyecto_reforestacion, cc.ubicacion, cc.costo_estimado,
          cc.fecha_calculo`
}

export function createIndicadoresRouters({ pool, authenticate, requirePermission }) {
  const indicadoresRouter = Router()
  const sostenibilidadRouter = Router()
  const reportesRouter = Router()

  indicadoresRouter.get('/dashboard', authenticate, requirePermission('indicadores', OPERATIONS.READ), asyncRoute(async (_req, res) => {
    const { rows: [counts] } = await pool.query(
      `SELECT
         (SELECT count(*) FROM pedidos) AS pedidos,
         (SELECT count(*) FROM pedidos WHERE estado = 'PENDIENTE') AS pendientes,
         (SELECT count(*) FROM pedidos WHERE estado = 'ENTREGADO') AS entregados,
         (SELECT count(*) FROM pedidos WHERE estado = 'CANCELADO') AS cancelados,
         (SELECT count(*) FROM vehiculos) AS vehiculos,
         (SELECT count(*) FROM vehiculos WHERE estado = 'ACTIVO') AS vehiculos_activos,
         (SELECT count(*) FROM conductores) AS conductores,
         (SELECT count(*) FROM conductores WHERE estado = 'DISPONIBLE') AS conductores_disponibles,
         (SELECT count(*) FROM rutas) AS rutas,
         (SELECT count(*) FROM rutas WHERE estado = 'EN_CURSO') AS rutas_en_curso,
         (SELECT count(*) FROM rutas WHERE estado = 'PLANIFICADA') AS rutas_planificadas,
         (SELECT count(*) FROM clientes WHERE estado = 'ACTIVO') AS clientes_activos,
         (SELECT count(*) FROM incidentes WHERE estado = 'ACTIVO') AS incidentes_activos`
    )
    for (const key of Object.keys(counts)) counts[key] = number(counts[key])

    const { rows: [operation] } = await pool.query(
      `SELECT COALESCE(SUM(distancia_km), 0) AS distancia_km,
              COALESCE(SUM(duracion_minutos), 0) AS duracion_minutos,
              COALESCE(SUM(combustible_litros), 0) AS combustible_l,
              COALESCE(SUM(costo_total), 0) AS costo_total,
              COALESCE(SUM(co2_kg), 0) AS co2_kg, COUNT(*) AS rutas
       FROM rutas WHERE estado <> 'CANCELADA'`
    )
    const { rows: [savings] } = await pool.query(
      `SELECT COALESCE(SUM(ahorro_combustible_l), 0) AS ahorro_combustible_l,
              COALESCE(SUM(ahorro_economico), 0) AS ahorro_economico,
              COALESCE(SUM(co2_ahorrado_kg), 0) AS co2_ahorrado_kg,
              COALESCE(AVG(reduccion_co2_pct), 0) AS reduccion_co2_pct,
              COALESCE(AVG(reduccion_distancia_pct), 0) AS reduccion_distancia_pct,
              COALESCE(AVG(cumplimiento_ventanas_pct), 0) AS cumplimiento_ventanas_pct
       FROM indicadores_ruta`
    )
    const { rows: [base] } = await pool.query(
      `SELECT COALESCE(SUM(distancia_base_km), 0) AS distancia_base_km,
              COALESCE(SUM(distancia_km), 0) AS distancia_optimizada_km,
              COALESCE(SUM(co2_kg + co2_evitable_kg), 0) AS co2_base_kg,
              COALESCE(SUM(co2_kg), 0) AS co2_optimizada_kg
       FROM rutas WHERE estado <> 'CANCELADA'`
    )
    const co2Total = number(base.co2_optimizada_kg)
    const { rows: orderStates } = await pool.query(
      `SELECT estado, count(*) AS cantidad FROM pedidos
       GROUP BY estado ORDER BY estado`
    )
    const { rows: fleet } = await pool.query(
      `SELECT v.tipo_combustible, count(*) AS vehiculos FROM vehiculos v
       WHERE v.tipo_combustible <> 'ELECTRICO'
       GROUP BY v.tipo_combustible ORDER BY v.tipo_combustible`
    )
    return res.json({
      conteos: counts,
      operacion: {
        distancia_km: round(operation.distancia_km),
        duracion_minutos: round(operation.duracion_minutos),
        combustible_l: round(operation.combustible_l),
        costo_total: round(operation.costo_total),
        co2_kg: round(co2Total),
        rutas: number(operation.rutas),
      },
      ahorro: {
        combustible_l: round(savings.ahorro_combustible_l),
        economico: round(savings.ahorro_economico),
        co2_kg: round(savings.co2_ahorrado_kg),
        reduccion_co2_pct: round(savings.reduccion_co2_pct),
        reduccion_distancia_pct: round(savings.reduccion_distancia_pct),
      },
      ventanas: { cumplimiento_pct: round(savings.cumplimiento_ventanas_pct) },
      comparativo_sequencial: {
        distancia_base_km: round(base.distancia_base_km),
        distancia_optimizada_km: round(base.distancia_optimizada_km),
        co2_base_kg: round(base.co2_base_kg),
        co2_optimizada_kg: round(co2Total),
      },
      sostenibilidad: {
        kg_co2_por_arbol_anio: PARAMS.co2PerTreePerYearKg,
        arboles_equivalentes: equivalentTrees(co2Total),
        mensaje: `Has emitido ${round(co2Total)} kg de CO2. Equivale a plantar ${equivalentTrees(co2Total)} arboles en el Parque Zonal Huáscar.`,
      },
      pedidos_por_estado: orderStates.map((row) => ({ estado: row.estado, cantidad: number(row.cantidad) })),
      flota_por_combustible: fleet.map((row) => ({ tipo_combustible: row.tipo_combustible, vehiculos: number(row.vehiculos) })),
    })
  }))

  indicadoresRouter.get('/indicadores', authenticate, requirePermission('indicadores', OPERATIONS.READ), asyncRoute(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT i.*, r.fecha, r.estado AS estado_ruta
       FROM indicadores_ruta i
       INNER JOIN rutas r ON r.id_ruta = i.id_ruta
       ORDER BY r.fecha DESC, i.id_ruta DESC`
    )
    return res.json(rows)
  }))

  sostenibilidadRouter.get('/compensacion', authenticate, requirePermission('compensacion', OPERATIONS.READ), asyncRoute(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT ${compensationColumns()} FROM compensacion_carbono cc
       ORDER BY cc.id_compensacion DESC`
    )
    return res.json(rows)
  }))

  sostenibilidadRouter.post('/compensacion', authenticate, requirePermission('compensacion', OPERATIONS.WRITE), asyncRoute(async (_req, res) => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows: [emissions] } = await client.query(
        `SELECT COALESCE(SUM(co2_kg), 0) AS co2_total
         FROM rutas WHERE estado <> 'CANCELADA'`
      )
      const co2 = number(emissions.co2_total)
      const { rows: [created] } = await client.query(
        `INSERT INTO compensacion_carbono (
           co2_total_kg, co2_a_compensar_kg, factor_captura_arbol_kg,
           proyecto_reforestacion, ubicacion
         )
         VALUES ($1, $1, $2,
                 'Programa Arboles para Lima - Parque Zonal Huascar',
                 'Parque Zonal Huascar, Lima Este')
         RETURNING id_compensacion`,
        [co2, PARAMS.co2PerTreePerYearKg]
      )
      const { rows: [compensation] } = await client.query(
        `SELECT ${compensationColumns()} FROM compensacion_carbono cc
         WHERE cc.id_compensacion = $1`,
        [created.id_compensacion]
      )
      await client.query('COMMIT')
      return res.json(compensation)
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
  }))

  sostenibilidadRouter.get('/impacto', authenticate, requirePermission('compensacion', OPERATIONS.READ), asyncRoute(async (_req, res) => {
    const { rows: [data] } = await pool.query(
      `SELECT COALESCE(SUM(co2_kg), 0) AS emitido,
              COALESCE(SUM(co2_evitable_kg), 0) AS evitable
       FROM rutas WHERE estado <> 'CANCELADA'`
    )
    const emitted = number(data.emitido)
    const avoidable = number(data.evitable)
    const treesToOffset = equivalentTrees(emitted)
    return res.json({
      co2_emitido_kg: round(emitted),
      co2_evitable_kg: round(avoidable),
      arboles_para_compensar: treesToOffset,
      arboles_por_ahorro: equivalentTrees(avoidable),
      factor_kg_por_arbol_anio: PARAMS.co2PerTreePerYearKg,
      equivalencia: `Compensar ${round(emitted)} kg de CO2 requiere ${treesToOffset} arboles en el Parque Zonal Huáscar.`,
    })
  }))

  reportesRouter.get('/', authenticate, requirePermission('reportes', OPERATIONS.READ), asyncRoute(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT rp.id_reporte, rp.id_ruta, rp.usuario_generador, rp.tipo,
              rp.fecha_generacion, rp.ruta_archivo, u.nombre AS usuario_nombre
       FROM reportes rp INNER JOIN usuarios u ON u.id_usuario = rp.usuario_generador
       WHERE ($1::text IS NULL OR rp.tipo = $1)
       ORDER BY rp.fecha_generacion DESC`,
      [req.query.tipo ?? null]
    )
    return res.json(rows)
  }))

  reportesRouter.post('/', authenticate, requirePermission('reportes', OPERATIONS.WRITE), asyncRoute(async (req, res) => {
    const errors = []
    const type = req.query.tipo
    if (typeof type === 'undefined') addError(errors, 'tipo', 'Field required', 'query', 'missing')
    const routeId = integerQuery(req.query.id_ruta, 'id_ruta', errors, true)
    if (errors.length) return sendValidation(res, errors)
    if (!['SOSTENIBILIDAD', 'TCO', 'COMPENSACION', 'AUDITORIA'].includes(type)) {
      return res.status(422).json({ detail: 'El tipo debe ser SOSTENIBILIDAD, TCO, COMPENSACION o AUDITORIA' })
    }
    if (routeId !== null) {
      const { rows: [route] } = await pool.query('SELECT id_ruta FROM rutas WHERE id_ruta = $1', [routeId])
      if (!route) return res.status(404).json({ detail: 'La ruta no existe' })
    }
    const filename = `reporte_${type.toLowerCase()}_${routeId || 'consolidado'}_${isoDateToday()}.csv`
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows: [created] } = await client.query(
        `INSERT INTO reportes (id_ruta, usuario_generador, tipo, ruta_archivo)
         VALUES ($1, $2, $3, $4) RETURNING id_reporte`,
        [routeId, req.user.id_usuario, type, filename]
      )
      const { rows: [report] } = await client.query(
        'SELECT * FROM reportes WHERE id_reporte = $1', [created.id_reporte]
      )
      await client.query('COMMIT')
      return res.json(report)
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    } finally {
      client.release()
    }
  }))

  reportesRouter.get('/sostenibilidad', authenticate, requirePermission('reportes', OPERATIONS.READ), asyncRoute(async (req, res) => {
    const errors = []
    const routeId = integerQuery(req.query.id_ruta, 'id_ruta', errors, true)
    if (errors.length) return sendValidation(res, errors)
    const { rows: [route] } = await pool.query(
      `SELECT r.id_ruta, r.fecha, r.distancia_km, r.distancia_base_km,
              r.duracion_minutos, r.combustible_litros, r.costo_combustible,
              r.costo_mantenimiento, r.costo_depreciacion, r.costo_seguro,
              r.costo_conductor, r.costo_total, r.co2_kg, r.co2_evitable_kg,
              r.cumplimiento_ventanas_pct, r.estado, r.algoritmo_utilizado,
              v.placa, v.tipo_combustible, v.factor_co2_kg_km,
              co.nombre AS conductor_nombre, co.apellido AS conductor_apellido
       FROM rutas r
       LEFT JOIN asignaciones a ON a.id_ruta = r.id_ruta
       LEFT JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
       LEFT JOIN conductores co ON co.id_conductor = a.id_conductor
       WHERE r.id_ruta = $1`,
      [routeId]
    )
    if (!route) return res.status(404).json({ detail: 'La ruta no existe' })
    const { rows: [indicator] } = await pool.query(
      'SELECT * FROM indicadores_ruta WHERE id_ruta = $1', [routeId]
    )
    return res.json({
      ...route,
      indicador: indicator ?? null,
      arboles_equivalentes: equivalentTrees(route.co2_kg),
      kg_co2_por_arbol_anio: PARAMS.co2PerTreePerYearKg,
    })
  }))

  reportesRouter.get('/consolidado', authenticate, requirePermission('reportes', OPERATIONS.READ), asyncRoute(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT r.id_ruta, r.fecha, r.estado, r.distancia_km,
              r.combustible_litros, r.costo_total, r.co2_kg,
              r.cumplimiento_ventanas_pct, i.co2_ahorrado_kg,
              i.reduccion_co2_pct, i.reduccion_distancia_pct, v.placa,
              co.nombre || ' ' || co.apellido AS conductor
       FROM rutas r
       LEFT JOIN indicadores_ruta i ON i.id_ruta = r.id_ruta
       LEFT JOIN asignaciones a ON a.id_ruta = r.id_ruta
       LEFT JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
       LEFT JOIN conductores co ON co.id_conductor = a.id_conductor
       WHERE r.estado <> 'CANCELADA'
       ORDER BY r.fecha DESC, r.id_ruta DESC`
    )
    const { rows: [totals] } = await pool.query(
      `SELECT COALESCE(SUM(distancia_km), 0) AS distancia,
              COALESCE(SUM(combustible_litros), 0) AS combustible,
              COALESCE(SUM(costo_total), 0) AS costo,
              COALESCE(SUM(co2_kg), 0) AS co2,
              COALESCE(SUM(co2_evitable_kg), 0) AS co2_ahorrado
       FROM rutas WHERE estado <> 'CANCELADA'`
    )
    const co2Total = number(totals.co2)
    return res.json({
      rutas: rows,
      totales: {
        distancia_km: round(totals.distancia),
        combustible_l: round(totals.combustible),
        costo_total: round(totals.costo),
        co2_kg: round(co2Total),
        co2_ahorrado_kg: round(totals.co2_ahorrado),
        arboles_equivalentes: equivalentTrees(co2Total),
      },
    })
  }))

  return { indicadoresRouter, sostenibilidadRouter, reportesRouter }
}
