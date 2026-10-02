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

// ============================================================
// CONDUCTORES
// ============================================================

export async function listarConductores() {
  return solicitud('/conductores')
}

export async function obtenerConductor(idConductor) {
  return solicitud(`/conductores/${idConductor}`)
}

export async function crearConductor(datos) {
  return solicitud('/conductores', {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export async function actualizarConductor(idConductor, datos) {
  return solicitud(`/conductores/${idConductor}`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

export async function cambiarEstadoConductor(idConductor, estado) {
  return solicitud(`/conductores/${idConductor}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  })
}

// ============================================================
// LICENCIAS
// ============================================================

export async function listarLicencias(idConductor) {
  return solicitud(`/conductores/${idConductor}/licencias`)
}

export async function crearLicencia(idConductor, datos) {
  return solicitud(`/conductores/${idConductor}/licencias`, {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

export async function actualizarLicencia(
  idConductor,
  idLicencia,
  datos
) {
  return solicitud(
    `/conductores/${idConductor}/licencias/${idLicencia}`,
    {
      method: 'PUT',
      body: JSON.stringify(datos),
    }
  )
}

export async function cambiarEstadoLicencia(
  idConductor,
  idLicencia,
  estado
) {
  return solicitud(
    `/conductores/${idConductor}/licencias/${idLicencia}/estado`,
    {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    }
  )
}