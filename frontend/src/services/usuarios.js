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

async function solicitud(url, opciones = {}) {
  const token = getToken()

  const response = await fetch(`${API_URL}${url}`, {
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

export async function listarUsuarios() {
  return solicitud('/usuarios')
}

export async function crearUsuario(datos) {
  return solicitud('/usuarios', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export async function actualizarUsuario(idUsuario, datos) {
  return solicitud(`/usuarios/${idUsuario}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

export async function cambiarEstadoUsuario(idUsuario, estado) {
  return solicitud(`/usuarios/${idUsuario}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  })
}