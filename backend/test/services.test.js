import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateCo2,
  calculateTco,
  equivalentTrees,
  haversineKm,
  windowLatePenalty,
} from '../src/services/calculations.js'
import {
  bestCategoryFor,
  blockingReason,
  enablesAny,
  enablesCategory,
} from '../src/core/licenses.js'
import { createRoadsService } from '../src/services/roads.js'
import {
  evaluateSaturation,
  minutesBetween,
  minutesWithinWindow,
} from '../src/services/saturation.js'

test('preserves documented cost, emissions and delay formulas', () => {
  assert.equal(calculateCo2(10, 0.9), 9)
  assert.equal(equivalentTrees(1909), 86.77)
  assert.equal(windowLatePenalty(30), 15)
  const tco = calculateTco(20, {
    tipo_combustible: 'DIESEL',
    consumo_km_l: 10,
    factor_co2_kg_km: 0.9,
    costo_adquisicion: 50_000,
    costo_soat_anual: 500,
    costo_seguro_anual: 1_500,
  })
  assert.equal(tco.costo_total, 483.25)
  assert.equal(tco.co2_kg, 18)
})

test('calculates geographical distance symmetrically', () => {
  const forward = haversineKm(-12.015, -77.005, -12.02, -77.015)
  const backward = haversineKm(-12.02, -77.015, -12.015, -77.005)
  assert.ok(forward > 0)
  assert.ok(Math.abs(forward - backward) < 1e-10)
})

test('keeps license classes separate and respects category hierarchy', () => {
  assert.equal(enablesCategory('MOTO', 'A-IIIC'), false)
  assert.equal(enablesCategory('MOTO', 'B-IIC'), true)
  assert.equal(enablesAny(['A-I', 'B-IIB'], 'MOTO'), true)
  assert.equal(bestCategoryFor(['A-IIIC', 'B-IIA'], 'MOTO'), 'B-IIA')
  assert.match(blockingReason('A-I', 'MOTO'), /no sirve para un MOTO/)
})

test('road routing caches OSRM matrices and falls back when a path is missing', async () => {
  let requests = 0
  const roads = createRoadsService({
    fetchImpl: async () => {
      requests += 1
      return {
        ok: true,
        json: async () => ({
          distances: [[0, 1200], [null, 0]],
          durations: [[0, 600], [null, 0]],
        }),
      }
    },
    fallbackDistance: () => 3,
  })

  const first = await roads.matrix([[-12.01, -77.01], [-12.02, -77.02]])
  const second = await roads.matrix([[-12.01, -77.01], [-12.02, -77.02]])
  assert.equal(first.km[0][1], 1.2)
  assert.equal(first.minutes[0][1], 10)
  assert.equal(first.km[1][0], 3)
  assert.equal(second.km[1][0], 3)
  assert.equal(requests, 1)
})

test('road routing falls back after repeated provider failures', async () => {
  const roads = createRoadsService({
    fetchImpl: async () => { throw new Error('offline') },
    fallbackDistance: () => 2,
  })
  for (let index = 0; index < 3; index += 1) {
    const result = await roads.matrix([[-12, -77], [-12.1, -77.1]])
    assert.equal(result.km, null)
  }
  assert.equal(roads.isAvailable(), false)
  assert.equal(await roads.distanceKm(-12, -77, -12.1, -77.1), 2)
})

test('saturation measures shift overlap with time windows', () => {
  assert.equal(minutesBetween('08:00:00', '11:30:00'), 210)
  assert.equal(minutesWithinWindow('06:00:00', '16:00:00', '08:00:00', '12:00:00'), 240)
  assert.equal(minutesWithinWindow('13:00:00', '16:00:00', '08:00:00', '12:00:00'), 0)
})

test('saturation marks a window unavailable when no licensed driver can serve it', async () => {
  const pool = {
    async query() {
      return { rows: [] }
    },
  }
  const result = await evaluateSaturation(pool, {
    date: '2026-10-30',
    startTime: '08:00:00',
    endTime: '12:00:00',
    weightKg: 20,
    volumeM3: 0.5,
  })
  assert.equal(result.estado, 'SATURADO')
  assert.equal(result.conductores_disponibles, 0)
  assert.equal(result.ventana_sugerida, null)
  assert.ok(result.motivos.some((reason) => reason.includes('No hay conductores')))
})
