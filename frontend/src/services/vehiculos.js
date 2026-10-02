const API_URL = 'http://localhost:8000'

function obtenerHeaders() {
  const token = localStorage.getItem('access_token')

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

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

async function procesarRespuesta(response) {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(extraerError(data))
  }

  return data
}

export async function listarVehiculos() {
  const response = await fetch(`${API_URL}/vehiculos`, {
    method: 'GET',
    headers: obtenerHeaders(),
  })

  return procesarRespuesta(response)
}

export async function obtenerVehiculo(id) {
  const response = await fetch(`${API_URL}/vehiculos/${id}`, {
    method: 'GET',
    headers: obtenerHeaders(),
  })

  return procesarRespuesta(response)
}

export async function crearVehiculo(datos) {
  const response = await fetch(`${API_URL}/vehiculos`, {
    method: 'POST',
    headers: obtenerHeaders(),
    body: JSON.stringify(datos),
  })

  return procesarRespuesta(response)
}

export async function actualizarVehiculo(id, datos) {
  const response = await fetch(`${API_URL}/vehiculos/${id}`, {
    method: 'PUT',
    headers: obtenerHeaders(),
    body: JSON.stringify(datos),
  })

  return procesarRespuesta(response)
}

export async function cambiarEstadoVehiculo(id, estado) {
  const response = await fetch(`${API_URL}/vehiculos/${id}/estado`, {
    method: 'PATCH',
    headers: obtenerHeaders(),
    body: JSON.stringify({
      estado,
    }),
  })

  return procesarRespuesta(response)
}