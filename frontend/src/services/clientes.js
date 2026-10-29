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

export async function listarClientes() {
  return solicitud('/clientes')
}

export async function obtenerCliente(id) {
  return solicitud(`/clientes/${id}`)
}

export async function crearCliente(datos) {
  return solicitud('/clientes', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export async function actualizarCliente(id, datos) {
  return solicitud(`/clientes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

export async function cambiarEstadoCliente(id, estado) {
  return solicitud(`/clientes/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  })
}

/* ------------------------------------------------------------------
 * Ventanas de tiempo (RN-005 / RN-012)
 *
 * Son intervalos [hora_inicio, hora_fin] con su tolerancia y su costo
 * por minuto de retraso. No tienen estado ni nombre: eso es lo que
 * expone el backend y lo que la tabla del DDL tiene.
 * ---------------------------------------------------------------- */

export async function listarVentanasTiempo() {
  return solicitud('/clientes/ventanas-tiempo')
}

export async function obtenerVentanaTiempo(id) {
  return solicitud(`/clientes/ventanas-tiempo/${id}`)
}

export async function crearVentanaTiempo(datos) {
  return solicitud('/clientes/ventanas-tiempo', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export async function actualizarVentanaTiempo(id, datos) {
  return solicitud(`/clientes/ventanas-tiempo/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

export async function eliminarVentanaTiempo(id) {
  return solicitud(`/clientes/ventanas-tiempo/${id}`, {
    method: 'DELETE',
  })
}

/* Sólo las horas, para el desplegable del formulario de pedidos. */
export async function listarVentanasDisponibles() {
  return solicitud('/clientes/ventanas-tiempo/disponibles')
}