import { useEffect, useState } from 'react'

import MapaRuta from '../components/MapaRuta'

import {
  listarAsignaciones,
  obtenerRuta,
  actualizarEntrega,
  registrarIncidente,
  listarIncidentes,
  rutasPendientesReoptimizacion,
} from '../services/operacion'
import Esqueleto from '../components/Esqueleto'


/**
 * Modo Conductor (RES-07 / RNF-03 / RNF-05).
 *
 * Pantalla única y simplificada para el conductor: letra grande,
 * botones anchos, lenguaje claro y la ruta en el mapa. Está pensada
 * para uso en el vehículo y en pantallas pequeñas.
 */
export default function Conductor() {
  const [ruta, setRuta] = useState(null)
  const [incidentes, setIncidentes] = useState([])
  const [pendientes, setPendientes] = useState([])

  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [reporte, setReporte] = useState(false)
  const [tipoIncidente, setTipoIncidente] = useState('AVERIA')


  async function cargar() {
    try {
      setCargando(true)
      setError('')

      const [asig, inc, pend] = await Promise.all([
        listarAsignaciones(),
        listarIncidentes('ACTIVO'),
        rutasPendientesReoptimizacion(),
      ])

      setIncidentes(inc)
      setPendientes(pend)

      // La primera asignación vigente es la ruta a mostrar
      const activa =
        asig.find(
          (a) => a.estado === 'ASIGNADA' || a.estado === 'EN_CURSO'
        ) || asig[0]

      if (activa) {
        setRuta(await obtenerRuta(activa.id_ruta))
      } else {
        setRuta(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }


  useEffect(() => {
    let montado = true

    async function cargarDesdeEfecto() {
      try {
        const [asig, inc, pend] = await Promise.all([
          listarAsignaciones(),
          listarIncidentes('ACTIVO'),
          rutasPendientesReoptimizacion(),
        ])

        if (!montado) {
          return
        }

        setIncidentes(inc)
        setPendientes(pend)

        // La primera asignación vigente es la ruta a mostrar
        const activa =
          asig.find(
            (a) => a.estado === 'ASIGNADA' || a.estado === 'EN_CURSO'
          ) || asig[0]

        if (activa) {
          setRuta(await obtenerRuta(activa.id_ruta))
        } else {
          setRuta(null)
        }
      } catch (err) {
        if (!montado) {
          return
        }

        setError(err.message)
      } finally {
        if (montado) {
          setCargando(false)
        }
      }
    }

    cargarDesdeEfecto()

    return () => {
      montado = false
    }
  }, [])


  async function marcar(idPedido, estado) {
    if (!ruta) {
      return
    }

    try {
      setEnviando(true)
      setError('')
      setMensaje('')

      await actualizarEntrega(ruta.id_ruta, idPedido, estado)

      setMensaje(
        estado === 'ENTREGADO'
          ? `Entrega ${idPedido} marcada como realizada.`
          : `Entrega ${idPedido} marcada como no realizada.`
      )

      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }


  async function enviarReporte() {
    try {
      setEnviando(true)
      setError('')
      setMensaje('')

      // Se reporta en el punto de la primera parada pendiente
      const parada = ruta?.paradas?.find(
        (p) => p.tipo_parada === 'ENTREGA'
      )

      const lat = parada ? parada.latitud : -12.015
      const lon = parada ? parada.longitud : -77.005

      await registrarIncidente({
        tipo: tipoIncidente,
        descripcion:
          `Reporte del conductor en ruta ${ruta?.id_ruta ?? '-'} ` +
          `(${tipoIncidente})`,
        latitud: Number(lat),
        longitud: Number(lon),
        nivel: 'MEDIO',
        fuente: 'MANUAL',
      })

      setReporte(false)
      setMensaje('Reporte enviado. La oficina lo recibirá.')

      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }


  const pendientes_ = ruta?.pedidos?.filter(
    (p) => p.estado_entrega === 'PENDIENTE'
  ) ?? []

  const entregadas = ruta?.pedidos?.filter(
    (p) => p.estado_entrega !== 'PENDIENTE'
  ) ?? []

  if (cargando) {
    return (
      <main>
        <h1>Mi ruta</h1>
        <Esqueleto texto="su recorrido" tipo="tarjetas" />
      </main>
    )
  }


  return (
    <main className="modo-conductor">

      <h1>Mi ruta de hoy</h1>

      {error && (
        <div className="mensaje error">{error}</div>
      )}

      {mensaje && (
        <div className="mensaje exito">{mensaje}</div>
      )}


      {/* ---------- Sin trabajo asignado ---------- */}
      {!ruta && (
        <section className="conductor-espera">
          <h2>Esperando asignación</h2>

          <p className="conductor-grande">
            No tiene rutas asignadas por el momento.
            Cuando la oficina le asigne un
            recorrido, aparecerá aquí.
          </p>

          {pendientes.length > 0 && (
            <p>
              Hay {pendientes.length} ruta(s) en
              la operación que esperan conductor.
            </p>
          )}
        </section>
      )}


      {/* ---------- Con ruta asignada ---------- */}
      {ruta && (
        <>
          <section className="conductor-datos">
            <div className="conductor-dato">
              <span className="conductor-dato-label">
                Vehículo
              </span>
              <strong>
                {ruta.asignacion?.placa ?? '-'}
              </strong>
            </div>

            <div className="conductor-dato">
              <span className="conductor-dato-label">
                Entregas
              </span>
              <strong>
                {pendientes_.length} por hacer
              </strong>
            </div>

            <div className="conductor-dato">
              <span className="conductor-dato-label">
                Distancia
              </span>
              <strong>{ruta.distancia_km} km</strong>
            </div>

            <div className="conductor-dato">
              <span className="conductor-dato-label">
                Estado
              </span>
              <strong>{ruta.estado}</strong>
            </div>
          </section>


          <section>
            <h2>Recorrido en el mapa</h2>

            <MapaRuta
              ruta={ruta}
              pedidos={ruta.pedidos}
              trafico={[]}
              incidentes={incidentes}
              altura="20rem"
            />
          </section>


          <section className="conductor-paradas">
            <h2>
              Paradas ({pendientes_.length} por hacer)
            </h2>

            {ruta.pedidos.length === 0 ? (
              <p>Esta ruta no tiene pedidos.</p>
            ) : (
              <ol className="lista-paradas">
                {ruta.pedidos.map((p) => (
                  <li
                    key={p.id_pedido}
                    className={
                      p.estado_entrega === 'ENTREGADO'
                        ? 'parada-hecha'
                        : p.estado_entrega === 'FALLIDO'
                          ? 'parada-fallida'
                          : 'parada-pendiente'
                    }
                  >
                    <span className="parada-numero">
                      {p.orden_visita}
                    </span>

                    <div className="parada-info">
                      <strong className="parada-direccion">
                        {p.direccion_entrega}
                      </strong>

                      {p.cliente_nombre && (
                        <span className="parada-cliente">
                          Cliente: {p.cliente_nombre}
                        </span>
                      )}

                      <span className="parada-detalle">
                        {p.peso_kg} kg · {p.volumen_m3} m³
                      </span>

                      {p.prioridad === 'EXPRESS' && (
                        <span className="parada-express">
                          EXPRESS
                        </span>
                      )}

                      <span className="parada-estado">
                        {p.estado_entrega}
                      </span>
                    </div>

                    {p.estado_entrega === 'PENDIENTE' && (
                      <div className="parada-acciones">
                        <button
                          type="button"
                          className="boton-realizado"
                          disabled={enviando}
                          onClick={() =>
                            marcar(p.id_pedido, 'ENTREGADO')
                          }
                        >
                          Entregado
                        </button>

                        <button
                          type="button"
                          className="boton-no-realizado"
                          disabled={enviando}
                          onClick={() =>
                            marcar(p.id_pedido, 'FALLIDO')
                          }
                        >
                          No pude
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {entregadas.length > 0 && (
              <p className="conductor-resumen">
                {entregadas.length} entrega(s) ya
                completada(s).
              </p>
            )}
          </section>


          <section className="conductor-reportar">
            <h2>¿Tuvo algún problema?</h2>

            <p>
              Avise a la oficina si hubo avería,
              bloqueo o accidente en la ruta.
            </p>

            {!reporte ? (
              <div className="form-actions">
                <button
                  type="button"
                  className="boton-principal boton-grande"
                  onClick={() => setReporte(true)}
                >
                  Reportar un problema
                </button>
              </div>
            ) : (
              <div className="conductor-form-reporte">
                <label>
                  Tipo de problema

                  <select
                    value={tipoIncidente}
                    onChange={(e) =>
                      setTipoIncidente(e.target.value)
                    }
                  >
                    <option value="AVERIA">
                      Avería del vehículo
                    </option>
                    <option value="BLOQUEO">
                      Vía bloqueada
                    </option>
                    <option value="ACCIDENTE">
                      Accidente
                    </option>
                    <option value="CLIMA">
                      Clima / neblina
                    </option>
                    <option value="ROBO">
                      Robo
                    </option>
                  </select>
                </label>

                <div className="form-actions">
                  <button
                    type="button"
                    className="boton-principal"
                    disabled={enviando}
                    onClick={enviarReporte}
                  >
                    {enviando
                      ? 'Enviando...'
                      : 'Enviar reporte'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setReporte(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

    </main>
  )
}
