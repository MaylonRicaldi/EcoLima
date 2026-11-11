import {
  calculateCo2,
  calculateTco,
  roadDistanceKm,
  serviceMinutes,
} from './calculations.js'
import { PARAMS } from '../core/parameters.js'

const round = (value) => Number(Number(value).toFixed(2))

function timestampAtMinute(date, minute) {
  const day = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10)
  const absoluteMinute = Math.trunc(Number(minute))
  const dayOffset = Math.floor(absoluteMinute / 1440)
  const dateValue = new Date(`${day}T00:00:00Z`)
  dateValue.setUTCDate(dateValue.getUTCDate() + dayOffset)
  const timeMinute = ((absoluteMinute % 1440) + 1440) % 1440
  const hh = String(Math.floor(timeMinute / 60)).padStart(2, '0')
  const mm = String(timeMinute % 60).padStart(2, '0')
  const datePart = dateValue.toISOString().slice(0, 10)
  return `${datePart} ${hh}:${mm}:00`
}

function startMinute(route) {
  return route.conductor?.disponibilidad_inicio ?? PARAMS.operatingStartHour * 60
}

function routeTime(route, date, isStart) {
  return timestampAtMinute(date, startMinute(route) + (isStart ? 0 : Math.trunc(route.minutos)))
}

function routeOrigin(problem, route) {
  if (!route.conductor || route.conductor.sale_del_local) {
    return [Number(problem.base.latitud), Number(problem.base.longitud)]
  }
  return [route.conductor.latitud, route.conductor.longitud]
}

function tco(route) {
  return calculateTco(route.distancia_km, route.vehiculo.datos)
}

function sequentialDistance(problem) {
  if (!problem.clientes.length) return 0
  const customers = [...problem.clientes].sort(
    (a, b) => Number(a.id_pedido) - Number(b.id_pedido)
  )
  let total = roadDistanceKm(
    Number(problem.base.latitud), Number(problem.base.longitud),
    customers[0].latitud, customers[0].longitud
  )
  for (let i = 1; i < customers.length; i += 1) {
    total += roadDistanceKm(
      customers[i - 1].latitud, customers[i - 1].longitud,
      customers[i].latitud, customers[i].longitud
    )
  }
  const last = customers.at(-1)
  total += roadDistanceKm(
    last.latitud, last.longitud,
    Number(problem.base.latitud), Number(problem.base.longitud)
  )
  return round(total)
}

function sequentialDuration(problem) {
  if (!problem.clientes.length) return 0
  return round(
    (sequentialDistance(problem) / PARAMS.normalSpeedKmh) * 60
      + problem.clientes.length * serviceMinutes()
  )
}

async function insertStop(client, values) {
  await client.query(
    `INSERT INTO paradas_ruta (
       id_ruta, orden, latitud, longitud, hora_llegada_estimada,
       tiempo_servicio, tiempo_espera, tipo_parada
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      values.routeId, values.order, values.lat, values.lon, values.time,
      values.service ?? 0, values.wait ?? 0, values.type,
    ]
  )
}

async function insertRouteOrders(client, routeId, route, date, { updateOrderState = false } = {}) {
  let order = 1
  const [startLat, startLon] = routeOrigin({ base: route._base }, route)
  await insertStop(client, {
    routeId, order, lat: startLat, lon: startLon,
    time: routeTime(route, date, true), type: 'INICIO',
  })

  for (let index = 0; index < route.secuencia.length; index += 1) {
    const customer = route.secuencia[index]
    if (route.posiciones_descanso.includes(index)) {
      order += 1
      await insertStop(client, {
        routeId, order, lat: startLat, lon: startLon,
        time: timestampAtMinute(date, customer.hora_llegada - Math.trunc(serviceMinutes())),
        wait: PARAMS.mandatoryBreakHours * 60, type: 'DESCANSO',
      })
    }

    order += 1
    const arrival = customer.hora_llegada - Math.trunc(serviceMinutes())
    const arrivalTime = timestampAtMinute(date, arrival)
    await insertStop(client, {
      routeId, order, lat: customer.latitud, lon: customer.longitud,
      time: arrivalTime, service: Math.trunc(serviceMinutes()),
      wait: Math.trunc(customer.tiempo_espera), type: 'ENTREGA',
    })
    await client.query(
      `INSERT INTO ruta_pedidos (
         id_ruta, id_pedido, orden_visita, hora_llegada_estimada,
         tiempo_espera, penalizacion, estado_entrega
       ) VALUES ($1,$2,$3,$4,$5,$6,'PENDIENTE')`,
      [
        routeId, customer.id_pedido, order, arrivalTime,
        Math.trunc(customer.tiempo_espera), customer.penalizacion,
      ]
    )
    if (updateOrderState) {
      await client.query(
        `UPDATE pedidos SET estado = 'ASIGNADO' WHERE id_pedido = $1`,
        [customer.id_pedido]
      )
    }
  }
  order += 1
  await insertStop(client, {
    routeId, order, lat: startLat, lon: startLon,
    time: routeTime(route, date, false), type: 'FIN',
  })
}

async function persistIndicators(client, routeId, route, baseline) {
  const costs = tco(route)
  const baselineDistance = baseline.distancia_base_km || route.distancia_km
  const baselineCo2 = baseline.co2_base_kg || route.co2_kg
  const baselineFuel = route.vehiculo.consumo_km_l > 0
    ? baselineDistance / route.vehiculo.consumo_km_l : 0
  const baselineTco = calculateTco(baselineDistance, route.vehiculo.datos)
  const savedFuel = round(Math.max(0, baselineFuel - costs.combustible_litros))
  const savedCost = round(Math.max(0, baselineTco.costo_total - route.costo_total))
  const savedCo2 = round(Math.max(0, baselineCo2 - route.co2_kg))
  const co2Reduction = baselineCo2 > 0 ? round(100 * savedCo2 / baselineCo2) : 0
  const distanceReduction = baselineDistance > 0
    ? round(100 * Math.max(0, baselineDistance - route.distancia_km) / baselineDistance) : 0
  await client.query(
    `INSERT INTO indicadores_ruta (
       id_ruta, distancia_km, combustible_l, co2_kg, costo_total,
       ahorro_combustible_l, ahorro_economico, co2_ahorrado_kg,
       cumplimiento_ventanas_pct, reduccion_co2_pct, reduccion_distancia_pct
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      routeId, route.distancia_km, costs.combustible_litros, route.co2_kg,
      route.costo_total, savedFuel, savedCost, savedCo2,
      route.cumplimiento_pct, co2Reduction, distanceReduction,
    ]
  )
}

function baselineFor(problem, route = null) {
  const distance = sequentialDistance(problem)
  const co2 = route
    ? calculateCo2(distance, route.vehiculo.factor_co2_kg_km)
    : round(problem.vehiculos.reduce(
      (sum, vehicle) => sum + calculateCo2(distance, vehicle.factor_co2_kg_km), 0
    ))
  return {
    distancia_base_km: distance,
    duracion_base_minutos: sequentialDuration(problem),
    co2_base_kg: co2,
  }
}

export async function persistOptimization(client, problem, routes, date, _userId, algorithm, _seconds) {
  const baseline = baselineFor(problem)
  const created = []
  for (const route of routes) {
    if (!route.secuencia.length) continue
    problem.evaluar_ruta(route, true)
    const costs = tco(route)
    const { rows } = await client.query(
      `INSERT INTO rutas (
         fecha, hora_inicio, hora_fin, distancia_km, duracion_minutos,
         distancia_base_km, duracion_base_minutos, combustible_litros,
         costo_combustible, costo_mantenimiento, costo_conductor,
         costo_depreciacion, costo_seguro, costo_total, co2_kg,
         co2_evitable_kg, cumplimiento_ventanas_pct, estado,
         algoritmo_utilizado
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'PLANIFICADA',$18)
       RETURNING id_ruta`,
      [
        date, routeTime(route, date, true), routeTime(route, date, false),
        route.distancia_km, route.minutos, round(baseline.distancia_base_km),
        round(baseline.duracion_base_minutos), costs.combustible_litros,
        costs.costo_combustible, costs.costo_mantenimiento, costs.costo_conductor,
        costs.costo_depreciacion, costs.costo_seguro, route.costo_total,
        route.co2_kg, round(Math.max(0, baseline.co2_base_kg - route.co2_kg)),
        route.cumplimiento_pct, algorithm,
      ]
    )
    const routeId = rows[0].id_ruta
    route._base = problem.base
    await insertRouteOrders(client, routeId, route, date, { updateOrderState: true })
    if (route.conductor) {
      const hours = round(route.minutos / 60)
      await client.query(
        `INSERT INTO asignaciones (
           id_ruta, id_vehiculo, id_conductor, horas_conduccion,
           horas_descanso, descanso_requerido, estado
         ) VALUES ($1,$2,$3,$4,0,$5,'ASIGNADA')`,
        [routeId, route.vehiculo.id_vehiculo, route.conductor.id_conductor, hours, route.requiere_descanso]
      )
      await client.query(
        `UPDATE conductores
         SET estado = 'EN_RUTA',
             horas_conduccion_acumuladas = horas_conduccion_acumuladas + $1
         WHERE id_conductor = $2`,
        [hours, route.conductor.id_conductor]
      )
    }
    await persistIndicators(client, routeId, route, baseline)
    created.push({
      id_ruta: routeId,
      distancia_km: route.distancia_km,
      duracion_minutos: route.minutos,
      co2_kg: route.co2_kg,
      costo_total: route.costo_total,
      cumplimiento_ventanas_pct: route.cumplimiento_pct,
      estado: 'PLANIFICADA',
      algoritmo_utilizado: algorithm,
      fecha: date,
      pedidos: route.secuencia.map((customer) => customer.id_pedido),
    })
  }
  return [created, []]
}

export async function persistReoptimization(client, routeId, problem, route, date, closedDeliveries = new Map()) {
  problem.evaluar_ruta(route, true)
  const baseline = baselineFor(problem, route)
  const { rows: previousRows } = await client.query(
    `SELECT distancia_km, duracion_minutos, costo_total, co2_kg
     FROM rutas WHERE id_ruta = $1`,
    [routeId]
  )
  const previous = previousRows[0] ?? null
  await client.query('DELETE FROM paradas_ruta WHERE id_ruta = $1', [routeId])
  await client.query('DELETE FROM ruta_pedidos WHERE id_ruta = $1', [routeId])
  await client.query('DELETE FROM indicadores_ruta WHERE id_ruta = $1', [routeId])

  const routeOriginPoint = routeOrigin(problem, route)
  let order = 1
  await insertStop(client, {
    routeId, order, lat: routeOriginPoint[0], lon: routeOriginPoint[1],
    time: routeTime(route, date, true), type: 'INICIO',
  })
  let minute = startMinute(route)
  const closed = closedDeliveries instanceof Map
    ? [...closedDeliveries.entries()]
    : Object.entries(closedDeliveries)
  for (const [id, data] of closed.sort((a, b) =>
    Number(a[1].orden_visita ?? 0) - Number(b[1].orden_visita ?? 0)
  )) {
    order += 1
    const actualTime = data.hora_llegada_real ?? timestampAtMinute(date, minute)
    await insertStop(client, {
      routeId, order, lat: data.latitud, lon: data.longitud,
      time: actualTime, service: Math.trunc(serviceMinutes()),
      type: data.tipo_parada ?? 'ENTREGA',
    })
    await client.query(
      `INSERT INTO ruta_pedidos (
         id_ruta, id_pedido, orden_visita, hora_llegada_estimada,
         hora_llegada_real, tiempo_espera, penalizacion, estado_entrega
       ) VALUES ($1,$2,$3,$4,$5,0,0,$6)`,
      [routeId, id, order, actualTime, data.hora_llegada_real ?? null, data.estado_entrega]
    )
  }
  for (let index = 0; index < route.secuencia.length; index += 1) {
    const customer = route.secuencia[index]
    if (route.posiciones_descanso.includes(index)) {
      order += 1
      await insertStop(client, {
        routeId, order, lat: routeOriginPoint[0], lon: routeOriginPoint[1],
        time: timestampAtMinute(date, customer.hora_llegada - Math.trunc(serviceMinutes())),
        wait: PARAMS.mandatoryBreakHours * 60, type: 'DESCANSO',
      })
    }
    order += 1
    const arrival = timestampAtMinute(date, customer.hora_llegada - Math.trunc(serviceMinutes()))
    await insertStop(client, {
      routeId, order, lat: customer.latitud, lon: customer.longitud,
      time: arrival, service: Math.trunc(serviceMinutes()),
      wait: Math.trunc(customer.tiempo_espera), type: 'ENTREGA',
    })
    await client.query(
      `INSERT INTO ruta_pedidos (
         id_ruta, id_pedido, orden_visita, hora_llegada_estimada,
         tiempo_espera, penalizacion, estado_entrega
       ) VALUES ($1,$2,$3,$4,$5,$6,'PENDIENTE')`,
      [routeId, customer.id_pedido, order, arrival, Math.trunc(customer.tiempo_espera), customer.penalizacion]
    )
    minute = customer.hora_llegada
  }
  order += 1
  await insertStop(client, {
    routeId, order, lat: routeOriginPoint[0], lon: routeOriginPoint[1],
    time: routeTime(route, date, false), type: 'FIN',
  })

  const costs = tco(route)
  await client.query(
    `UPDATE rutas SET
       hora_inicio=$1, hora_fin=$2, distancia_km=$3, duracion_minutos=$4,
       distancia_base_km=$5, duracion_base_minutos=$6, combustible_litros=$7,
       costo_combustible=$8, costo_mantenimiento=$9, costo_conductor=$10,
       costo_depreciacion=$11, costo_seguro=$12, costo_total=$13, co2_kg=$14,
       co2_evitable_kg=$15, cumplimiento_ventanas_pct=$16,
       estado='REOPTIMIZADA'
     WHERE id_ruta=$17`,
    [
      routeTime(route, date, true), routeTime(route, date, false),
      route.distancia_km, route.minutos, round(baseline.distancia_base_km),
      round(baseline.duracion_base_minutos), costs.combustible_litros,
      costs.costo_combustible, costs.costo_mantenimiento, costs.costo_conductor,
      costs.costo_depreciacion, costs.costo_seguro, route.costo_total,
      route.co2_kg, round(Math.max(0, baseline.co2_base_kg - route.co2_kg)),
      route.cumplimiento_pct, routeId,
    ]
  )
  if (route.conductor) {
    await client.query(
      `UPDATE asignaciones
       SET horas_conduccion=$1, descanso_requerido=$2 WHERE id_ruta=$3`,
      [round(route.minutos / 60), route.requiere_descanso, routeId]
    )
  }
  await persistIndicators(client, routeId, route, baseline)
  const difference = (value, column) => previous
    ? round(Number(value) - Number(previous[column] ?? 0)) : null
  return {
    id_ruta: routeId,
    distancia_km: route.distancia_km,
    duracion_minutos: route.minutos,
    costo_total: route.costo_total,
    co2_kg: route.co2_kg,
    cumplimiento_ventanas_pct: route.cumplimiento_pct,
    orden_pedidos: route.secuencia.map((customer) => customer.id_pedido),
    cambio: {
      distancia_km: difference(route.distancia_km, 'distancia_km'),
      duracion_minutos: difference(route.minutos, 'duracion_minutos'),
      costo_total: difference(route.costo_total, 'costo_total'),
      co2_kg: difference(route.co2_kg, 'co2_kg'),
    },
  }
}

export { sequentialDistance, sequentialDuration, timestampAtMinute }
