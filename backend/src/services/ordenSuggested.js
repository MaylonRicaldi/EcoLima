import {
  defaultDepot,
  drivingMinutes,
  roadDistanceKm,
  referenceSpeed,
  toHour,
} from './calculations.js'
import { PARAMS } from '../core/parameters.js'

const URGENCY_MARGIN_MINUTES = 30
export const MOTIVO_MAS_CERCA = 'MAS_CERCA'
export const MOTIVO_URGENTE_ACTUAL = 'URGENTE_ACTUAL'
export const MOTIVO_URGENTE_NUEVO = 'URGENTE_NUEVO'
export const MOTIVO_MAS_LEJOS = 'MAS_LEJOS'

function minutesOfDay(value) {
  const parsed = toHour(value)
  return parsed[0] * 60 + parsed[1]
}

function urgent(windowEnd, tolerance, travelMinutes, elapsedMinutes) {
  return windowEnd + tolerance - elapsedMinutes - travelMinutes
    <= URGENCY_MARGIN_MINUTES
}

async function travel(roads, latitude1, longitude1, latitude2, longitude2) {
  const matrix = await roads?.matrix([[latitude1, longitude1], [latitude2, longitude2]])
  if (matrix?.km && matrix.minutes?.[0]?.[1] > 0) {
    return {
      km: Number(matrix.km[0][1]),
      minutes: Number(matrix.minutes[0][1]),
    }
  }
  const km = roadDistanceKm(latitude1, longitude1, latitude2, longitude2)
  return { km, minutes: drivingMinutes(km, referenceSpeed(10), 1) }
}

async function currentPosition(pool, routeId) {
  const { rows: completed } = await pool.query(
    `SELECT pe.latitud, pe.longitud
     FROM ruta_pedidos rp
     INNER JOIN pedidos pe ON pe.id_pedido = rp.id_pedido
     WHERE rp.id_ruta = $1 AND rp.estado_entrega IN ('ENTREGADO','FALLIDO')
     ORDER BY rp.hora_llegada_real DESC NULLS LAST, rp.orden_visita DESC
     LIMIT 1`,
    [routeId]
  )
  if (completed[0]) {
    return {
      latitud: Number(completed[0].latitud),
      longitud: Number(completed[0].longitud),
      desde: 'última entrega',
    }
  }
  const { rows: starts } = await pool.query(
    `SELECT latitud, longitud FROM paradas_ruta
     WHERE id_ruta = $1 AND tipo_parada = 'INICIO'
     ORDER BY orden LIMIT 1`,
    [routeId]
  )
  if (starts[0]) {
    return {
      latitud: Number(starts[0].latitud),
      longitud: Number(starts[0].longitud),
      desde: 'salida de la ruta',
    }
  }
  const { rows: depot } = await pool.query(
    `SELECT direccion, latitud, longitud FROM ubicaciones
     WHERE tipo = 'LOCAL_OPERATIVA' LIMIT 1`
  )
  const place = depot[0] ?? defaultDepot()
  return {
    latitud: Number(place.latitud),
    longitud: Number(place.longitud),
    desde: 'local de la empresa',
  }
}

async function nextPending(pool, routeId) {
  const { rows } = await pool.query(
    `SELECT rp.id_pedido, rp.orden_visita, rp.hora_llegada_estimada,
            pe.direccion_entrega, pe.latitud, pe.longitud,
            vt.hora_fin, vt.tolerancia_minutos, vt.penalizacion_por_minuto
     FROM ruta_pedidos rp
     INNER JOIN pedidos pe ON pe.id_pedido = rp.id_pedido
     INNER JOIN ventanas_tiempo vt ON vt.id_ventana = pe.id_ventana_tiempo
     WHERE rp.id_ruta = $1 AND rp.estado_entrega = 'PENDIENTE'
     ORDER BY rp.orden_visita LIMIT 1`,
    [routeId]
  )
  return rows[0] ?? null
}

async function findOrder(pool, orderId) {
  const { rows } = await pool.query(
    `SELECT p.id_pedido, p.direccion_entrega, p.latitud, p.longitud,
            p.prioridad, vt.hora_inicio, vt.hora_fin,
            vt.tolerancia_minutos, vt.penalizacion_por_minuto
     FROM pedidos p
     INNER JOIN ventanas_tiempo vt ON vt.id_ventana = p.id_ventana_tiempo
     WHERE p.id_pedido = $1`,
    [orderId]
  )
  return rows[0] ?? null
}

function summary(row, km, minutes, isUrgent) {
  const end = minutesOfDay(row.hora_fin)
  return {
    id_pedido: row.id_pedido,
    direccion: row.direccion_entrega,
    latitud: Number(row.latitud),
    longitud: Number(row.longitud),
    km: Number(Number(km).toFixed(2)),
    minutos: Number(Number(minutes).toFixed(1)),
    hora_fin: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
    urgente: isUrgent,
    penalizacion_por_minuto: Number(row.penalizacion_por_minuto ?? 0),
  }
}

export async function evaluateSuggestedOrder(pool, routeId, orderId, {
  roads,
  now = new Date(),
} = {}) {
  const position = await currentPosition(pool, routeId)
  const current = await nextPending(pool, routeId)
  const next = await findOrder(pool, orderId)
  if (!next) {
    return {
      recomendacion: 'MANTENER',
      motivo: MOTIVO_MAS_LEJOS,
      puede_anticipar: false,
      detalle: 'El pedido no existe.',
    }
  }

  const currentTravel = current
    ? await travel(roads, position.latitud, position.longitud, Number(current.latitud), Number(current.longitud))
    : { km: 0, minutes: 0 }
  const nextTravel = await travel(roads, position.latitud, position.longitud, Number(next.latitud), Number(next.longitud))
  const elapsed = now.getHours() * 60 + now.getMinutes() - PARAMS.operatingStartHour * 60
  const nextUrgent = urgent(
    minutesOfDay(next.hora_fin),
    Number(next.tolerancia_minutos ?? 0),
    nextTravel.minutes,
    elapsed
  )
  const currentUrgent = current
    ? urgent(
      minutesOfDay(current.hora_fin),
      Number(current.tolerancia_minutos ?? 0),
      currentTravel.minutes,
      elapsed
    ) : false

  let recommendation
  let reason
  if (nextUrgent && !currentUrgent) {
    recommendation = 'ANTICIPAR'
    reason = MOTIVO_URGENTE_NUEVO
  } else if (currentUrgent && !nextUrgent) {
    recommendation = 'MANTENER'
    reason = MOTIVO_URGENTE_ACTUAL
  } else if (nextTravel.minutes < currentTravel.minutes) {
    recommendation = 'ANTICIPAR'
    reason = MOTIVO_MAS_CERCA
  } else {
    recommendation = 'MANTENER'
    reason = MOTIVO_MAS_LEJOS
  }
  return {
    recomendacion: recommendation,
    motivo: reason,
    puede_anticipar: current !== null,
    posicion_actual: { latitud: position.latitud, longitud: position.longitud },
    desde: position.desde,
    actual: current
      ? summary(current, currentTravel.km, currentTravel.minutes, currentUrgent)
      : null,
    nuevo: summary(next, nextTravel.km, nextTravel.minutes, nextUrgent),
    gana_por: {
      minutos: Number((nextTravel.minutes - currentTravel.minutes).toFixed(1)),
      km: Number((nextTravel.km - currentTravel.km).toFixed(2)),
    },
    margen_urgencia_minutos: URGENCY_MARGIN_MINUTES,
  }
}

export {
  currentPosition as getCurrentPosition,
  nextPending as getNextPending,
  minutesOfDay,
}
