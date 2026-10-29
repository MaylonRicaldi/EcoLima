import { getToken, expirarSesion } from './auth'

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

  let response

  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(opciones.headers || {}),
      },
    })
  } catch {
    // fetch lanza cuando no hay nadie escuchando en el puerto. Sin
    // esto el error sale como "Failed to fetch", que no dice nada
    // útil sobre qué hacer.
    throw new Error(
      'No se pudo conectar con el servidor. Revisa que el ' +
        'backend esté corriendo en el puerto 8000.'
    )
  }

  const data = await response.json()

  if (response.status === 401) {
    expirarSesion()

    throw new Error(
      'Su sesión expiró. Ingrese nuevamente.'
    )
  }

  if (!response.ok) {
    throw new Error(extraerError(data))
  }

  return data
}

/* ---------------------------------------------------------------- *
 * Local de la empresa
 * ---------------------------------------------------------------- */

/* Dónde está el local: de aquí salen los envíos y aquí vuelven los
   vehículos de noche. */
export async function obtenerLocal() {
  return solicitud('/local')
}

/* Coloca el icono del local en el mapa. */
export async function guardarLocal(datos) {
  return solicitud('/local', {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

/* ---------------------------------------------------------------- *
 * Mapa de rutas
 * ---------------------------------------------------------------- */

/* Rutas listas para dibujar, con identificador y color por
   conductor. No se manda filtro: si quien entra es conductor, el
   servidor devuelve sólo las suyas. */
export async function obtenerMapaRutas(params = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== null && v !== undefined)
  )

  return solicitud(
    `/mapa/rutas${q.toString() ? `?${q.toString()}` : ''}`
  )
}

/* ---------------------------------------------------------------- *
 * Saturación, obstáculos y operación (Sprint 03)
 * ---------------------------------------------------------------- */

/* Si la operación da abasto para esa ventana. Informa de capacidad
   y de tráfico por separado. */
export async function consultarSaturacion({
  fecha,
  hora_inicio,
  hora_fin,
  peso_kg = 0,
  volumen_m3 = 0,
}) {
  const q = new URLSearchParams({
    fecha,
    hora_inicio,
    hora_fin,
    peso_kg: String(peso_kg || 0),
    volumen_m3: String(volumen_m3 || 0),
  })

  return solicitud(`/operacion/saturacion?${q.toString()}`)
}

/* Ventana del catálogo que sí tiene hueco. El usuario decide si la
   usa: el sistema propone, no impone. */
export async function sugerirVentana(datos) {
  return solicitud('/operacion/ventana-sugerida', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

/* ---------------------------------------------------------------- *
 * Obstáculos de la calzada (el cono)
 * ---------------------------------------------------------------- */

export async function listarObstaculos(incluirResueltos = false) {
  return solicitud(
    `/obstaculos?incluir_resueltos=${incluirResueltos}`
  )
}

export async function registrarObstaculo(datos) {
  return solicitud('/obstaculos', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export async function quitarObstaculo(id) {
  return solicitud(`/obstaculos/${id}`, { method: 'DELETE' })
}

/* Genera el recorrido desde el punto con obstrucción. Conserva el
   vehículo y el conductor de la ruta. */
export async function optimizarDesdeObstaculo(id, datos = {}) {
  return solicitud(`/obstaculos/${id}/optimizar-ruta`, {
    method: 'POST',
    body: JSON.stringify(datos),
  })
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

/* ---------------------------------------------------------------- *
 * Encargar otra orden a una ruta en marcha
 * ---------------------------------------------------------------- */

/* Mete un pedido suelto en una ruta que el conductor ya está
   haciendo. No crea otra ruta ni suelta lo que ya tenía: el pedido
   entra al final de la secuencia y la respuesta trae la recomendación
   de orden. */
export async function encargarPedido(idRuta, idPedido) {
  return solicitud(`/rutas/${idRuta}/pedidos`, {
    method: 'POST',
    body: JSON.stringify({ id_pedido: idPedido }),
  })
}

/* Consulta el orden recomendado sin cambiar nada. */
export async function consultarOrdenSugerido(idRuta, idPedido) {
  return solicitud(
    `/rutas/${idRuta}/pedidos/${idPedido}/orden-sugerido`
  )
}

/* Aplica lo recomendado: pone ese pedido el primero de lo que falta.
   Es la confirmación del usuario; hasta que no se llama, el orden no
   cambia. */
export async function anticiparPedido(idRuta, idPedido) {
  return solicitud(`/rutas/${idRuta}/pedidos/${idPedido}/anticipar`, {
    method: 'POST',
  })
}

/* Los pedidos sueltos, para ofrecerlos como órdenes nuevas a un
   conductor que ya va en camino. Viene del módulo Pedidos porque es
   el mismo dato, no una copia. */
export async function listarPedidos() {
  return solicitud('/pedidos')
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