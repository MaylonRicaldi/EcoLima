import { useEffect, useState } from 'react'

import {
  listarTrafico,
  registrarTrafico,
  listarIncidentes,
  registrarIncidente,
  cambiarEstadoIncidente,
} from '../services/operacion'
import Esqueleto from '../components/Esqueleto'


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

  const [formTrafico, setFormTrafico] = useState(traficoInicial)
  const [formIncidente, setFormIncidente] =
    useState(incidenteInicial)

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')


  async function cargar() {
    try {
      setCargando(true)
      setError('')

      const [t, i] = await Promise.all([
        listarTrafico(),
        listarIncidentes(),
      ])

      setTrafico(t)
      setIncidentes(i)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
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
      setMensaje('Incidente registrado.')

      await cargar()
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


      <section className="formulario-trafico">
        <h2>Registrar tramo de tráfico</h2>

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
              Latitud

              <input
                type="number"
                step="0.0000001"
                name="latitud"
                value={formTrafico.latitud}
                onChange={(e) =>
                  setFormTrafico((a) => ({
                    ...a,
                    latitud: e.target.value,
                  }))
                }
                min="-13"
                max="-11"
                required
              />
            </label>

            <label>
              Longitud

              <input
                type="number"
                step="0.0000001"
                name="longitud"
                value={formTrafico.longitud}
                onChange={(e) =>
                  setFormTrafico((a) => ({
                    ...a,
                    longitud: e.target.value,
                  }))
                }
                min="-78"
                max="-76"
                required
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
          Los conductores pueden reportar averías,
          accidentes o bloqueos desde aquí. El sistema
          evaluará si alguna ruta afectada necesita corregir
          su recorrido.
        </p>

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

            <label>
              Latitud

              <input
                type="number"
                step="0.0000001"
                name="latitud"
                value={formIncidente.latitud}
                onChange={(e) =>
                  setFormIncidente((a) => ({
                    ...a,
                    latitud: e.target.value,
                  }))
                }
                min="-13"
                max="-11"
                required
              />
            </label>

            <label>
              Longitud

              <input
                type="number"
                step="0.0000001"
                name="longitud"
                value={formIncidente.longitud}
                onChange={(e) =>
                  setFormIncidente((a) => ({
                    ...a,
                    longitud: e.target.value,
                  }))
                }
                min="-78"
                max="-76"
                required
              />
            </label>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              disabled={guardando}
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
