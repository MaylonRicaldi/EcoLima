const API_URL = 'http://localhost:8000'

export async function login(email, password) {
  let response

  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    })
  } catch {
    // fetch lanza cuando no hay nadie escuchando en el puerto. Sin
    // esto el error sale como "Failed to fetch", que no dice nada
    // útil sobre qué hacer: el backend está apagado, no es un
    // problema de usuario ni de contraseña.
    throw new Error(
      'No se pudo conectar con el servidor. Revisa que el ' +
        'backend esté corriendo en el puerto 8000.'
    )
  }

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


/**
 * Cierra la sesión cuando el backend responde 401.
 *
 * Ocurre cuando el JWT expira (30 min) o el usuario fue desactivado.
 * Sin esto la aplicación queda con errores en pantalla sin forma de
 * recuperarse, porque ninguna vista vuelve a pedir credenciales.
 */
export function expirarSesion() {
  logout()

  if (
    !window.location.search.includes('sesion=expirada')
  ) {
    window.location.assign('/?sesion=expirada')
  }
}