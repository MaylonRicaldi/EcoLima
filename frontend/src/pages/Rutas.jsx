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
} from '../services/operacion'
import Esqueleto from '../components/Esqueleto'


export default function Rutas() {
  const [rutas, setRutas] = useState([])
  const [rutaActual, setRutaActual] = useState(null)

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

      if (data.length > 0) {
        await seleccionarRuta(data[0].id_ruta)
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
      const [t, i] = await Promise.all([
        listarTrafico(),
        listarIncidentes('ACTIVO'),
      ])

      setTrafico(t)
      setIncidentes(i)
    } catch {
      setTrafico([])
      setIncidentes([])
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
