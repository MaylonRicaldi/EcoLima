import { getToken } from './auth'

const API_URL = 'http://localhost:8000'

function extraerError(data) {
  const detalle = data.detail

  if (typeof detalle === 'string') {
    return detalle
  }

  if (Array.isArray(detalle)) {
    const texto = detalle
      .map((item) =>
        (item.msg || item.detail || '').replace(/^Value error,\s*/, '')
      )
      .filter(Boolean)
      .join(' | ')

    if (texto) {
      return texto
    }
  }

  return 'Error en la solicitud'
}

async function solicitud(endpoint, opciones = {}) {
  const token = getToken()

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opciones.headers || {}),
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(extraerError(data))
  }

  return data
}

/* ---------------------------------------------------------------- *
 * Rutas y optimización (HU-06)
 * ---------------------------------------------------------------- */

export async function listarRutas(estado) {
  const filtro = estado ? `?estado=${estado}` : ''

  return solicitud(`/rutas${filtro}`)
}

export async function obtenerRuta(id) {
  return solicitud(`/rutas/${id}`)
}

export async function optimizarRutas(datos) {
  return solicitud('/rutas/optimizar', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export async function reoptimizarRuta(id, datos) {
  return solicitud(`/rutas/${id}/reoptimizar`, {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export async function cambiarEstadoRuta(id, estado) {
  return solicitud(`/rutas/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  })
}

export async function actualizarEntrega(
  idRuta,
  idPedido,
  estadoEntrega,
) {
  return solicitud(`/rutas/${idRuta}/pedidos/${idPedido}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado_entrega: estadoEntrega }),
  })
}

export async function evaluarReoptimizacion(idRuta) {
  return solicitud(`/rutas/${idRuta}/evaluar-reoptimizacion`)
}

export async function rutasPendientesReoptimizacion() {
  return solicitud('/rutas/pendientes-reoptimizacion')
}

/* ---------------------------------------------------------------- *
 * Asignaciones (HU-06)
 * ---------------------------------------------------------------- */

export async function listarAsignaciones(estado) {
  const filtro = estado ? `?estado=${estado}` : ''

  return solicitud(`/asignaciones${filtro}`)
}

export async function crearAsignacion(datos) {
  return solicitud('/asignaciones', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export async function cambiarEstadoAsignacion(id, estado) {
  return solicitud(`/asignaciones/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  })
}

/* ---------------------------------------------------------------- *
 * Tráfico e incidentes (HU-08)
 * ---------------------------------------------------------------- */

export async function listarTrafico(nivel) {
  const filtro = nivel ? `?nivel=${nivel}` : ''

  return solicitud(`/trafico${filtro}`)
}

export async function registrarTrafico(datos) {
  return solicitud('/trafico', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export async function listarIncidentes(estado) {
  const filtro = estado ? `?estado=${estado}` : ''

  return solicitud(`/incidentes${filtro}`)
}

export async function registrarIncidente(datos) {
  return solicitud('/incidentes', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export async function cambiarEstadoIncidente(id, estado) {
  return solicitud(`/incidentes/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  })
}

/* ---------------------------------------------------------------- *
 * Indicadores y sostenibilidad (HU-09, HU-10, HU-11)
 * ---------------------------------------------------------------- */

export async function obtenerDashboard() {
  return solicitud('/dashboard')
}

export async function listarIndicadores() {
  return solicitud('/indicadores')
}

export async function listarCompensaciones() {
  return solicitud('/sostenibilidad/compensacion')
}

export async function calcularCompensacion() {
  return solicitud('/sostenibilidad/compensacion', {
    method: 'POST',
  })
}

export async function obtenerImpactoAmbiental() {
  return solicitud('/sostenibilidad/impacto')
}

export async function listarReportes(tipo) {
  const filtro = tipo ? `?tipo=${tipo}` : ''

  return solicitud(`/reportes${filtro}`)
}

export async function generarReporte(tipo, idRuta) {
  const params = new URLSearchParams({ tipo })

  if (idRuta) {
    params.append('id_ruta', idRuta)
  }

  return solicitud(`/reportes?${params.toString()}`, {
    method: 'POST',
  })
}

export async function obtenerReporteSostenibilidad(idRuta) {
  return solicitud(
    `/reportes/sostenibilidad?id_ruta=${idRuta}`
  )
}

export async function obtenerReporteConsolidado() {
  return solicitud('/reportes/consolidado')
}