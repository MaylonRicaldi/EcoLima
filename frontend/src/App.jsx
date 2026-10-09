import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import {
  login,
  logout,
  getUsuario,
} from './services/auth'

import BarraLateral from './components/BarraLateral'

import Vehiculos from './pages/Vehiculos'
import Conductores from './pages/Conductores'
import Clientes from './pages/Clientes'
import Pedidos from './pages/Pedidos'
import Rutas from './pages/Rutas'
import Operacion from './pages/Operacion'
import Conductor from './pages/Conductor'
import Dashboard from './pages/Dashboard'

import './App.css'
import './BarraLateral.css'


/* Módulos visibles por rol. Sólo controla la navegación del
   frontend: la autorización real siempre se aplica en el backend.

   No está el módulo de usuarios: el sistema tiene una sola cuenta,
   la del administrador, y todo lo demás lo maneja ella. */
const MODULOS_POR_ROL = {
  ADMIN: [
    '/dashboard',
    '/vehiculos',
    '/conductores',
    '/clientes',
    '/pedidos',
    '/rutas',
    '/operacion',
  ],
  OPERADOR: [
    '/dashboard',
    '/vehiculos',
    '/conductores',
    '/clientes',
    '/pedidos',
    '/rutas',
    '/operacion',
  ],
  CONDUCTOR: ['/conductor', '/pedidos', '/operacion'],
  AUDITOR: [
    '/dashboard',
    '/vehiculos',
    '/conductores',
    '/clientes',
    '/pedidos',
    '/rutas',
    '/operacion',
  ],
  CLIENTE: ['/pedidos'],
}


/* Catálogo de módulos. El dashboard va primero porque es la
   pantalla principal de todo el sistema. */
const MODULOS = [
  ['/dashboard', 'Dashboard', '📊'],
  ['/vehiculos', 'Vehículos', '🚚'],
  ['/conductores', 'Conductores', '🧑‍✈️'],
  ['/clientes', 'Clientes', '🏪'],
  ['/pedidos', 'Pedidos', '📦'],
  ['/rutas', 'Rutas', '🗺️'],
  ['/operacion', 'Operación', '🚦'],
  ['/conductor', 'Mi ruta', '🧭'],
]


function puedeVerModulo(rol, ruta) {
  const permitidos = MODULOS_POR_ROL[rol] || []

  return permitidos.includes(ruta)
}


const TIEMPO_INACTIVIDAD = 30 * 60 * 1000


/* ============================================================
   Estructura de la aplicación: barra lateral de módulos +
   barra de contenido + la vista de la ruta activa.
   ============================================================ */

function Layout({ usuario, onCerrarSesion, children }) {
  const navigate = useNavigate()
  const ubicacion = useLocation()

  const [plegada, setPlegada] = useState(() => {
    /* En pantallas grandes se arranca plegada para dejarle espacio
       a las tablas; en móvil arranca cerrada porque es un cajón. */
    return window.matchMedia('(max-width: 60rem)').matches
  })

  const visibles = MODULOS.filter(([ruta]) =>
    puedeVerModulo(usuario.rol, ruta)
  )

  const actual = MODULOS.find(([ruta]) => ruta === ubicacion.pathname)

  const enMovil = window.matchMedia('(max-width: 60rem)').matches

  function manejarRetroceso() {
    const indice = window.history.state?.idx ?? 0

    if (indice > 1) {
      navigate(-1)
    } else {
      navigate('/dashboard')
    }
  }


  return (
    <div className="app-shell">

      {enMovil && !plegada && (
        <div
          className="barra-velo"
          onClick={() => setPlegada(true)}
        />
      )}

      <BarraLateral
        usuario={usuario}
        modulos={visibles}
        rutaActiva={ubicacion.pathname}
        plegada={plegada}
        onPlegar={() => setPlegada((valor) => !valor)}
        onCerrarSesion={onCerrarSesion}
        onNavegar={() => {
          if (enMovil) {
            setPlegada(true)
          }
        }}
      />

      <div className="app-principal">

        <header className="barra-contenido">
          <div className="barra-contenido-ruta">
            {actual ? (
              <>
                {actual[2]} {actual[1]}
              </>
            ) : (
              'EcoLogística Lima'
            )}
          </div>

          <div className="barra-contenido-acciones">
            <button
              type="button"
              className="barra-mostrar"
              onClick={() => setPlegada((valor) => !valor)}
              aria-label="Mostrar u ocultar módulos"
              aria-expanded={!plegada}
            >
              <span aria-hidden="true">☰</span>

              Módulos
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
        </header>

        {children}
      </div>
    </div>
  )
}


/* Una ruta protegida: si no hay sesión va al login; si el rol no
   tiene el módulo muestra el aviso de acceso denegado. */
function RutaPrivada({
  usuario,
  modulo,
  onCerrarSesion,
  children,
}) {
  if (!usuario) {
    return <Navigate to="/" replace />
  }

  if (modulo && !puedeVerModulo(usuario.rol, modulo)) {
    return (
      <Layout usuario={usuario} onCerrarSesion={onCerrarSesion}>
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
                Ir al dashboard
              </Link>
            </div>
          </section>
        </main>
      </Layout>
    )
  }

  return (
    <Layout usuario={usuario} onCerrarSesion={onCerrarSesion}>
      {children}
    </Layout>
  )
}


function AppContenido() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(() => {
    /* Aviso cuando el servicio cerró la sesión por token vencido */
    return new URLSearchParams(
      window.location.search
    ).get('sesion') === 'expirada'
      ? 'Su sesión expiró. Ingrese nuevamente.'
      : ''
  })
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


  /* Cierre por inactividad: 30 minutos sin actividad */
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
        path="/"
        element={
          usuario ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <main>

              <div className="login-marca">
                <span
                  className="login-logo"
                  aria-hidden="true"
                >
                  🌿
                </span>

                <span className="login-marca-texto">
                  <strong>EcoLogística Lima</strong>

                  <small>
                    Rutas de reparto en Lima Metropolitana
                  </small>
                </span>
              </div>

              <h1>Bienvenido</h1>

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
                  <p className="login-error">{error}</p>
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


      {/* PANEL: el dashboard es la pantalla principal, así que
          /panel redirige allí. Se conserva la ruta para no romper
          los enlaces que ya existían. */}

      <Route
        path="/panel"
        element={<Navigate to="/dashboard" replace />}
      />


      {/* DASHBOARD */}

      <Route
        path="/dashboard"
        element={
          <RutaPrivada
            usuario={usuario}
            modulo="/dashboard"
            onCerrarSesion={handleLogout}
          >
            <main>
              <div className="pagina-header">
                <div>
                  <h1>Panel general</h1>

                  <p>
                    Sesión de{' '}
                    <strong>{usuario?.nombre}</strong>
                  </p>
                </div>
              </div>

              <Dashboard />
            </main>
          </RutaPrivada>
        }
      />


      {/* MÓDULOS */}

      <Route
        path="/vehiculos"
        element={
          <RutaPrivada
            usuario={usuario}
            modulo="/vehiculos"
            onCerrarSesion={handleLogout}
          >
            <Vehiculos />
          </RutaPrivada>
        }
      />

      <Route
        path="/conductores"
        element={
          <RutaPrivada
            usuario={usuario}
            modulo="/conductores"
            onCerrarSesion={handleLogout}
          >
            <Conductores />
          </RutaPrivada>
        }
      />

      <Route
        path="/clientes"
        element={
          <RutaPrivada
            usuario={usuario}
            modulo="/clientes"
            onCerrarSesion={handleLogout}
          >
            <Clientes />
          </RutaPrivada>
        }
      />

      <Route
        path="/pedidos"
        element={
          <RutaPrivada
            usuario={usuario}
            modulo="/pedidos"
            onCerrarSesion={handleLogout}
          >
            <Pedidos />
          </RutaPrivada>
        }
      />

      <Route
        path="/rutas"
        element={
          <RutaPrivada
            usuario={usuario}
            modulo="/rutas"
            onCerrarSesion={handleLogout}
          >
            <Rutas />
          </RutaPrivada>
        }
      />

      <Route
        path="/operacion"
        element={
          <RutaPrivada
            usuario={usuario}
            modulo="/operacion"
            onCerrarSesion={handleLogout}
          >
            <Operacion />
          </RutaPrivada>
        }
      />

      <Route
        path="/conductor"
        element={
          <RutaPrivada
            usuario={usuario}
            modulo="/conductor"
            onCerrarSesion={handleLogout}
          >
            <Conductor />
          </RutaPrivada>
        }
      />


      {/* Cualquier ruta desconocida vuelve al dashboard */}

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />

    </Routes>
  )
}


export default function App() {
  return (
    <BrowserRouter>
      <AppContenido />
    </BrowserRouter>
  )
}