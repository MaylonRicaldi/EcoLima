import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  login,
  logout,
  getUsuario,
} from './services/auth'

import escenaEco from './assets/escena-eco.svg'

import Vehiculos from './pages/Vehiculos'
import Conductores from './pages/Conductores'
import Usuarios from './pages/Usuarios'
import Clientes from './pages/Clientes'
import Pedidos from './pages/Pedidos'
import Rutas from './pages/Rutas'
import Dashboard from './pages/Dashboard'

import './App.css'


/* Módulos visibles por rol. Solo controla la navegación del frontend:
   la autorización real siempre se aplica en el backend. */
const MODULOS_POR_ROL = {
  ADMIN: [
    '/dashboard',
    '/vehiculos',
    '/conductores',
    '/clientes',
    '/pedidos',
    '/rutas',
    '/usuarios',
  ],
  OPERADOR: [
    '/dashboard',
    '/vehiculos',
    '/conductores',
    '/clientes',
    '/pedidos',
    '/rutas',
  ],
  CONDUCTOR: ['/vehiculos', '/rutas'],
  AUDITOR: [
    '/dashboard',
    '/vehiculos',
    '/conductores',
    '/clientes',
    '/pedidos',
    '/rutas',
    '/usuarios',
  ],
  CLIENTE: ['/pedidos'],
}


function puedeVerModulo(rol, ruta) {
  const permitidos = MODULOS_POR_ROL[rol] || []

  return permitidos.includes(ruta)
}


const TIEMPO_INACTIVIDAD = 30 * 60 * 1000

/* Catálogo de módulos del sistema, en el orden en que se muestran */
const MODULOS = [
  ['/dashboard', 'Dashboard e indicadores'],
  ['/vehiculos', 'Gestión de vehículos'],
  ['/conductores', 'Gestión de conductores'],
  ['/clientes', 'Gestión de clientes'],
  ['/pedidos', 'Gestión de pedidos'],
  ['/rutas', 'Optimización y mapa de rutas'],
  ['/usuarios', 'Gestión de usuarios'],
]

function ModulosPermitidos({ rol }) {
  const visibles = MODULOS.filter(([ruta]) =>
    puedeVerModulo(rol, ruta)
  )

  if (visibles.length === 0) {
    return null
  }

  return (
    <nav className="modulos">
      {visibles.map(([ruta, texto]) => (
        <p key={ruta}>
          <Link to={ruta}>{texto}</Link>
        </p>
      ))}
    </nav>
  )
}


/* Barra superior: siempre visible en las pantallas privadas.
   Cierra sesión (arriba a la izquierda) y vuelve a la vista anterior. */
function BarraSuperior({ onCerrarSesion }) {
  const navigate = useNavigate()

  function manejarRetroceso() {
    const indice = window.history.state?.idx ?? 0

    if (indice > 1) {
      navigate(-1)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <header className="barra-superior">

      <div className="barra-superior-acciones">

        <button
          type="button"
          className="boton-cerrar-sesion"
          onClick={onCerrarSesion}
        >
          Cerrar sesión
        </button>

        <button
          type="button"
          className="boton-retroceso"
          onClick={manejarRetroceso}
        >
          <span aria-hidden="true">←</span>

          Volver
        </button>

      </div>

      <span className="barra-superior-marca">
        EcoLogística Lima
      </span>

    </header>
  )
}


function ConBarra({ onCerrarSesion, children }) {
  return (
    <>
      <BarraSuperior onCerrarSesion={onCerrarSesion} />

      {children}
    </>
  )
}


function AccesoDenegado() {
  return (
    <main>
      <h1>Acceso denegado</h1>

      <section>
        <h2>No tiene permisos</h2>

        <p>
          Su rol no tiene acceso a este módulo.
          Comuníquese con un administrador si
          necesita la funcionalidad.
        </p>

        <div className="form-actions">
          <Link to="/dashboard">
            Volver al panel
          </Link>
        </div>
      </section>
    </main>
  )
}


function AppContenido() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const [usuario, setUsuario] = useState(() => {
    return getUsuario()
  })


  async function handleLogin(event) {
    event.preventDefault()

    setError('')
    setCargando(true)

    try {
      const data = await login(email, password)

      setUsuario(data)
      setPassword('')

      navigate('/dashboard')

    } catch (err) {
      setError(err.message)

    } finally {
      setCargando(false)
    }
  }


  function handleLogout() {
    logout()

    setUsuario(null)
    setEmail('')
    setPassword('')
    setError('')

    navigate('/')
  }


  useEffect(() => {
    if (!usuario) {
      return
    }

    let temporizador

    function reiniciarTemporizador() {
      clearTimeout(temporizador)

      temporizador = setTimeout(() => {
        logout()

        setUsuario(null)
        setEmail('')
        setPassword('')

        setError(
          'La sesión expiró por 30 minutos de inactividad.'
        )

        navigate('/')
      }, TIEMPO_INACTIVIDAD)
    }


    const eventos = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ]


    eventos.forEach((evento) => {
      window.addEventListener(
        evento,
        reiniciarTemporizador
      )
    })


    reiniciarTemporizador()


    return () => {
      clearTimeout(temporizador)

      eventos.forEach((evento) => {
        window.removeEventListener(
          evento,
          reiniciarTemporizador
        )
      })
    }

  }, [usuario, navigate])


  return (
    <Routes>

      {/* LOGIN */}
      <Route
        path="/usuarios"
        element={
          usuario ? (
            puedeVerModulo(usuario.rol, '/usuarios') ? (
              <ConBarra onCerrarSesion={handleLogout}>
                <Usuarios />
              </ConBarra>
            ) : (
              <AccesoDenegado />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/"
        element={
          usuario ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <main>

              <img
                className="escena-eco"
                src={escenaEco}
                alt="Ruta de entregas en Lima con vehículo eco y cerros verdes"
                width="800"
                height="500"
              />

              <h1>EcoLogística Lima</h1>

              <h2>Iniciar sesión</h2>

              <form onSubmit={handleLogin}>

                <div>
                  <label htmlFor="email">
                    Correo electrónico
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    required
                  />
                </div>


                <div>
                  <label htmlFor="password">
                    Contraseña
                  </label>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    required
                  />
                </div>


                {error && (
                  <p>{error}</p>
                )}


                <button
                  type="submit"
                  disabled={cargando}
                >
                  {cargando
                    ? 'Ingresando...'
                    : 'Iniciar sesión'}
                </button>

              </form>

            </main>
          )
        }
      />


      {/* PANEL / DASHBOARD (HU-09) */}

      <Route
        path="/dashboard"
        element={
          usuario ? (
            puedeVerModulo(usuario.rol, '/dashboard') ? (
              <ConBarra onCerrarSesion={handleLogout}>

                <main>

                  <div className="pagina-header">
                    <div>
                      <h1>EcoLogística Lima</h1>
                      <p>
                        Sesión de{' '}
                        <strong>{usuario.nombre}</strong>{' '}
                        ({usuario.rol})
                      </p>
                    </div>
                  </div>

                  <Dashboard />

                  <section>
                    <h2>Módulos disponibles</h2>

                    <ModulosPermitidos rol={usuario.rol} />
                  </section>

                </main>

              </ConBarra>
            ) : (
              <AccesoDenegado />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />


      {/* VEHÍCULOS */}

      <Route
        path="/vehiculos"
        element={
          usuario ? (
            puedeVerModulo(usuario.rol, '/vehiculos') ? (
              <ConBarra onCerrarSesion={handleLogout}>
                <Vehiculos />
              </ConBarra>
            ) : (
              <AccesoDenegado />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/conductores"
        element={
          usuario ? (
            puedeVerModulo(usuario.rol, '/conductores') ? (
              <ConBarra onCerrarSesion={handleLogout}>
                <Conductores />
              </ConBarra>
            ) : (
              <AccesoDenegado />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/clientes"
        element={
          usuario ? (
            puedeVerModulo(usuario.rol, '/clientes') ? (
              <ConBarra onCerrarSesion={handleLogout}>
                <Clientes />
              </ConBarra>
            ) : (
              <AccesoDenegado />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/pedidos"
        element={
          usuario ? (
            puedeVerModulo(usuario.rol, '/pedidos') ? (
              <ConBarra onCerrarSesion={handleLogout}>
                <Pedidos />
              </ConBarra>
            ) : (
              <AccesoDenegado />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route
        path="/rutas"
        element={
          usuario ? (
            puedeVerModulo(usuario.rol, '/rutas') ? (
              <ConBarra onCerrarSesion={handleLogout}>
                <Rutas />
              </ConBarra>
            ) : (
              <AccesoDenegado />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />


      {/* RUTA NO ENCONTRADA */}

      <Route
        path="*"
        element={
          <Navigate to="/" replace />
        }
      />

    </Routes>
  )
}


function App() {
  return (
    <BrowserRouter>
      <AppContenido />
    </BrowserRouter>
  )
}


export default App