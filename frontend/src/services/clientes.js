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