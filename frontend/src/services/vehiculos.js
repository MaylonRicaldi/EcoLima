import { expirarSesion } from './auth'

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

/* Convierte un error de red en un mensaje que dice qué hacer.

   fetch lanza cuando no hay nadie escuchando en el puerto, y el
   navegador solo muestra "Failed to fetch". Este servicio no usa la
   función solicitud() de los demás porque cada llamada hace su
   fetch, así que el control va aquí. */
async function pedir(url, opciones = {}) {
  try {
    const response = await fetch(`${API_URL}${url}`, {
      ...opciones,
      headers: obtenerHeaders(),
    })

    return await procesarRespuesta(response)
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        'No se pudo conectar con el servidor. Revisa que el ' +
          'backend esté corriendo en el puerto 8000.'
      )
    }

    throw err
  }
}

async function procesarRespuesta(response) {
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

export async function listarVehiculos() {
  return pedir('/vehiculos', { method: 'GET' })
}

export async function obtenerVehiculo(id) {
  return pedir(`/vehiculos/${id}`, { method: 'GET' })
}

export async function crearVehiculo(datos) {
  return pedir('/vehiculos', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export async function actualizarVehiculo(id, datos) {
  return pedir(`/vehiculos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

export async function cambiarEstadoVehiculo(id, estado) {
  return pedir(`/vehiculos/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({
      estado,
    }),
  })
}