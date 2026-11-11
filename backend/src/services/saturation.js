import { haversineKm } from './calculations.js'
import { PARAMS } from '../core/parameters.js'

const milliseconds = (time) => {
  if (time == null) return null
  if (time instanceof Date) return time.getHours() * 60 + time.getMinutes()
  const [hours, minutes] = String(time).split(':').map(Number)
  return hours * 60 + minutes
}

export function minutesBetween(start, end) {
  const from = milliseconds(start)
  const to = milliseconds(end)
  if (from == null || to == null) return 0
  return Math.max(0, to - from)
}

export function minutesWithinWindow(shiftStart, shiftEnd, windowStart, windowEnd) {
  const total = minutesBetween(windowStart, windowEnd)
  if (total <= 0) return 0
  const shiftFrom = milliseconds(shiftStart) ?? 0
  const shiftTo = milliseconds(shiftEnd) ?? 1439
  const from = Math.max(shiftFrom, milliseconds(windowStart))
  const to = Math.min(shiftTo, milliseconds(windowEnd))
  if (to <= from) return 0
  return Math.min(total, to - from)
}

function timeText(value) {
  if (value instanceof Date) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
  }
  return String(value).slice(0, 5)
}

async function findWindowWithGap(pool, date, start, end, weightKg, volumeM3) {
  const { rows: drivers } = await pool.query(
    `SELECT c.hora_disponibilidad_inicio, c.hora_disponibilidad_fin,
            c.horas_max_conduccion, c.horas_conduccion_acumuladas
     FROM conductores c
     WHERE c.estado IN ('DISPONIBLE','DESCANSO')
       AND NOT EXISTS (
         SELECT 1 FROM asignaciones a JOIN rutas r ON r.id_ruta = a.id_ruta
         WHERE a.id_conductor = c.id_conductor
           AND r.estado IN ('PLANIFICADA','EN_CURSO','REOPTIMIZADA')
       )
       AND EXISTS (
         SELECT 1 FROM licencias l
         WHERE l.id_conductor = c.id_conductor
           AND l.estado = 'VIGENTE' AND l.fecha_vencimiento >= $1
       )`,
    [date]
  )

  const { rows: vehicleRows } = await pool.query(
    `SELECT COALESCE(SUM(v.capacidad_kg), 0) AS kg,
            COALESCE(SUM(v.capacidad_m3), 0) AS m3
     FROM vehiculos v
     WHERE v.estado = 'ACTIVO'
       AND NOT EXISTS (
         SELECT 1 FROM asignaciones a JOIN rutas r ON r.id_ruta = a.id_ruta
         WHERE a.id_vehiculo = v.id_vehiculo
           AND r.estado IN ('PLANIFICADA','EN_CURSO','REOPTIMIZADA')
       )`
  )
  const capacity = vehicleRows[0] ?? { kg: 0, m3: 0 }
  if (weightKg && Number(capacity.kg) < weightKg) return null
  if (volumeM3 && Number(capacity.m3) < volumeM3) return null

  const { rows: windows } = await pool.query(
    `SELECT id_ventana, hora_inicio, hora_fin, tolerancia_minutos,
            penalizacion_por_minuto, es_ocasional
     FROM ventanas_tiempo
     WHERE es_ocasional = FALSE AND hora_fin > hora_inicio`
  )
  let best = null
  let bestScore = null

  for (const window of windows) {
    if (timeText(window.hora_inicio) === timeText(start)
      && timeText(window.hora_fin) === timeText(end)) continue
    const duration = minutesBetween(window.hora_inicio, window.hora_fin)
    if (duration <= 0) continue

    let freeMinutes = 0
    for (const driver of drivers) {
      const overlap = minutesWithinWindow(
        driver.hora_disponibilidad_inicio,
        driver.hora_disponibilidad_fin,
        window.hora_inicio,
        window.hora_fin
      )
      const hoursLeft = Number(driver.horas_max_conduccion)
        - Number(driver.horas_conduccion_acumuladas)
      if (overlap > 0 && hoursLeft > 0) {
        freeMinutes += Math.min(duration, overlap)
      }
    }
    if (freeMinutes < PARAMS.minimumFreeWindowMinutes) continue

    const distance = Math.abs(milliseconds(window.hora_inicio) - milliseconds(start))
    const score = distance - freeMinutes / 60 * 30
    if (bestScore === null || score < bestScore) {
      bestScore = score
      best = window
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

export async function evaluateSaturation(
  pool,
  { date, startTime, endTime, weightKg = 0, volumeM3 = 0 }
) {
  const reasons = []
  const { rows: drivers } = await pool.query(
    `SELECT c.id_conductor, c.nombre, c.apellido, c.estado,
            c.hora_disponibilidad_inicio, c.hora_disponibilidad_fin,
            c.horas_max_conduccion, c.horas_conduccion_acumuladas,
            EXISTS (
              SELECT 1 FROM asignaciones a JOIN rutas r ON r.id_ruta = a.id_ruta
              WHERE a.id_conductor = c.id_conductor
                AND r.estado IN ('PLANIFICADA','EN_CURSO','REOPTIMIZADA')
            ) AS en_ruta,
            EXISTS (
              SELECT 1 FROM licencias l
              WHERE l.id_conductor = c.id_conductor
                AND l.estado = 'VIGENTE' AND l.fecha_vencimiento >= $1
            ) AS tiene_licencia
     FROM conductores c WHERE c.estado IN ('DISPONIBLE','DESCANSO')`,
    [date]
  )
  const availableDrivers = drivers.filter((driver) => !driver.en_ruta)
  const withLicense = availableDrivers.filter((driver) => driver.tiene_licencia)
  const onShift = withLicense.filter((driver) => minutesWithinWindow(
    driver.hora_disponibilidad_inicio,
    driver.hora_disponibilidad_fin,
    startTime,
    endTime
  ) > 0)
  const withHours = onShift.filter(
    (driver) => Number(driver.horas_max_conduccion)
      - Number(driver.horas_conduccion_acumuladas) > 0
  )
  const freeHours = withHours.reduce(
    (total, driver) => total + Number(driver.horas_max_conduccion)
      - Number(driver.horas_conduccion_acumuladas),
    0
  )

  const { rows: vehicleRows } = await pool.query(
    `SELECT v.id_vehiculo, v.placa, v.capacidad_kg, v.capacidad_m3,
            v.estado,
            EXISTS (
              SELECT 1 FROM asignaciones a JOIN rutas r ON r.id_ruta = a.id_ruta
              WHERE a.id_vehiculo = v.id_vehiculo
                AND r.estado IN ('PLANIFICADA','EN_CURSO','REOPTIMIZADA')
            ) AS en_ruta
     FROM vehiculos v WHERE v.estado = 'ACTIVO'`
  )
  const freeVehicles = vehicleRows.filter((vehicle) => !vehicle.en_ruta)
  let freeWeight = freeVehicles.reduce((sum, vehicle) => sum + Number(vehicle.capacidad_kg), 0)
  let freeVolume = freeVehicles.reduce((sum, vehicle) => sum + Number(vehicle.capacidad_m3), 0)
  const { rows: usedRows } = await pool.query(
    `SELECT COALESCE(SUM(p.peso_kg), 0) AS kg,
            COALESCE(SUM(p.volumen_m3), 0) AS m3
     FROM ruta_pedidos rp JOIN rutas r ON r.id_ruta = rp.id_ruta
     JOIN pedidos p ON p.id_pedido = rp.id_pedido
     WHERE r.estado IN ('PLANIFICADA','EN_CURSO','REOPTIMIZADA')`
  )
  freeWeight -= Number(usedRows[0]?.kg ?? 0)
  freeVolume -= Number(usedRows[0]?.m3 ?? 0)

  const dateStart = `${String(date).slice(0, 10)} 00:00:00`
  const { rows: traffic } = await pool.query(
    `SELECT segmento, latitud, longitud, nivel_congestion
     FROM trafico WHERE fecha_hora >= $1`,
    [dateStart]
  )
  const { rows: stops } = await pool.query(
    `SELECT DISTINCT p.latitud, p.longitud
     FROM paradas_ruta pr
     JOIN rutas r ON r.id_ruta = pr.id_ruta
     JOIN ruta_pedidos rp ON rp.id_ruta = r.id_ruta
     JOIN pedidos p ON p.id_pedido = rp.id_pedido
     WHERE r.fecha = $1`,
    [date]
  )

  let congested = 0
  let affected = 0
  const levels = { VERDE: 0, AMARILLO: 0, ROJO: 0 }
  for (const report of traffic) {
    if (Object.hasOwn(levels, report.nivel_congestion)) {
      levels[report.nivel_congestion] += 1
    }
    if (report.nivel_congestion === 'VERDE') continue
    congested += 1
    const nearRoute = stops.some((stop) => haversineKm(
      Number(report.latitud), Number(report.longitud),
      Number(stop.latitud), Number(stop.longitud)
    ) <= PARAMS.trafficInfluenceRadiusKm)
    if (nearRoute) affected += 1
  }

  const windowMinutes = minutesBetween(startTime, endTime)
  let capacityIssues = 0
  if (!withHours.length) {
    capacityIssues += 1
    reasons.push(
      `No hay conductores con licencia vigente y jornada libre en esa franja (${timeText(startTime)}-${timeText(endTime)})`
    )
  }
  if (!freeVehicles.length) {
    capacityIssues += 1
    reasons.push('Todos los vehículos activos ya están asignados a rutas')
  }
  if (weightKg && freeWeight < weightKg) {
    capacityIssues += 1
    reasons.push(`Quedan ${freeWeight.toFixed(0)} kg libres de carga y el pedido pide ${Number(weightKg).toFixed(0)} kg`)
  }
  if (volumeM3 && freeVolume < volumeM3) {
    capacityIssues += 1
    reasons.push(`Quedan ${freeVolume.toFixed(1)} m³ libres y el pedido pide ${Number(volumeM3).toFixed(1)} m³`)
  }

  let trafficIssues = 0
  if (congested) {
    trafficIssues += 1
    reasons.push(`Hay ${congested} tramo(s) con congestión registrada ese día`)
  }
  if (affected) {
    trafficIssues += 1
    reasons.push(`${affected} de esos tramos están sobre el recorrido de las rutas de ese día: la operación va a tardar más`)
  }

  let state
  if (!withHours.length) {
    state = 'SATURADO'
  } else {
    const coveredMinutes = withHours.reduce((sum, driver) => sum + minutesWithinWindow(
      driver.hora_disponibilidad_inicio,
      driver.hora_disponibilidad_fin,
      startTime,
      endTime
    ), 0)
    if (windowMinutes && coveredMinutes < windowMinutes * 0.5) {
      capacityIssues = Math.max(capacityIssues, 1)
      reasons.push(`Los conductores libres cubren sólo ${coveredMinutes} de los ${windowMinutes} minutos de la ventana`)
    }
    state = capacityIssues && trafficIssues
      ? 'SATURADO'
      : capacityIssues || trafficIssues ? 'AJUSTADO' : 'HOLGADO'
  }

  const suggestedWindow = capacityIssues
    ? await findWindowWithGap(pool, date, startTime, endTime, weightKg, volumeM3)
    : null
  const maxTraffic = levels.ROJO ? 'ROJO' : levels.AMARILLO ? 'AMARILLO' : null

  return {
    fecha: date,
    hora_inicio: startTime,
    hora_fin: endTime,
    estado: state,
    conductores_disponibles: withHours.length,
    conductores_en_ruta: drivers.filter((driver) => driver.en_ruta).length,
    horas_libres_totales: Number(freeHours.toFixed(2)),
    carga_kg_libre: Number(freeWeight.toFixed(2)),
    carga_m3_libre: Number(freeVolume.toFixed(2)),
    tramos_congestionados: congested,
    tramos_en_ruta_afectados: affected,
    congestion_maxima: maxTraffic,
    motivos: reasons,
    ventana_sugerida: suggestedWindow,
  }
}
