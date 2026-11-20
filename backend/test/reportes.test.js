import test from 'node:test'
import assert from 'node:assert/strict'
import { equivalentTrees } from '../src/services/calculations.js'
import { generateReportCsv, REPORT_TYPES, toCsv } from '../src/services/reportes.js'

test('equivalentTrees uses the 22 kg factor and rounds up', () => {
  assert.equal(equivalentTrees(22), 1)
  assert.equal(equivalentTrees(44), 2)
  assert.equal(equivalentTrees(50), 3)
  assert.equal(equivalentTrees(100), 5)
  assert.equal(equivalentTrees(220), 10)
  assert.equal(equivalentTrees(500), 23)
})

test('CSV escapes commas, quotes and line breaks', () => {
  const csv = toCsv(['nombre', 'valor'], [
    { nombre: 'Lima, "Este"', valor: 'linea 1\nlinea 2' },
    { nombre: null, valor: undefined },
  ])
  assert.match(csv, /"Lima, ""Este"""/)
  assert.match(csv, /"linea 1\nlinea 2"/)
  assert.match(csv, /\r\n,\r\n$/)
})

test('report CSVs include the expected columns for every report type', async () => {
  const route = {
    id_ruta: 12,
    fecha: '2026-11-11',
    estado: 'COMPLETADA',
    distancia_km: 15,
    combustible_litros: 4,
    co2_kg: 8,
    co2_evitable_kg: 2,
    cumplimiento_ventanas_pct: 95,
    costo_combustible: 10,
    costo_mantenimiento: 2,
    costo_depreciacion: 3,
    costo_seguro: 1,
    costo_conductor: 5,
    costo_total: 21,
    duracion_minutos: 60,
    algoritmo_utilizado: 'VRPTW',
    placa: 'ABC-123',
    tipo_combustible: 'DIESEL',
  }
  const queries = []
  const pool = {
    async query(sql, params) {
      queries.push({ sql, params })
      if (sql.includes('SELECT id_ruta FROM rutas')) return { rows: [{ id_ruta: 12 }] }
      return { rows: [route] }
    },
  }

  const expectedHeaders = {
    SOSTENIBILIDAD: 'id_ruta,fecha,estado,distancia_km,combustible_litros,co2_kg,co2_evitable_kg,cumplimiento_ventanas_pct,placa,tipo_combustible',
    TCO: 'id_ruta,fecha,estado,distancia_km,costo_combustible,costo_mantenimiento,costo_depreciacion,costo_seguro,costo_conductor,costo_total,placa',
    COMPENSACION: 'id_ruta,fecha,co2_kg,co2_evitable_kg,placa,tipo_combustible',
    AUDITORIA: 'id_ruta,fecha,estado,distancia_km,duracion_minutos,combustible_litros,co2_kg,costo_total,cumplimiento_ventanas_pct,algoritmo_utilizado,placa',
  }

  for (const type of REPORT_TYPES) {
    const report = await generateReportCsv({ pool, type, routeId: 12 })
    assert.match(report.filename, new RegExp(`^reporte_${type}_12_\\d{8}_\\d{6}_\\d+-\\d+\\.csv$`))
    assert.ok(report.content.startsWith('\uFEFF'))
    assert.ok(report.content.includes(expectedHeaders[type]))
    assert.ok(report.content.includes('ABC-123'))
  }

  assert.equal(queries.filter(({ sql }) => sql.includes('SELECT id_ruta FROM rutas')).length, REPORT_TYPES.length)
  assert.ok(queries.every(({ params }) => params[0] === 12))
})

test('report CSVs support consolidated routes and report missing routes', async () => {
  const queries = []
  const pool = {
    async query(sql, params) {
      queries.push({ sql, params })
      if (sql.includes('SELECT id_ruta FROM rutas')) return { rows: [] }
      return { rows: [{ id_ruta: 1, estado: 'PLANIFICADA' }] }
    },
  }

  const consolidated = await generateReportCsv({ pool, type: 'AUDITORIA', routeId: null })
  assert.match(consolidated.filename, /^reporte_AUDITORIA_consolidado_/)
  assert.ok(consolidated.content.includes('PLANIFICADA'))
  assert.equal(queries.length, 1)
  assert.match(queries[0].sql, /estado <> 'CANCELADA'/)

  await assert.rejects(
    generateReportCsv({ pool, type: 'TCO', routeId: 404 }),
    (error) => error.statusCode === 404 && error.message === 'La ruta no existe',
  )
})

test('report CSV generation rejects unknown report types', async () => {
  await assert.rejects(
    generateReportCsv({ pool: { query() { throw new Error('must not query') } }, type: 'UNKNOWN', routeId: null }),
    TypeError,
  )
})
