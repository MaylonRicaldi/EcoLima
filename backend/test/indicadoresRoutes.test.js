import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createIndicadoresRouters } from '../src/routes/indicadores.js'

const route = {
  id_ruta: 12,
  fecha: '2026-11-11',
  estado: 'COMPLETADA',
  distancia_km: 15,
  distancia_base_km: 20,
  duracion_minutos: 60,
  combustible_litros: 4,
  costo_combustible: 10,
  costo_mantenimiento: 2,
  costo_depreciacion: 3,
  costo_seguro: 1,
  costo_conductor: 5,
  costo_total: 21,
  co2_kg: 8,
  co2_evitable_kg: 2,
  cumplimiento_ventanas_pct: 95,
  algoritmo_utilizado: 'VRPTW',
  placa: 'ABC-123',
  tipo_combustible: 'DIESEL',
  conductor_nombre: 'Ana',
  conductor_apellido: 'Lima',
}

const compensation = {
  id_compensacion: 3,
  co2_total_kg: 44,
  co2_a_compensar_kg: 44,
  factor_captura_arbol_kg: 22,
  arboles_necesarios: 2,
  proyecto_reforestacion: 'Parque Zonal Huascar',
  ubicacion: 'Lima Este',
  costo_estimado: 20,
  fecha_calculo: '2026-11-11',
}

function createPool(options = {}) {
  const state = {
    routeExists: true,
    report: {
      id_reporte: 7,
      id_ruta: null,
      usuario_generador: 1,
      tipo: 'TCO',
      fecha_generacion: '2026-11-11',
      ruta_archivo: 'reporte.csv',
      contenido_csv: 'id_ruta,costo_total',
    },
    compensationExists: false,
    failCompensationInsert: false,
    ...options,
  }

  return {
    state,
    async query(sql, params = []) {
      if (sql.includes('AS pedidos')) {
        return { rows: [{
          pedidos: 2,
          pendientes: 1,
          entregados: 1,
          cancelados: 0,
          vehiculos: 1,
          vehiculos_activos: 1,
          conductores: 1,
          conductores_disponibles: 1,
          rutas: 1,
          rutas_en_curso: 0,
          rutas_planificadas: 0,
          clientes_activos: 1,
          incidentes_activos: 0,
        }] }
      }
      if (sql.includes('AS ahorro_combustible_l')) {
        return { rows: [{
          ahorro_combustible_l: 1,
          ahorro_economico: 2,
          co2_ahorrado_kg: 3,
          reduccion_co2_pct: 4,
          reduccion_distancia_pct: 5,
          cumplimiento_ventanas_pct: 0,
          ventanas_registros: 0,
        }] }
      }
      if (sql.includes('AS distancia_base_km')) {
        return { rows: [{
          distancia_base_km: 20,
          distancia_optimizada_km: 15,
          co2_base_kg: 10,
          co2_optimizada_kg: 8,
        }] }
      }
      if (sql.includes('AS duracion_minutos')) {
        return { rows: [{
          distancia_km: 15,
          duracion_minutos: 60,
          combustible_l: 4,
          costo_total: 21,
          co2_kg: 8,
          rutas: 1,
        }] }
      }
      if (sql.includes('SELECT estado, count(*) AS cantidad')) {
        return { rows: [{ estado: 'PENDIENTE', cantidad: '1' }] }
      }
      if (sql.includes('SELECT v.tipo_combustible')) {
        return { rows: [{ tipo_combustible: 'DIESEL', vehiculos: '1' }] }
      }
      if (sql.includes('SELECT id_ruta FROM rutas')) {
        return { rows: state.routeExists ? [{ id_ruta: params[0] }] : [] }
      }
      if (sql.includes('FROM reportes rp')) return { rows: [state.report] }
      if (sql.includes('SELECT id_reporte, ruta_archivo, contenido_csv')) {
        return { rows: state.report ? [state.report] : [] }
      }
      if (sql.includes('FROM indicadores_ruta WHERE id_ruta')) {
        return { rows: [{ id_ruta: params[0], reduccion_co2_pct: 12 }] }
      }
      if (sql.includes('SELECT r.id_ruta, r.fecha, r.distancia_km')) {
        return { rows: state.routeExists ? [route] : [] }
      }
      if (sql.includes('SELECT r.id_ruta, r.fecha,')) {
        return { rows: state.routeExists ? [route] : [] }
      }
      if (sql.includes('COALESCE(SUM(distancia_km), 0) AS distancia')) {
        return { rows: [{
          distancia: 15,
          combustible: 4,
          costo: 21,
          co2: 8,
          co2_ahorrado: 2,
        }] }
      }
      if (sql.includes('AS emitido')) return { rows: [{ emitido: 44, evitable: 5 }] }
      if (sql.includes('FROM compensacion_carbono cc')) return { rows: [compensation] }
      if (sql.includes('SELECT r.*, v.placa, v.tipo_combustible')) return { rows: [route] }
      if (sql.includes('SELECT') && sql.includes('FROM rutas')) return { rows: [route] }
      return { rows: [] }
    },
    async connect() {
      return {
        async query(sql, params = []) {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rows: [] }
          }
          if (sql.includes('AS co2_total')) return { rows: [{ co2_total: 44 }] }
          if (sql.includes('WHERE cc.co2_total_kg')) {
            return { rows: state.compensationExists ? [compensation] : [] }
          }
          if (sql.includes('INSERT INTO compensacion_carbono')) {
            if (state.failCompensationInsert) throw new Error('compensation insert failed')
            return { rows: [{ id_compensacion: compensation.id_compensacion }] }
          }
          if (sql.includes('FROM compensacion_carbono cc')) return { rows: [compensation] }
          if (sql.includes('INSERT INTO reportes')) {
            state.report = {
              ...state.report,
              id_ruta: params[0],
              tipo: params[2],
              ruta_archivo: params[3],
              contenido_csv: params[4],
            }
            return { rows: [{ id_reporte: state.report.id_reporte }] }
          }
          if (sql.includes('SELECT * FROM reportes')) return { rows: [state.report] }
          return { rows: [] }
        },
        release() {},
      }
    },
  }
}

async function withApp(options, callback) {
  const pool = createPool(options)
  const app = express()
  app.use(express.json())
  const authenticate = (req, _res, next) => {
    req.user = { id_usuario: 1, rol: 'ADMIN' }
    next()
  }
  const requirePermission = () => (_req, _res, next) => next()
  const routers = createIndicadoresRouters({ pool, authenticate, requirePermission })
  app.use('/', routers.indicadoresRouter)
  app.use('/sostenibilidad', routers.sostenibilidadRouter)
  app.use('/reportes', routers.reportesRouter)
  app.use((error, _req, res, _next) => res.status(500).json({ detail: error.message }))

  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  try {
    await callback(`http://127.0.0.1:${server.address().port}`, pool.state)
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    })
  }
}

test('dashboard and report listings expose data and validate the report filter', async () => {
  await withApp({}, async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/reportes?tipo=UNKNOWN`)
    assert.equal(invalid.status, 422)

    const dashboard = await fetch(`${baseUrl}/dashboard`)
    assert.equal(dashboard.status, 200)
    assert.equal((await dashboard.json()).ventanas.tiene_datos, false)

    const reports = await fetch(`${baseUrl}/reportes`)
    assert.equal(reports.status, 200)
    assert.equal((await reports.json())[0].id_reporte, 7)
  })
})

test('report generation validates parameters, handles missing routes, and stores CSV', async () => {
  await withApp({}, async (baseUrl, state) => {
    const missingType = await fetch(`${baseUrl}/reportes`, { method: 'POST' })
    assert.equal(missingType.status, 422)

    const invalidType = await fetch(`${baseUrl}/reportes?tipo=UNKNOWN`, { method: 'POST' })
    assert.equal(invalidType.status, 422)

    const invalidRoute = await fetch(`${baseUrl}/reportes?tipo=TCO&id_ruta=bad`, { method: 'POST' })
    assert.equal(invalidRoute.status, 422)

    state.routeExists = false
    const missingRoute = await fetch(`${baseUrl}/reportes?tipo=TCO&id_ruta=404`, { method: 'POST' })
    assert.equal(missingRoute.status, 404)

    state.routeExists = true
    const created = await fetch(`${baseUrl}/reportes?tipo=TCO&id_ruta=null`, { method: 'POST' })
    assert.equal(created.status, 201)
    const report = await created.json()
    assert.equal(report.tipo, 'TCO')
    assert.match(report.contenido_csv, /costo_total/)
  })
})

test('report downloads validate IDs and distinguish missing and available CSVs', async () => {
  await withApp({}, async (baseUrl, state) => {
    const invalid = await fetch(`${baseUrl}/reportes/nope/descargar`)
    assert.equal(invalid.status, 422)

    state.report = null
    const missing = await fetch(`${baseUrl}/reportes/7/descargar`)
    assert.equal(missing.status, 404)

    state.report = { id_reporte: 7, ruta_archivo: 'empty.csv', contenido_csv: '' }
    const unavailable = await fetch(`${baseUrl}/reportes/7/descargar`)
    assert.equal(unavailable.status, 404)

    state.report = { id_reporte: 7, ruta_archivo: 'ok.csv', contenido_csv: 'a,b\r\n1,2\r\n' }
    const downloaded = await fetch(`${baseUrl}/reportes/7/descargar`)
    assert.equal(downloaded.status, 200)
    assert.equal(downloaded.headers.get('content-disposition'), 'attachment; filename="ok.csv"')
    assert.equal(await downloaded.text(), state.report.contenido_csv)
  })
})

test('sustainability report endpoints validate routes and aggregate totals', async () => {
  await withApp({}, async (baseUrl, state) => {
    const missingId = await fetch(`${baseUrl}/reportes/sostenibilidad`)
    assert.equal(missingId.status, 422)

    const invalidId = await fetch(`${baseUrl}/reportes/sostenibilidad?id_ruta=nope`)
    assert.equal(invalidId.status, 422)

    state.routeExists = false
    const missingRoute = await fetch(`${baseUrl}/reportes/sostenibilidad?id_ruta=12`)
    assert.equal(missingRoute.status, 404)

    state.routeExists = true
    const sustainability = await fetch(`${baseUrl}/reportes/sostenibilidad?id_ruta=12`)
    assert.equal(sustainability.status, 200)
    assert.equal((await sustainability.json()).arboles_equivalentes, 1)

    const consolidated = await fetch(`${baseUrl}/reportes/consolidado`)
    assert.equal(consolidated.status, 200)
    assert.equal((await consolidated.json()).totales.arboles_equivalentes, 1)
  })
})

test('compensation endpoints validate, reuse and create calculations', async () => {
  await withApp({}, async (baseUrl, state) => {
    const impact = await fetch(`${baseUrl}/sostenibilidad/impacto`)
    assert.equal(impact.status, 200)

    const listed = await fetch(`${baseUrl}/sostenibilidad/compensacion`)
    assert.equal(listed.status, 200)

    for (const amount of [0, 45, 'not-a-number']) {
      const invalid = await fetch(`${baseUrl}/sostenibilidad/compensacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ co2_a_compensar_kg: amount }),
      })
      assert.equal(invalid.status, 422)
    }

    state.compensationExists = true
    const reused = await fetch(`${baseUrl}/sostenibilidad/compensacion`, { method: 'POST' })
    assert.equal(reused.status, 200)

    state.compensationExists = false
    const created = await fetch(`${baseUrl}/sostenibilidad/compensacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ co2_a_compensar_kg: 22 }),
    })
    assert.equal(created.status, 201)
    assert.equal((await created.json()).id_compensacion, compensation.id_compensacion)
  })
})

test('compensation failures roll back and return an explicit server error', async () => {
  await withApp({ failCompensationInsert: true }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/sostenibilidad/compensacion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { detail: 'compensation insert failed' })
  })
})
