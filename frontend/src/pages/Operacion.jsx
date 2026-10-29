import { useEffect, useState } from 'react'

import {
  listarTrafico,
  registrarTrafico,
  listarIncidentes,
  registrarIncidente,
  cambiarEstadoIncidente,
  listarObstaculos,
  registrarObstaculo,
  quitarObstaculo,
  optimizarDesdeObstaculo,
  consultarSaturacion,
} from '../services/operacion'
import Esqueleto from '../components/Esqueleto'
import MapaObstaculos from '../components/MapaObstaculos'
import SelectorPunto from '../components/SelectorPunto'
import { obtenerMapaRutas } from '../services/operacion'
import { listarConductores } from '../services/conductores'
import { getUsuario } from '../services/auth'


const traficoInicial = {
  segmento: '',
  latitud: '',
  longitud: '',
  nivel_congestion: 'VERDE',
  velocidad_kmh: '',
  fuente: 'MANUAL',
}

const incidenteInicial = {
  tipo: 'BLOQUEO',
  descripcion: '',
  latitud: '',
  longitud: '',
  nivel: 'MEDIO',
  fuente: 'MANUAL',
}


export default function Operacion() {
  const [trafico, setTrafico] = useState([])
  const [incidentes, setIncidentes] = useState([])
  const [obstaculos, setObstaculos] = useState([])
  const [saturacion, setSaturacion] = useState(null)

  /* Rutas para dibujar de fondo al elegir un punto.
     Si se entra como conductor, sólo trae las suyas: marcar el
     incidente sobre la ruta que de verdad va a recorrer es la
     diferencia entre un reporte útil y uno que no dice nada. */
  const [rutasMapa, setRutasMapa] = useState([])

  /* De qué conductor es el reporte.

     Un tramo de tráfico es de la calzada: no pertenece a nadie en
     concreto, así que no pregunta. Un incidente sí: se pregunta
     primero para cargar SU ruta en el mapa, que es lo que permite
     marcar el punto sobre el recorrido que de verdad va a recorrer. */
  const [conductores, setConductores] = useState([])
  const [conductorIncidente, setConductorIncidente] = useState('')
  const [cargandoRuta, setCargandoRuta] = useState(false)

  const rutasConductor = rutasMapa

  /* Los incidentes que se ven en el mapa: sólo los que siguen
     vigentes. Un incidente resuelto ya no está en la calzada y
     dejarlo marcado sería mandar al conductor a esquivar un
     problema que ya no existe. */
  const incidentesVisibles = incidentes.filter(
    (i) => i.estado === 'ACTIVO'
  )


  /* Carga en el mapa la ruta del conductor que se ha elegido.

     Se pide filtrada al servidor y no se filtran aquí las que ya
     estaban: el backend recorta por rol y además sabe qué rutas
     importan, así que un filtro en el frontend acabaría mostrando
     rutas de ayer o de otro día. */
  async function cargarRutaDelConductor(idConductor) {
    if (!idConductor || idConductor === 'yo') {
      /* 'yo' es quien está dentro: el backend ya devuelve sólo sus
         rutas. */
      try {
        const m = await obtenerMapaRutas()

        setRutasMapa(m.rutas || [])
      } catch {
        setRutasMapa([])
      }

      return
    }

    try {
      setCargandoRuta(true)

      const m = await obtenerMapaRutas({
        id_conductor: idConductor,
      })

      setRutasMapa(m.rutas || [])
    } catch {
      setRutasMapa([])
    } finally {
      setCargandoRuta(false)
    }
  }


  async function elegirConductorIncidente(idConductor) {
    setConductorIncidente(idConductor)

    /* El punto marcado era de otra ruta: se sucia para no guardar un
       incidente en un sitio que ya no se está mirando. */
    setFormIncidente((a) => ({ ...a, latitud: '', longitud: '' }))

    await cargarRutaDelConductor(idConductor)
  }

  const [formTrafico, setFormTrafico] = useState(traficoInicial)
  const [formIncidente, setFormIncidente] =
    useState(incidenteInicial)

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [optimizandoCono, setOptimizandoCono] = useState(null)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')


  async function cargar() {
    try {
      setCargando(true)
      setError('')

      const [t, i, o] = await Promise.all([
        listarTrafico(),
        listarIncidentes(),
        listarObstaculos(),
      ])

      setTrafico(t)
      setIncidentes(i)
      setObstaculos(o)

      /* Los conductores, para poder preguntar de quién es el
         incidente antes de abrir el mapa. */
      try {
        const c = await listarConductores()

        setConductores(c || [])

        /* Si quien está dentro es conductor, no hay nada que elegir:
           el reporte es suyo y preguntárselo sería una tontería.
           El backend ya recorta el mapa a sus rutas, así que basta
           con dejar el desplegable en "mi ruta". */
        if (getUsuario()?.rol === 'CONDUCTOR') {
          setConductorIncidente('yo')
        }
      } catch {
        setConductores([])
      }

      /* Las rutas de fondo. No se manda ningún filtro: el servidor
         devuelve las del conductor si quien entra es conductor, y
         todas si es otro. Filtrar aquí sería pedir datos que el
         backend tiene que recortar igual. */
      try {
        const m = await obtenerMapaRutas()

        setRutasMapa(m.rutas || [])
      } catch {
        /* El mapa funciona sin las rutas de fondo: se pierde el
           contexto, no la función. */
        setRutasMapa([])
      }

      /* La saturación se mira sobre la jornada de hoy, de 05:00 a
         22:00 (RN-012). Es el panorama general que interesa al
         operador: si hoy no da abasto, hay que saberlo sin tener
         que abrir el formulario de un pedido. */
      try {
        const s = await consultarSaturacion({
          fecha: new Date().toISOString().slice(0, 10),
          hora_inicio: '05:00',
          hora_fin: '22:00',
        })

        setSaturacion(s)
      } catch {
        /* Si no se puede consultar la saturación, el módulo sigue
           siendo utilizable: es un dato adicional, no una condición
           para trabajar. */
        setSaturacion(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }


  /* Coloca un cono. Lo guarda en la calzada y no se quita solo: se
     queda para las rutas siguientes hasta que alguien lo elimine. */
  async function colocarCono(datos) {
    const creado = await registrarObstaculo(datos)

    setMensaje(
      `Cono registrado en ${Number(datos.latitud).toFixed(5)}, ` +
        `${Number(datos.longitud).toFixed(5)}. Aparecerá en los mapas ` +
        `de las rutas siguientes.`
    )

    await cargar()

    return creado
  }


  /* Quita un cono de la calzada. */
  async function quitarCono(obstaculo) {
    try {
      setMensaje('')
      setError('')

      await quitarObstaculo(obstaculo.id_obstaculo)

      setMensaje(
        'Cono retirado de la calzada. Las rutas siguientes ya no ' +
          'lo esquivarán.'
      )

      await cargar()
    } catch (err) {
      setError(err.message)
    }
  }


  /* Genera el recorrido de la ruta afectada desde el punto del cono.

     Conserva el vehículo y el conductor de esa ruta, y no deshace
     lo ya entregado. El cono se queda en la calle. */
  async function optimizarDesdeCono(obstaculo) {
    try {
      setOptimizandoCono(obstaculo.id_obstaculo)
      setMensaje('')
      setError('')

      const r = await optimizarDesdeObstaculo(
        obstaculo.id_obstaculo,
        { iteraciones: 400 }
      )

      let texto =
        `Recorrido de la ruta ${r.id_ruta} corregido en ` +
        `${r.segundos_resueltos}s para esquivar el cono. ` +
        `Se mantienen el vehículo ${r.vehiculo} y el conductor ` +
        `${r.conductor}.`

      if (r.orden_cambio) {
        texto +=
          ` Nuevo orden: ${r.orden_nuevo.join(' → ')}.`
      } else {
        texto +=
          ' El orden que ya tenía era el mejor con el cono colocado.'
      }

      setMensaje(texto)
    } catch (err) {
      setError(err.message)
    } finally {
      setOptimizandoCono(null)
    }
  }


  useEffect(() => {
    cargar()
  }, [])


  async function guardarTrafico(event) {
    event.preventDefault()

    try {
      setGuardando(true)
      setError('')
      setMensaje('')

      await registrarTrafico({
        ...formTrafico,
        latitud: Number(formTrafico.latitud),
        longitud: Number(formTrafico.longitud),
        velocidad_kmh: formTrafico.velocidad_kmh
          ? Number(formTrafico.velocidad_kmh)
          : null,
      })

      setFormTrafico(traficoInicial)
      setMensaje('Tramo de tráfico registrado.')

      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }


  async function guardarIncidente(event) {
    event.preventDefault()

    try {
      setGuardando(true)
      setError('')
      setMensaje('')

      await registrarIncidente({
        ...formIncidente,
        latitud: Number(formIncidente.latitud),
        longitud: Number(formIncidente.longitud),
      })

      setFormIncidente(incidenteInicial)
      setMensaje(
        'Incidente registrado. Ya aparece en el mapa, sobre la ' +
          'ruta del conductor.'
      )

      /* Se recargan sólo los incidentes, no toda la página.

         Con `cargar()` se perdería el conductor elegido y volverían
         todas las rutas al mapa, que es justo lo contrario de lo que
         se quiere ver después de reportar: el incidente nuevo, en
         su sitio, sobre SU recorrido. */
      try {
        setIncidentes(await listarIncidentes())
      } catch {
        /* Si la lista no vuelve, el reporte se guardó igual; lo que
           falta es el reflejo en pantalla. */
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }


  async function resolver(id, estado) {
    try {
      setError('')
      setMensaje('')

      await cambiarEstadoIncidente(id, estado)

      setMensaje(
        `Incidente ${id} marcado como ${estado}.`
      )

      await cargar()
    } catch (err) {
      setError(err.message)
    }
  }


  return (
    <main>

      <div className="pagina-header">
        <div>
          <h1>Tráfico e incidentes</h1>
          <p>
            Registre el estado de las vías y los
            incidentes para que el sistema reoptimice
            las rutas (HU-08).
          </p>
        </div>
      </div>

      {error && (
        <div className="mensaje error">{error}</div>
      )}

      {mensaje && (
        <div className="mensaje exito">{mensaje}</div>
      )}


      {/* Saturación de la jornada: informa de si la operación da
          abasto hoy, por capacidad y por tráfico. */}
      {saturacion && (
        <div
          className={`aviso-saturacion ${saturacion.estado.toLowerCase()}`}
        >
          <strong>
            {saturacion.estado === 'HOLGADO'
              ? 'La operación tiene hueco hoy.'
              : saturacion.estado === 'AJUSTADO'
                ? 'Hoy la operación va justa.'
                : 'Hoy la operación está saturada.'}
          </strong>

          <ul>
            {saturacion.motivos.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>

          <small>
            {saturacion.conductores_disponibles} conductores
            disponibles · {saturacion.horas_libres_totales} h libres ·{' '}
            {saturacion.carga_kg_libre.toFixed(0)} kg de carga libre
          </small>
        </div>
      )}


      {/* Conos de la calzada. Un cono no es un incidente: se queda
          en el mapa hasta que alguien lo quita. */}
      <section className="formulario-trafico">
        <h2>Obstáculos en la calzada</h2>

        <p className="ayuda-accion">
          Un cono marca un punto donde la vía está obstruida: un
          bache, una obra, un árbol caído. A diferencia de un
          incidente, el cono <strong>no caduca</strong>: se queda en
          el mapa y las rutas siguientes lo esquivan. Se quita con su
          botón cuando ya no estorbe.
        </p>

        <MapaObstaculos
          obstaculos={obstaculos}
          onColocar={colocarCono}
          onQuitar={quitarCono}
        />

        {obstaculos.length > 0 && (
          <div className="lista-obstaculos">
            {obstaculos.map((o) => (
              <div key={o.id_obstaculo} className="fila-obstaculo">
                <span className="cono-miniatura" aria-hidden="true" />

                <div>
                  <strong>
                    {o.tipo === 'CONO' ? 'Cono' : o.tipo}
                  </strong>

                  <span>{o.descripcion}</span>

                  <small>
                    {Number(o.latitud).toFixed(5)},{' '}
                    {Number(o.longitud).toFixed(5)}
                  </small>
                </div>

                <div className="acciones-obstaculo">
                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={() => optimizarDesdeCono(o)}
                    disabled={optimizandoCono === o.id_obstaculo}
                  >
                    {optimizandoCono === o.id_obstaculo
                      ? 'Optimizando...'
                      : 'Optimizar desde aquí'}
                  </button>

                  <button
                    type="button"
                    className="boton-peligro"
                    onClick={() => quitarCono(o)}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>


      <section className="formulario-trafico">
        <h2>Registrar tramo de tráfico</h2>

        <p className="ayuda-accion">
          Marque el punto en el mapa. No se escriben coordenadas: el
          sistema sabe dónde queda y calcula el recorrido por la
          calle.
        </p>

        <SelectorPunto
          latitud={formTrafico.latitud}
          longitud={formTrafico.longitud}
          onCambio={(p) =>
            setFormTrafico((a) => ({
              ...a,
              latitud: p.latitud,
              longitud: p.longitud,
            }))
          }
          etiqueta="Tramo de tráfico"
          capas={rutasConductor}
          puntoInicial={null}
        />

        <form onSubmit={guardarTrafico}>
          <div className="form-grid">
            <label className="campo-completo">
              Segmento / vía

              <input
                type="text"
                name="segmento"
                value={formTrafico.segmento}
                onChange={(e) =>
                  setFormTrafico((a) => ({
                    ...a,
                    segmento: e.target.value,
                  }))
                }
                required
                maxLength="150"
                placeholder="Av. Próceres de la Independencia"
              />
            </label>

            <label>
              Nivel de congestión

              <select
                name="nivel_congestion"
                value={formTrafico.nivel_congestion}
                onChange={(e) =>
                  setFormTrafico((a) => ({
                    ...a,
                    nivel_congestion: e.target.value,
                  }))
                }
              >
                <option value="VERDE">
                  Verde (fluido)
                </option>
                <option value="AMARILLO">
                  Amarillo (lento)
                </option>
                <option value="ROJO">
                  Rojo (congestionado)
                </option>
              </select>
            </label>

            <label>
              Velocidad km/h

              <input
                type="number"
                step="0.01"
                name="velocidad_kmh"
                value={formTrafico.velocidad_kmh}
                onChange={(e) =>
                  setFormTrafico((a) => ({
                    ...a,
                    velocidad_kmh: e.target.value,
                  }))
                }
                min="0"
              />
            </label>

            <label>
              Fuente

              <select
                name="fuente"
                value={formTrafico.fuente}
                onChange={(e) =>
                  setFormTrafico((a) => ({
                    ...a,
                    fuente: e.target.value,
                  }))
                }
              >
                <option value="MANUAL">
                  Manual
                </option>
                <option value="WAZE">
                  Waze
                </option>
                <option value="SIMAT">
                  SIMAT
                </option>
              </select>
            </label>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={guardando}
            >
              Registrar tráfico
            </button>
          </div>
        </form>
      </section>


      <section className="lista-trafico">
        <h2>Tramos registrados</h2>

        {cargando ? (
          <Esqueleto texto="tráfico" tipo="filas" />
        ) : trafico.length === 0 ? (
          <p>
            No hay tramos de tráfico registrados.
          </p>
        ) : (
          <div className="tabla-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Segmento</th>
                  <th>Nivel</th>
                  <th>Velocidad</th>
                  <th>Fuente</th>
                  <th>Fecha</th>
                </tr>
              </thead>

              <tbody>
                {trafico.map((t) => (
                  <tr key={t.id_trafico}>
                    <td>{t.id_trafico}</td>
                    <td>{t.segmento}</td>
                    <td>
                      <span
                        className={`estado estado-trafico-${t.nivel_congestion.toLowerCase()}`}
                      >
                        {t.nivel_congestion}
                      </span>
                    </td>
                    <td>
                      {t.velocidad_kmh
                        ? `${t.velocidad_kmh} km/h`
                        : '-'}
                    </td>
                    <td>{t.fuente}</td>
                    <td>
                      {new Date(
                        t.fecha_hora
                      ).toLocaleString('es-PE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>


      <section className="formulario-incidente">
        <h2>Reportar incidente</h2>

        <p>
          Primero se elige el conductor. El mapa carga su ruta, para
          poder marcar el punto sobre el recorrido que de verdad va a
          hacer. Al registrarlo, el incidente aparece en ese mismo
          mapa.
        </p>

        <label className="campo campo-completo">
          ¿De quién es el reporte?

          <select
            name="conductor_incidente"
            value={conductorIncidente}
            onChange={(e) => elegirConductorIncidente(e.target.value)}
          >
            <option value="">Elija un conductor</option>

            {getUsuario()?.rol === 'CONDUCTOR' && (
              <option value="yo">Mi ruta</option>
            )}

            {conductores.map((c) => (
              <option
                key={c.id_conductor}
                value={c.id_conductor}
              >
                {c.nombre} {c.apellido}
              </option>
            ))}
          </select>

          <small className="ayuda-campo">
            {conductorIncidente
              ? rutasConductor.length > 0
                ? `Se muestra ${rutasConductor.length === 1
                  ? 'su ruta'
                  : `sus ${rutasConductor.length} rutas`} en el mapa.`
                : 'Ese conductor no tiene rutas activas hoy.'
              : 'Sin conductor no se puede situar el incidente sobre ' +
                'un recorrido.'}
          </small>
        </label>

        <form onSubmit={guardarIncidente}>
          <div className="form-grid">
            <label>
              Tipo

              <select
                name="tipo"
                value={formIncidente.tipo}
                onChange={(e) =>
                  setFormIncidente((a) => ({
                    ...a,
                    tipo: e.target.value,
                  }))
                }
              >
                <option value="BLOQUEO">
                  Bloqueo
                </option>
                <option value="ACCIDENTE">
                  Accidente
                </option>
                <option value="AVERIA">
                  Avería
                </option>
                <option value="ROBO">
                  Robo
                </option>
                <option value="CLIMA">
                  Clima
                </option>
              </select>
            </label>

            <label>
              Nivel

              <select
                name="nivel"
                value={formIncidente.nivel}
                onChange={(e) =>
                  setFormIncidente((a) => ({
                    ...a,
                    nivel: e.target.value,
                  }))
                }
              >
                <option value="BAJO">
                  Bajo
                </option>
                <option value="MEDIO">
                  Medio
                </option>
                <option value="ALTO">
                  Alto
                </option>
              </select>
            </label>

            <label className="campo-completo">
              Descripción

              <input
                type="text"
                name="descripcion"
                value={formIncidente.descripcion}
                onChange={(e) =>
                  setFormIncidente((a) => ({
                    ...a,
                    descripcion: e.target.value,
                  }))
                }
                required
                minLength="5"
                maxLength="200"
                placeholder="Bloqueo de pista por obra"
              />
            </label>

            <div className="campo campo-completo">
              <label className="etiqueta-mapa">
                Punto del incidente
              </label>

              <SelectorPunto
                latitud={formIncidente.latitud}
                longitud={formIncidente.longitud}
                onCambio={(p) =>
                  setFormIncidente((a) => ({
                    ...a,
                    latitud: p.latitud,
                    longitud: p.longitud,
                  }))
                }
                etiqueta="Punto del incidente"
                capas={rutasConductor}
                marcadores={incidentesVisibles}
              />

              <small className="ayuda-campo">
                {cargandoRuta
                  ? 'Cargando la ruta del conductor...'
                  : !conductorIncidente
                    ? 'Elija primero el conductor.'
                    : rutasConductor.length > 0
                      ? 'El mapa muestra su ruta y los incidentes que ' +
                        'ya tiene. Marque el punto sobre ella.'
                      : 'Ese conductor no tiene ruta activa hoy. ' +
                        'Marque en el mapa dónde ocurrió.'}
              </small>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={
                guardando ||
                !conductorIncidente ||
                formIncidente.latitud === '' ||
                formIncidente.latitud === null
              }
            >
              Reportar incidente
            </button>
          </div>
        </form>
      </section>


      <section className="lista-incidentes">
        <h2>Incidentes reportados</h2>

        {cargando ? (
          <Esqueleto texto="incidentes" tipo="filas" />
        ) : incidentes.length === 0 ? (
          <p>No hay incidentes reportados.</p>
        ) : (
          <div className="tabla-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Descripción</th>
                  <th>Nivel</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {incidentes.map((i) => (
                  <tr key={i.id_incidente}>
                    <td>{i.id_incidente}</td>
                    <td>{i.tipo}</td>
                    <td>{i.descripcion}</td>
                    <td>
                      <span
                        className={`estado estado-nivel-${i.nivel.toLowerCase()}`}
                      >
                        {i.nivel}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`estado estado-inc-${i.estado.toLowerCase()}`}
                      >
                        {i.estado}
                      </span>
                    </td>
                    <td>
                      {new Date(
                        i.fecha_hora
                      ).toLocaleString('es-PE')}
                    </td>
                    <td>
                      {i.estado === 'ACTIVO' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              resolver(
                                i.id_incidente,
                                'RESUELTO'
                              )
                            }
                          >
                            Resolver
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              resolver(
                                i.id_incidente,
                                'CANCELADO'
                              )
                            }
                          >
                            Descartar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </main>
  )
}
