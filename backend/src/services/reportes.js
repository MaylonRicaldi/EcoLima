export const REPORT_TYPES = ['SOSTENIBILIDAD', 'TCO', 'COMPENSACION', 'AUDITORIA']

function csvCell(value) {
  if (value === null || typeof value === 'undefined') return ''
  const text = String(value)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toCsv(headers, rows) {
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(',')),
  ]
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

function reportFilename(type, routeId) {
  const now = new Date()
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  const time = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('')
  const unique = `${Date.now()}-${process.pid}`
  const scope = routeId == null ? 'consolidado' : String(routeId)
  return `reporte_${type}_${scope}_${stamp}_${time}_${unique}.csv`
}

async function routeRows(pool, routeId) {
  if (routeId != null) {
    const { rows } = await pool.query(
      `SELECT r.*, v.placa, v.tipo_combustible
       FROM rutas r
       LEFT JOIN asignaciones a ON a.id_ruta = r.id_ruta
       LEFT JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
       WHERE r.id_ruta = $1`,
      [routeId],
    )
    return rows
  }
  const { rows } = await pool.query(
    `SELECT r.*, v.placa, v.tipo_combustible
     FROM rutas r
     LEFT JOIN asignaciones a ON a.id_ruta = r.id_ruta
     LEFT JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
     WHERE r.estado <> 'CANCELADA'
     ORDER BY r.fecha DESC, r.id_ruta DESC`,
  )
  return rows
}

export async function generateReportCsv({ pool, type, routeId }) {
  if (!REPORT_TYPES.includes(type)) {
    throw new TypeError('Tipo de reporte invalido')
  }

  if (routeId != null) {
    const { rows: [route] } = await pool.query(
      'SELECT id_ruta FROM rutas WHERE id_ruta = $1',
      [routeId],
    )
    if (!route) throw Object.assign(new Error('La ruta no existe'), { statusCode: 404 })
  }

  const rows = await routeRows(pool, routeId)
  let headers
  let csvRows

  if (type === 'SOSTENIBILIDAD') {
    headers = ['id_ruta', 'fecha', 'estado', 'distancia_km', 'combustible_litros', 'co2_kg', 'co2_evitable_kg', 'cumplimiento_ventanas_pct', 'placa', 'tipo_combustible']
  } else if (type === 'TCO') {
    headers = ['id_ruta', 'fecha', 'estado', 'distancia_km', 'costo_combustible', 'costo_mantenimiento', 'costo_depreciacion', 'costo_seguro', 'costo_conductor', 'costo_total', 'placa']
  } else if (type === 'COMPENSACION') {
    headers = ['id_ruta', 'fecha', 'co2_kg', 'co2_evitable_kg', 'placa', 'tipo_combustible']
  } else {
    headers = ['id_ruta', 'fecha', 'estado', 'distancia_km', 'duracion_minutos', 'combustible_litros', 'co2_kg', 'costo_total', 'cumplimiento_ventanas_pct', 'algoritmo_utilizado', 'placa']
  }
  csvRows = rows

  return {
    filename: reportFilename(type, routeId),
    content: toCsv(headers, csvRows),
  }
}
