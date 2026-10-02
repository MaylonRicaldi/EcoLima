const API_URL = 'http://localhost:8000'

export async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Error al iniciar sesión')
  }

  localStorage.setItem('access_token', data.access_token)

  localStorage.setItem(
    'usuario',
    JSON.stringify({
      usuario_id: data.usuario_id,
      nombre: data.nombre,
      email: data.email,
      rol: data.rol,
    }),
  )

  return data
}

export function logout() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('usuario')
}

export function getToken() {
  return localStorage.getItem('access_token')
}

export function getUsuario() {
  const usuario = localStorage.getItem('usuario')

  return usuario ? JSON.parse(usuario) : null
}

export function estaAutenticado() {
  return Boolean(getToken())
}