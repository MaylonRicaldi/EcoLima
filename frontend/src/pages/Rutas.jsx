import { useEffect, useState } from 'react'

import MapaRuta from '../components/MapaRuta'

import {
  listarRutas,
  obtenerRuta,
  optimizarRutas,
  reoptimizarRuta,
  evaluarReoptimizacion,
  actualizarEntrega,
  listarTrafico,
  listarIncidentes,
  obtenerLocal,
  guardarLocal,
  listarObstaculos,
  listarPedidos,
  encargarPedido,
  consultarOrdenSugerido,
  anticiparPedido,
} from '../services/operacion'
import Esqueleto from '../components/Esqueleto'
import SelectorPunto from '../components/SelectorPunto'


/* Explica la recomendación en palabras.

   Los motivos se calculan en el backend y llegan como código, para
   que la explicación no pueda contradecir a la decisión. Aquí sólo
   se traduce a lenguaje llano. */
function explicarMotivo(r) {
  const actual = r.actual
  const nuevo = r.nuevo

  if (!actual) {
    return (
      'Es la única entrega que queda: no hay nada que reordenar.'
    )
  }

  const masCercano = nuevo.minutos < actual.minutos
  const diferencia = Math.abs(nuevo.minutos - actual.minutos)

  switch (r.motivo) {
    case 'URGENTE_NUEVO':
      return (
        `El pedido #${nuevo.id_pedido} cierra a las ` +
        `${nuevo.hora_fin} y desde ahí queda a ` +
        `${nuevo.minutos} minutos. Se le está yendo la ventana, así ` +
        `que conviene llevarlo antes que el #${actual.id_pedido}, ` +
        `aunque esté más lejos.`
      )

    case 'URGENTE_ACTUAL':
      return (
        `El pedido #${actual.id_pedido} cierra a las ` +
        `${actual.hora_fin} y se le está yendo la ventana. Aunque el ` +
        `otro esté más cerca, conviene terminar este primero: ` +
        `llegar tarde cuesta más que rodar un poco más.`
      )

    case 'MAS_CERCA':
      return (
        `Desde donde está el conductor, el pedido #${nuevo.id_pedido} ` +
        `queda a ${nuevo.minutos} minutos y el #${actual.id_pedido} a ` +
        `${actual.minutos}. ${diferencia.toFixed(0)} minutos menos de ` +
        `camino, y ninguna de las dos se está yendo la ventana.`
      )

    default:
      return masCercano
        ? 'Está algo más cerca, pero la diferencia es pequeña.'
        : `El pedido #${actual.id_pedido} está más cerca: ` +
          `${actual.minutos} minutos contra ${nuevo.minutos}. ` +
          `Ninguna de las dos se está yendo la ventana, así que se ` +
          `termina primero la que ya venía.`
  }
}


export default function Rutas() {
  const [rutas, setRutas] = useState([])
  const [rutaActual, setRutaActual] = useState(null)

  // El local de la empresa y los conos de la calzada: se dibujan en
  // el mapa de cada ruta.
  const [local, setLocal] = useState(null)
  const [obstaculos, setObstaculos] = useState([])
  const [moviendoLocal, setMoviendoLocal] = useState(false)

  /* Encargar otra orden a esta ruta.

     Cuando el conductor ya va repartiendo y le llega un envío más,
     la orden no se le cambia por sorpresa: el sistema dice cuál
     convendría y el usuario confirma. De ahí los tres estados. */
  const [pedidosSueltos, setPedidosSueltos] = useState([])
  const [pedidoElegido, setPedidoElegido] = useState('')
  const [recomendacion, setRecomendacion] = useState(null)
  const [encargando, setEncargando] = useState(false)
  const [nuevoLocal, setNuevoLocal] = useState({
    latitud: '',
    longitud: '',
    direccion: '',
  })

  // Una ruta cerrada es un registro histórico: no se le puede
  // corregir el recorrido ni cambiar el estado de sus entregas.
  const rutaCerrada =
    rutaActual?.estado === 'COMPLETADA' ||
    rutaActual?.estado === 'CANCELADA'

  // Entregas ya cerradas: tampoco se pueden tocar
  const entregasCerradas = (rutaActual?.pedidos ?? []).filter(
    (p) =>
      p.estado_entrega === 'ENTREGADO' ||
      p.estado_entrega === 'FALLIDO'
  )

  const [trafico, setTrafico] = useState([])
  const [incidentes, setIncidentes] = useState([])

  const [evaluacion, setEvaluacion] = useState(null)

  const [cargando, setCargando] = useState(true)
  const [optimizando, setOptimizando] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')


  async function cargarRutas() {
    try {
      setCargando(true)
      setError('')

      const data = await listarRutas()

      setRutas(data)

      // Las rutas que ya se realizaron son registro histórico, no
      // trabajo pendiente. No se elige como ruta actual ninguna que
      // ya esté cerrada: al abrir el sistema no puede caer una ruta
      // hecha con sus entregas marcadas como pendientes, porque eso
      // es lo que hacía que el mapa y el panel insistieran en la
      // operación que ya terminó.
      const activas = (data || []).filter(
        (r) => r.estado !== 'COMPLETADA' && r.estado !== 'CANCELADA'
      )

      if (activas.length > 0) {
        await seleccionarRuta(activas[0].id_ruta)
      } else {
        setRutaActual(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }


  async function cargarOperacion() {
    try {
      const [t, i, l, o, p] = await Promise.all([
        listarTrafico(),
        listarIncidentes('ACTIVO'),
        obtenerLocal(),
        listarObstaculos(),
        listarPedidos(),
      ])

      setTrafico(t)
      setIncidentes(i)
      setLocal(l)
      setObstaculos(o)

      /* Los pedidos que todavía no están en ninguna ruta: los
         candidatos a ser la orden nueva de un conductor. */
      setPedidosSueltos(
        (p || []).filter((x) => x.estado === 'PENDIENTE')
      )
    } catch {
      /* El mapa sigue dibujando la ruta aunque falten los datos de
         contexto. Perder el local en pantalla es molesto, pero
         vaciar la pantalla entera sería peor. */
      setTrafico([])
      setIncidentes([])
      setObstaculos([])
      setPedidosSueltos([])
    }
  }


  /* Encarga el pedido elegido a esta ruta y guarda la recomendación.

     El pedido entra al final de la secuencia. Lo de adelantarlo o no
     es otra decisión, y también la confirma el usuario. */
  async function encargarOrden() {
    if (!rutaActual || !pedidoElegido) {
      return
    }

    try {
      setEncargando(true)
      setError('')
      setMensaje('')

      const r = await encargarPedido(
        rutaActual.id_ruta,
        Number(pedidoElegido)
      )

      setRecomendacion(r.recomendacion)
      setPedidoElegido('')

      setMensaje(r.mensaje)

      await seleccionarRuta(rutaActual.id_ruta)
      await cargarOperacion()
    } catch (err) {
      setError(err.message)
    } finally {
      setEncargando(false)
    }
  }


  /* Consulta el orden recomendado sin meter el pedido. Sirve para
     mirar antes de comprometerse. */
  async function mirarOrdenSugerido() {
    if (!rutaActual || !pedidoElegido) {
      return
    }

    try {
      setEncargando(true)
      setError('')

      setRecomendacion(
        await consultarOrdenSugerido(
          rutaActual.id_ruta,
          Number(pedidoElegido)
        )
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setEncargando(false)
    }
  }


  async function aplicarAnticipacion() {
    if (!rutaActual || !recomendacion) {
      return
    }

    try {
      setEncargando(true)
      setError('')
      setMensaje('')

      const r = await anticiparPedido(
        rutaActual.id_ruta,
        recomendacion.nuevo.id_pedido
      )

      setRecomendacion(null)
      setMensaje(r.mensaje)

      await seleccionarRuta(rutaActual.id_ruta)
    } catch (err) {
      setError(err.message)
    } finally {
      setEncargando(false)
    }
  }


  /* Guarda el local donde el usuario lo colocó en el mapa. */
  async function moverLocal(event) {
    event.preventDefault()

    try {
      setError('')
      setMensaje('')

      const guardado = await guardarLocal({
        direccion:
          nuevoLocal.direccion ||
          local?.direccion ||
          'Local de la empresa',
        latitud: Number(nuevoLocal.latitud),
        longitud: Number(nuevoLocal.longitud),
      })

      setLocal({
        ...local,
        direccion: guardado.direccion,
        latitud: guardado.latitud,
        longitud: guardado.longitud,
        origen: 'registrado',
      })

      setMoviendoLocal(false)

      setMensaje(
        'Local actualizado. Las rutas nuevas saldrán de aquí y los ' +
          'vehículos volverán aquí de noche.'
      )
    } catch (err) {
      setError(err.message)
    }
  }


  useEffect(() => {
    cargarRutas()
    cargarOperacion()
  }, [])


  async function seleccionarRuta(id) {
    try {
      setError('')

      const detalle = await obtenerRuta(id)

      setRutaActual(detalle)
      setEvaluacion(null)
    } catch (err) {
      setError(err.message)
    }
  }


  async function ejecutarOptimizacion() {
    try {
      setOptimizando(true)
      setError('')
      setMensaje('')

      const data = await optimizarRutas({
        algoritmo: 'SA',
        iteraciones: 250,
      })


      if (data.rutas_creadas.length > 0) {
        setMensaje(
          `Se generaron ${data.rutas_creadas.length} ruta(s) ` +
            `en ${data.segundos_resueltos}s.`
        )

        await cargarRutas()
        await seleccionarRuta(data.rutas_creadas[0].id_ruta)
      } else {
        setMensaje(
          'No se generaron rutas nuevas.'
        )
      }

      data.advertencias?.forEach((a) => setError(a))

      if (data.pedidos_no_planificados.length > 0) {
        data.pedidos_no_planificados.forEach((p) =>
          setError(
            (prev) =>
              `${prev ? `${prev} ` : ''}Pedido ${
                p.id_pedido
              }: ${p.motivo}`
          )
        )
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setOptimizando(false)
    }
  }


  async function reoptimizar() {
    if (!rutaActual) {
      return
    }

    try {
      setOptimizando(true)
      setError('')
      setMensaje('')

      const data = await reoptimizarRuta(
        rutaActual.id_ruta,
        { iteraciones: 400 }
      )

      // La reoptimización conserva el vehículo y el conductor: solo
      // corrige el orden de visita. El mensaje lo deja claro, porque
      // antes era fácil confundirla con una replanificación completa.
      const antes = data.orden_anterior.join(' → ')
      const despues = data.orden_nuevo.join(' → ')

      let texto = (
        `Recorrido corregido en ${data.segundos_resueltos}s. ` +
        `Se mantienen el vehículo ${data.vehiculo} y el conductor ` +
        `${data.conductor}.`
      )

      if (data.orden_cambio) {
        texto += ` Nuevo orden: ${despues} (antes ${antes}).`
      } else {
        texto +=
          ' El orden que ya tenía era el mejor con el tráfico de ahora.'
      }

      const km = data.cambio?.distancia_km
      const min = data.cambio?.duracion_minutos

      if (typeof km === 'number' && Math.abs(km) >= 0.01) {
        texto +=
          ` Distancia ${km > 0 ? '+' : ''}${km.toFixed(2)} km.`
      }

      if (typeof min === 'number' && Math.abs(min) >= 0.5) {
        texto +=
          ` Tiempo ${min > 0 ? '+' : ''}${min.toFixed(0)} min.`
      }

      setMensaje(texto)

      // Las advertencias van como avisos, no como errores: son
      // circunstancias que debe conocer, no fallos.
      data.advertencias?.forEach((a) => setError(a))

      await cargarRutas()
      await cargarOperacion()
      await seleccionarRuta(data.id_ruta)
    } catch (err) {
      setError(err.message)
    } finally {
      setOptimizando(false)
    }
  }


  async function evaluar() {
    if (!rutaActual) {
      return
    }

    try {
      setError('')

      const data = await evaluarReoptimizacion(
        rutaActual.id_ruta
      )

      setEvaluacion(data)
    } catch (err) {
      setError(err.message)
    }
  }


  async function marcarEntrega(idPedido, estado) {
    if (!rutaActual) {
      return
    }

    try {
      setError('')
      setMensaje('')

      await actualizarEntrega(
        rutaActual.id_ruta,
        idPedido,
        estado
      )

      setMensaje(
        `Pedido ${idPedido} marcado como ${estado}.`
      )

      await seleccionarRuta(rutaActual.id_ruta)
    } catch (err) {
      setError(err.message)
    }
  }


  return (
    <main>

      <div className="pagina-header">
        <div>
          <h1>Optimización de rutas</h1>
          <p>
            Rutas generadas con Recocido Simulado (SA)
            sobre pedidos, flota y conductores.
          </p>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="boton-principal"
            onClick={ejecutarOptimizacion}
            disabled={optimizando}
          >
            {optimizando
              ? 'Optimizando...'
              : 'Optimizar rutas'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mensaje error">{error}</div>
      )}

      {mensaje && (
        <div className="mensaje exito">{mensaje}</div>
      )}


      <section className="lista-rutas">
        <h2>Rutas generadas</h2>

        {cargando ? (
          <Esqueleto texto="rutas" tipo="filas" />
        ) : rutas.length === 0 ? (
          <p>
            No hay rutas generadas. Use
            &quot;Optimizar rutas&quot; para generar
            la primera.
          </p>
        ) : (
          <div className="tabla-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Distancia km</th>
                  <th>Duración min</th>
                  <th>CO₂ kg</th>
                  <th>Costo S/</th>
                  <th>Ventanas %</th>
                  <th>Algoritmo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {rutas.map((r) => (
                  <tr
                    key={r.id_ruta}
                    className={
                      rutaActual?.id_ruta === r.id_ruta
                        ? 'fila-activa'
                        : ''
                    }
                  >
                    <td>{r.id_ruta}</td>
                    <td>{r.fecha}</td>
                    <td>{r.distancia_km}</td>
                    <td>{r.duracion_minutos}</td>
                    <td>{r.co2_kg}</td>
                    <td>{r.costo_total}</td>
                    <td>
                      {r.cumplimiento_ventanas_pct ?? '-'}
                    </td>
                    <td>{r.algoritmo_utilizado ?? '-'}</td>
                    <td>
                      <span
                        className={`estado estado-ruta-${r.estado.toLowerCase()}`}
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          seleccionarRuta(r.id_ruta)
                        }
                      >
                        Ver mapa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>


      {rutaActual && (
        <>
          <section className="detalle-ruta">
            <h2>
              Ruta {rutaActual.id_ruta} · recorrido
            </h2>

            <div className="ruta-meta">
              <span>
                Vehículo:{' '}
                <strong>
                  {rutaActual.asignacion?.placa ?? '-'}
                </strong>
              </span>

              <span>
                Conductor:{' '}
                <strong>
                  {rutaActual.asignacion
                    ? `${rutaActual.asignacion.conductor_nombre} ${rutaActual.asignacion.conductor_apellido}`
                    : '-'}
                </strong>
              </span>

              <span>
                Distancia:{' '}
                <strong>
                  {rutaActual.distancia_km} km
                </strong>
              </span>

              <span>
                Duración:{' '}
                <strong>
                  {rutaActual.duracion_minutos} min
                </strong>
              </span>

              <span>
                CO₂:{' '}
                <strong>
                  {rutaActual.co2_kg} kg
                </strong>
              </span>

              <span>
                Costo total:{' '}
                <strong>
                  S/ {rutaActual.costo_total}
                </strong>
              </span>

              <span>
                Ventanas cumplidas:{' '}
                <strong>
                  {rutaActual.cumplimiento_ventanas_pct}%
                </strong>
              </span>
            </div>

            <p className="ayuda-accion">
              Corregir el recorrido vuelve a calcular el orden de
              visita con el tráfico de ahora. No cambia el vehículo ni
              el conductor, ni coge o suelta pedidos: es la misma ruta
              con las mismas paradas, mejor ordenadas. Las entregas ya
              cerradas se conservan como registro y no se tocan.
            </p>

            <div className="form-actions">
              {rutaCerrada ? (
                <p className="ayuda-accion">
                  {rutaActual.estado === 'CANCELADA'
                    ? 'Esta ruta está cancelada.'
                    : 'Esta ruta está cerrada: no queda nada por ' +
                      'entregar. Ya no se puede corregir su ' +
                      'recorrido, queda como registro de lo que se ' +
                      'hizo.'}
                  {entregasCerradas.length > 0 && (
                    <> {entregasCerradas.length} de{' '}
                      {rutaActual.pedidos?.length ?? 0} entregas
                      están cerradas.
                    </>
                  )}
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={reoptimizar}
                    disabled={optimizando}
                  >
                    Corregir recorrido
                  </button>

                  <button
                    type="button"
                    onClick={evaluar}
                  >
                    Evaluar reoptimización
                  </button>
                </>
              )}
            </div>

            {evaluacion && (
              <div
                className={
                  evaluacion.requiere_reoptimizacion
                    ? 'mensaje error'
                    : 'mensaje exito'
                }
              >
                {evaluacion.requiere_reoptimizacion
                  ? `Conviene corregir el recorrido: ${evaluacion.motivos.join(' ')}`
                  : 'No hace falta corregir el recorrido por tráfico ni incidentes.'}
              </div>
            )}

            {rutaActual.indicador && (
              <div className="ruta-meta">
                <span>
                  Ahorro combustible:{' '}
                  <strong>
                    {rutaActual.indicador.ahorro_combustible_l} L
                  </strong>
                </span>

                <span>
                  Ahorro económico:{' '}
                  <strong>
                    S/ {rutaActual.indicador.ahorro_economico}
                  </strong>
                </span>

                <span>
                  CO₂ ahorrado:{' '}
                  <strong>
                    {rutaActual.indicador.co2_ahorrado_kg} kg
                  </strong>
                </span>

                <span>
                  Reducción distancia:{' '}
                  <strong>
                    {rutaActual.indicador.reduccion_distancia_pct}%
                  </strong>
                </span>
              </div>
            )}
          </section>


          <section className="mapa-seccion">
            <h2>Mapa del recorrido</h2>

            <MapaRuta
              ruta={rutaActual}
              pedidos={rutaActual.pedidos}
              trafico={trafico}
              incidentes={incidentes}
              local={local}
              conos={obstaculos}
            />

            <ul className="leyenda-mapa">
              <li>
                <span
                  style={{ background: '#10b981' }}
                />
                Inicio
              </li>
              <li>
                <span
                  style={{ background: '#0ea5e9' }}
                />
                Entrega
              </li>
              <li>
                <span
                  style={{ background: '#f59e0b' }}
                />
                Descanso
              </li>
              <li>
                <span className="leyenda-punto local" />
                Local (partida y retorno)
              </li>
              <li>
                <span className="leyenda-punto cono" />
                Cono en la calzada
              </li>
              <li>
                <span
                  style={{ background: '#be123c' }}
                />
                Fin / incidente
              </li>
              <li>
                <span
                  style={{ background: '#f59e0b' }}
                />
                Entrega pendiente
              </li>
              <li>
                <span
                  style={{ background: '#10b981' }}
                />
                Entregado
              </li>
            </ul>


            {/* El local de la empresa.

                Es el punto del que salen los envíos y al que vuelven
                los vehículos de noche. Se muestra siempre para que
                quede claro de dónde parte cada reparto, y se mueve
                desde aquí porque las coordenadas no se escriben: se
                marcan en el mapa. */}
            <div className="local-panel">
              <div className="local-panel-cabecera">
                <div>
                  <h3>Local de la empresa</h3>

                  <p className="local-panel-linea">
                    <strong>{local?.direccion}</strong>
                  </p>

                  <p className="local-panel-linea tenue">
                    {local?.latitud !== null &&
                    local?.latitud !== undefined
                      ? `${local.latitud}, ${local.longitud}`
                      : 'Sin localizar'}

                    {local?.hora_retorno_local && (
                      <>
                        {' · de noche se vuelve aquí desde las '}

                        {local.hora_retorno_local}
                      </>
                    )}
                  </p>

                  {local?.origen === 'respaldo' && (
                    <p className="local-panel-aviso">
                      Este punto es un valor de respaldo: todavía no
                      se ha colocado el local en el mapa. Colóquelo
                      para que las rutas salgan de verdad de su
                      negocio.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className="boton-secundario"
                  onClick={() => {
                    setNuevoLocal({
                      latitud: local?.latitud ?? '',
                      longitud: local?.longitud ?? '',
                      direccion: local?.direccion ?? '',
                    })

                    setMoviendoLocal(!moviendoLocal)
                  }}
                >
                  {moviendoLocal
                    ? 'Cancelar'
                    : 'Mover el local'}
                </button>
              </div>


              {moviendoLocal && (
                <form
                  onSubmit={moverLocal}
                  className="local-panel-formulario"
                >
                  <p className="ayuda-accion">
                    Haga clic en el mapa o arrastre el punto para
                    indicar dónde está el local. Se guarda uno solo:
                    todas las rutas saldrán de ahí.
                  </p>

                  <SelectorPunto
                    latitud={nuevoLocal.latitud}
                    longitud={nuevoLocal.longitud}
                    onCambio={(p) =>
                      setNuevoLocal((a) => ({ ...a, ...p }))
                    }
                    etiqueta="Local de la empresa"
                    alto="16rem"
                  />

                  <label className="campo">
                    Dirección del local

                    <input
                      type="text"
                      value={nuevoLocal.direccion}
                      onChange={(e) =>
                        setNuevoLocal((a) => ({
                          ...a,
                          direccion: e.target.value,
                        }))
                      }
                      maxLength="200"
                      placeholder="Puerto de Callao, Av. San Martín"
                    />
                  </label>

                  <button
                    type="submit"
                    className="boton-primario"
                    disabled={
                      nuevoLocal.latitud === '' ||
                      nuevoLocal.latitud === null ||
                      nuevoLocal.latitud === undefined
                    }
                  >
                    Guardar local
                  </button>
                </form>
              )}
            </div>
          </section>


          <section className="encargar-orden">
            <h2>Encargarle otra orden</h2>

            <p className="ayuda-accion">
              El envío entra en esta ruta, al final. No se le crea
              otra ruta ni se suelta lo que ya lleva: un envío sólo
              puede estar en una ruta. El orden no se cambia solo,
              porque reordenarle el trabajo al conductor a sus espaldas
              no lo hace este sistema en ningún otro sitio.
            </p>

            {pedidosSueltos.length === 0 ? (
              <p>
                No hay pedidos sueltos. Todos los pedidos pendientes
                ya están en alguna ruta.
              </p>
            ) : (
              <div className="encargar-controles">
                <label className="campo">
                  Pedido

                  <select
                    value={pedidoElegido}
                    onChange={(e) => {
                      setPedidoElegido(e.target.value)
                      setRecomendacion(null)
                    }}
                  >
                    <option value="">Elija un pedido</option>

                    {pedidosSueltos.map((p) => (
                      <option
                        key={p.id_pedido}
                        value={p.id_pedido}
                      >
                        #{p.id_pedido} · {p.direccion_entrega}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="form-actions">
                  <button
                    type="button"
                    className="boton-secundario"
                    disabled={!pedidoElegido || encargando}
                    onClick={mirarOrdenSugerido}
                  >
                    Ver qué orden conviene
                  </button>

                  <button
                    type="button"
                    disabled={!pedidoElegido || encargando}
                    onClick={encargarOrden}
                  >
                    Encargar
                  </button>
                </div>
              </div>
            )}


            {recomendacion && (
              <div className="orden-sugerido">
                <h3>
                  {recomendacion.recomendacion === 'ANTICIPAR'
                    ? 'Conviene adelantar este pedido'
                    : 'Conviene seguir el orden actual'}
                </h3>

                <p className="orden-motivo">
                  {explicarMotivo(recomendacion)}
                </p>

                {recomendacion.actual && (
                  <div className="orden-comparacion">
                    <div>
                      <strong>La que viene ahora</strong>

                      <span>
                        #{recomendacion.actual.id_pedido}
                      </span>

                      <span>
                        {recomendacion.actual.km} km ·{' '}
                        {recomendacion.actual.minutos} min
                      </span>

                      <span>
                        cierra a las {recomendacion.actual.hora_fin}
                      </span>

                      {recomendacion.actual.urgente && (
                        <span className="marca-urgente">
                          se le está yendo la ventana
                        </span>
                      )}
                    </div>

                    <div>
                      <strong>La orden nueva</strong>

                      <span>
                        #{recomendacion.nuevo.id_pedido}
                      </span>

                      <span>
                        {recomendacion.nuevo.km} km ·{' '}
                        {recomendacion.nuevo.minutos} min
                      </span>

                      <span>
                        cierra a las {recomendacion.nuevo.hora_fin}
                      </span>

                      {recomendacion.nuevo.urgente && (
                        <span className="marca-urgente">
                          se le está yendo la ventana
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {recomendacion.recomendacion === 'ANTICIPAR' && (
                  <div className="form-actions">
                    <button
                      type="button"
                      className="boton-secundario"
                      onClick={() => setRecomendacion(null)}
                      disabled={encargando}
                    >
                      Dejarlo como está
                    </button>

                    <button
                      type="button"
                      disabled={encargando}
                      onClick={aplicarAnticipacion}
                    >
                      Adelantarlo
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>


          <section className="pedidos-ruta">
            <h2>Pedidos de la ruta</h2>

            {rutaActual.pedidos.length === 0 ? (
              <p>Esta ruta no tiene pedidos.</p>
            ) : (
              <div className="tabla-container">
                <table>
                  <thead>
                    <tr>
                      <th>Orden</th>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th>Dirección</th>
                      <th>Peso</th>
                      <th>Prioridad</th>
                      <th>Llegada est.</th>
                      <th>Penalización</th>
                      <th>Estado entrega</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rutaActual.pedidos.map((p) => (
                      <tr key={p.id_pedido}>
                        <td>{p.orden_visita}</td>
                        <td>{p.id_pedido}</td>
                        <td>{p.cliente_nombre}</td>
                        <td>
                          {p.direccion_entrega}
                        </td>
                        <td>
                          {p.peso_kg} kg
                        </td>
                        <td>{p.prioridad}</td>
                        <td>
                          {p.hora_llegada_estimada
                            ? new Date(
                                p.hora_llegada_estimada
                              ).toLocaleTimeString('es-PE', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td>
                          S/ {p.penalizacion}
                        </td>
                        <td>
                          <span
                            className={`estado estado-entrega-${p.estado_entrega.toLowerCase()}`}
                          >
                            {p.estado_entrega}
                          </span>
                        </td>
                        <td>
                          {p.estado_entrega === 'ENTREGADO' ||
                          p.estado_entrega === 'FALLIDO' ? (
                            /* Una entrega cerrada es un registro:
                               no se puede volver atrás. */
                            <span className="entrega-cerrada">
                              {p.estado_entrega === 'ENTREGADO'
                                ? 'Entregado'
                                : 'No entregado'}
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  marcarEntrega(
                                    p.id_pedido,
                                    'ENTREGADO'
                                  )
                                }
                              >
                                Entregar
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  marcarEntrega(
                                    p.id_pedido,
                                    'FALLIDO'
                                  )
                                }
                              >
                                Fallar
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
        </>
      )}

    </main>
  )
}
