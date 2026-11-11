import { DEFAULT_DEPOT, PARAMS } from '../core/parameters.js'

export async function pendingOrders(pool, limit = PARAMS.maxOrders) {
  const { rows } = await pool.query(
    `SELECT p.id_pedido, p.id_cliente, p.id_ventana_tiempo,
            p.direccion_entrega, p.latitud, p.longitud, p.peso_kg,
            p.volumen_m3, p.prioridad, p.tipo_producto, vt.hora_inicio,
            vt.hora_fin, vt.tolerancia_minutos, vt.penalizacion_por_minuto
     FROM pedidos p
     INNER JOIN ventanas_tiempo vt ON vt.id_ventana = p.id_ventana_tiempo
     LEFT JOIN ruta_pedidos rp ON rp.id_pedido = p.id_pedido
     WHERE rp.id_pedido IS NULL AND p.estado IN ('PENDIENTE','ASIGNADO')
     ORDER BY CASE p.prioridad WHEN 'EXPRESS' THEN 0
              WHEN 'ESTANDAR' THEN 1 ELSE 2 END,
              vt.hora_inicio, p.id_pedido
     LIMIT $1`,
    [limit]
  )
  return rows
}

export async function activeFleet(pool) {
  const { rows } = await pool.query(
    `SELECT v.id_vehiculo, v.placa, v.capacidad_kg, v.capacidad_m3,
            v.consumo_km_l, v.factor_co2_kg_km, v.tipo_combustible,
            v.costo_adquisicion, v.costo_soat_anual, v.costo_seguro_anual,
            v.depreciacion_anual, v.estado, t.nombre AS tipo_nombre
     FROM vehiculos v
     INNER JOIN tipos_vehiculo t ON t.id_tipo = v.id_tipo_vehiculo
     WHERE v.estado = 'ACTIVO'
     ORDER BY v.capacidad_kg DESC
     LIMIT $1`,
    [PARAMS.maxVehicles]
  )
  return rows
}

export async function availableDrivers(pool) {
  const { rows } = await pool.query(
    `SELECT c.id_conductor, c.id_usuario, c.nombre, c.apellido, c.dni,
            c.anios_experiencia, c.hora_disponibilidad_inicio,
            c.hora_disponibilidad_fin, c.horas_max_conduccion,
            c.horas_conduccion_acumuladas,
            ST_Y(c.ubicacion_inicio) AS latitud_inicio,
            ST_X(c.ubicacion_inicio) AS longitud_inicio, c.estado,
            ARRAY(
              SELECT l.categoria FROM licencias l
              WHERE l.id_conductor = c.id_conductor
                AND l.estado = 'VIGENTE'
                AND l.fecha_vencimiento >= CURRENT_DATE
            ) AS categorias_licencia
     FROM conductores c
     WHERE c.estado IN ('DISPONIBLE','DESCANSO')
       AND EXISTS (
         SELECT 1 FROM licencias l
         WHERE l.id_conductor = c.id_conductor
           AND l.estado = 'VIGENTE'
           AND l.fecha_vencimiento >= CURRENT_DATE
       )
     ORDER BY c.horas_conduccion_acumuladas ASC`
  )
  return rows
}

export async function defaultWindow(pool) {
  const { rows } = await pool.query(
    `SELECT hora_inicio, hora_fin, tolerancia_minutos,
            penalizacion_por_minuto
     FROM ventanas_tiempo ORDER BY id_ventana LIMIT 1`
  )
  return rows[0] ?? null
}

export async function currentTraffic(pool) {
  const { rows } = await pool.query(
    `SELECT t.latitud, t.longitud, t.nivel_congestion, t.segmento
     FROM trafico t
     WHERE t.fecha_hora = (SELECT MAX(fecha_hora) FROM trafico)`
  )
  return rows
}

export async function activeIncidents(pool) {
  const { rows } = await pool.query(
    `SELECT i.id_incidente, i.tipo, i.descripcion, i.latitud,
            i.longitud, i.nivel, i.fecha_hora
     FROM incidentes i WHERE i.estado = 'ACTIVO'`
  )
  return rows
}

export async function operationalDepot(pool) {
  const { rows } = await pool.query(
    `SELECT direccion, latitud, longitud FROM ubicaciones
     WHERE tipo = 'LOCAL_OPERATIVA' LIMIT 1`
  )
  if (rows[0]) {
    return {
      latitud: Number(rows[0].latitud),
      longitud: Number(rows[0].longitud),
      direccion: rows[0].direccion,
      origen: 'registrado',
    }
  }
  return { ...DEFAULT_DEPOT, origen: 'respaldo' }
}

export async function updateDepot(client, direccion, latitud, longitud) {
  await client.query(`DELETE FROM ubicaciones WHERE tipo = 'LOCAL_OPERATIVA'`)
  const { rows } = await client.query(
    `INSERT INTO ubicaciones
       (direccion, referencia, latitud, longitud, geom, tipo)
     VALUES ($1, 'Local de la empresa. Punto de partida y de retorno.',
       $2, $3, ST_SetSRID(ST_MakePoint($3, $2), 4326), 'LOCAL_OPERATIVA')
     RETURNING id_ubicacion, direccion, latitud, longitud`,
    [direccion, latitud, longitud]
  )
  return rows[0]
}

export async function driversWithRoutesOnDate(pool, date) {
  const { rows } = await pool.query(
    `SELECT DISTINCT a.id_conductor
     FROM asignaciones a INNER JOIN rutas r ON r.id_ruta = a.id_ruta
     WHERE r.fecha = $1 AND r.estado <> 'CANCELADA'`,
    [date]
  )
  return new Set(rows.map((row) => row.id_conductor))
}

export async function clearPreviousPlan(client, routeId) {
  await client.query('DELETE FROM paradas_ruta WHERE id_ruta = $1', [routeId])
  await client.query('DELETE FROM asignaciones WHERE id_ruta = $1', [routeId])
  await client.query('DELETE FROM ruta_pedidos WHERE id_ruta = $1', [routeId])
}

export async function ordersForRoute(pool, routeId) {
  const { rows } = await pool.query(
    `SELECT p.id_pedido, p.id_cliente, p.direccion_entrega, p.latitud,
            p.longitud, p.peso_kg, p.volumen_m3, p.prioridad,
            p.tipo_producto, vt.hora_inicio, vt.hora_fin,
            vt.tolerancia_minutos, vt.penalizacion_por_minuto,
            rp.orden_visita
     FROM ruta_pedidos rp
     INNER JOIN pedidos p ON p.id_pedido = rp.id_pedido
     INNER JOIN ventanas_tiempo vt ON vt.id_ventana = p.id_ventana_tiempo
     WHERE rp.id_ruta = $1 ORDER BY rp.orden_visita`,
    [routeId]
  )
  return rows
}

export async function vehicleForRoute(pool, routeId) {
  const { rows } = await pool.query(
    `SELECT v.id_vehiculo, v.placa, v.capacidad_kg, v.capacidad_m3,
            v.consumo_km_l, v.factor_co2_kg_km, v.tipo_combustible,
            v.costo_adquisicion, v.costo_soat_anual, v.costo_seguro_anual,
            v.depreciacion_anual, v.estado, t.nombre AS tipo_nombre
     FROM asignaciones a
     INNER JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
     INNER JOIN tipos_vehiculo t ON t.id_tipo = v.id_tipo_vehiculo
     WHERE a.id_ruta = $1`,
    [routeId]
  )
  return rows[0] ?? null
}

export async function closedDeliveriesForRoute(pool, routeId) {
  const { rows } = await pool.query(
    `SELECT rp.id_pedido, rp.orden_visita, rp.estado_entrega,
            rp.hora_llegada_real, p.latitud, p.longitud
     FROM ruta_pedidos rp
     INNER JOIN pedidos p ON p.id_pedido = rp.id_pedido
     WHERE rp.id_ruta = $1 AND rp.estado_entrega IN ('ENTREGADO','FALLIDO')`,
    [routeId]
  )
  return new Map(rows.map((row) => [row.id_pedido, row]))
}

export async function activeObstacles(pool) {
  const { rows } = await pool.query(
    `SELECT id_obstaculo, tipo, descripcion, latitud, longitud, nivel, resuelto
     FROM obstaculos WHERE resuelto = FALSE`
  )
  return rows
}

export async function driverForRoute(pool, routeId) {
  const { rows } = await pool.query(
    `SELECT c.id_conductor, c.id_usuario, c.nombre, c.apellido,
            c.hora_disponibilidad_inicio, c.hora_disponibilidad_fin,
            c.horas_max_conduccion, c.horas_conduccion_acumuladas,
            ST_Y(c.ubicacion_inicio) AS latitud_inicio,
            ST_X(c.ubicacion_inicio) AS longitud_inicio, c.estado,
            ARRAY(
              SELECT l.categoria FROM licencias l
              WHERE l.id_conductor = c.id_conductor
                AND l.estado = 'VIGENTE'
                AND l.fecha_vencimiento >= CURRENT_DATE
            ) AS categorias_licencia
     FROM asignaciones a
     INNER JOIN conductores c ON c.id_conductor = a.id_conductor
     WHERE a.id_ruta = $1`,
    [routeId]
  )
  return rows[0] ?? null
}
