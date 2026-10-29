import { getToken, expirarSesion } from './auth'

const API_URL = 'http://localhost:8000'

function extraerError(datos) {
  const detalle = datos.detail

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

  return 'Ocurrió un error en la solicitud'
}

async function solicitud(endpoint, opciones = {}) {
  const token = getToken()

  let respuesta

  try {
    respuesta = await fetch(`${API_URL}${endpoint}`, {
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

  const datos = await respuesta.json()

  if (respuesta.status === 401) {
    expirarSesion()

    throw new Error(
      'Su sesión expiró. Ingrese nuevamente.'
    )
  }

  if (!respuesta.ok) {
    throw new Error(extraerError(datos))
  }

  return datos
}

export async function listarPedidos() {
  return solicitud('/pedidos')
}

export async function obtenerPedido(id) {
  return solicitud(`/pedidos/${id}`)
}

export async function crearPedido(datos) {
  return solicitud('/pedidos', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export async function actualizarPedido(id, datos) {
  return solicitud(`/pedidos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

export async function cambiarEstadoPedido(id, estado) {
  return solicitud(`/pedidos/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  })
}