import { useEffect, useState } from 'react'

import {
  actualizarVentanaTiempo,
  crearVentanaTiempo,
  eliminarVentanaTiempo,
  listarVentanasTiempo,
} from '../services/clientes'
import Esqueleto from './Esqueleto'

/* Horario operativo de la empresa: la operación se restringe a
   estas dos horas. */
const HORA_MIN = '05:00'
const HORA_MAX = '22:00'

/* Costo por minuto de retraso de la entrega. */
const PENALIZACION_POR_MINUTO = '0.50'

/* Propuesta de jornada: bloques de 4 horas separados por 1 hora de
   descanso. El máximo legal de jornada son 8 horas, así que la
   propuesta suma justo 8. Se ofrece como atajo, no se aplica
   sola: el usuario puede cambiarla o escribir las suyas. */
const JORNADA_SUGERIDA = [
  { hora_inicio: '05:00', hora_fin: '09:00' },
  { hora_inicio: '10:00', hora_fin: '14:00' },
]

const ventanaVacia = {
  hora_inicio: '08:00',
  hora_fin: '12:00',
  tolerancia_minutos: 15,
  penalizacion_por_minuto: PENALIZACION_POR_MINUTO,
}


function duracion(ventana) {
  const [hi, mi] = ventana.hora_inicio.split(':').map(Number)
  const [hf, mf] = ventana.hora_fin.split(':').map(Number)

  const minutos = hf * 60 + mf - (hi * 60 + mi)

  if (minutos <= 0) {
    return '—'
  }

  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60

  if (horas === 0) {
    return `${resto} min`
  }

  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}


/* Valida en el navegador lo mismo que valida el backend, para no
   enviar una petición que va a ser rechazada. */
function validar(ventana) {
  if (!ventana.hora_inicio || !ventana.hora_fin) {
    return 'Complete las dos horas.'
  }

  if (ventana.hora_fin <= ventana.hora_inicio) {
    return 'La hora de fin debe ser posterior a la de inicio.'
  }

  if (ventana.hora_inicio < HORA_MIN) {
    return `La ventana no puede empezar antes de las ${HORA_MIN}.`
  }

  if (ventana.hora_fin > HORA_MAX) {
    return `La ventana no puede terminar después de las ${HORA_MAX}.`
  }

  if (Number(ventana.tolerancia_minutos) < 0) {
    return 'La tolerancia no puede ser negativa.'
  }

  if (Number(ventana.penalizacion_por_minuto) < 0) {
    return 'La penalización no puede ser negativa.'
  }

  return ''
}


/**
 * Gestión de ventanas de tiempo.
 *
 * Antes sólo existía lectura. Sin ventanas el formulario de pedidos
 * no tenía qué ofrecer como selección, así que aquí se configuran.
 */
export default function GestorVentanas({ puedeEditar = false }) {
  const [ventanas, setVentanas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  const [formulario, setFormulario] = useState(null)
  const [editando, setEditando] = useState(null)

  /* El primer await va antes de cualquier setState: así la carga
     inicial no dispara un render en cascada y el componente nace
     con `cargando` en true, sin parpadeo. */
  async function cargar() {
    try {
      const datos = await listarVentanasTiempo()

      setVentanas(datos)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  /* La carga inicial se encadena con then en vez de llamar a cargar()
     por dos razones: dentro del efecto no se toca el estado de forma
     síncrona (evita un render en cascada) y el flag `vigente` impide
     actualizar si el componente ya se desmontó. */
  useEffect(() => {
    let vigente = true

    listarVentanasTiempo()
      .then((datos) => {
        if (!vigente) {
          return
        }

        setVentanas(datos)
        setCargando(false)
      })
      .catch((err) => {
        if (!vigente) {
          return
        }

        setError(err.message)
        setCargando(false)
      })

    return () => {
      vigente = false
    }
  }, [])

  function avisar(texto) {
    setMensaje(texto)
    setTimeout(() => setMensaje(''), 3500)
  }

  function abrirNueva() {
    setEditando(null)
    setError('')
    setFormulario({ ...ventanaVacia })
  }

  function abrirEdicion(ventana) {
    setError('')
    setFormulario({
      hora_inicio: ventana.hora_inicio,
      hora_fin: ventana.hora_fin,
      tolerancia_minutos: String(ventana.tolerancia_minutos),
      penalizacion_por_minuto: String(
        ventana.penalizacion_por_minuto
      ),
    })
    setEditando(ventana.id_ventana)
  }

  function cerrar() {
    setFormulario(null)
    setEditando(null)
    setError('')
  }

  async function guardar(event) {
    event.preventDefault()

    const falla = validar(formulario)

    if (falla) {
      setError(falla)
      return
    }

    const datos = {
      hora_inicio: formulario.hora_inicio,
      hora_fin: formulario.hora_fin,
      tolerancia_minutos: Number(formulario.tolerancia_minutos),
      penalizacion_por_minuto: Number(
        formulario.penalizacion_por_minuto
      ),
    }

    try {
      setGuardando(true)
      setError('')

      if (editando) {
        await actualizarVentanaTiempo(editando, datos)
        avisar('Ventana actualizada.')
      } else {
        await crearVentanaTiempo(datos)
        avisar('Ventana creada.')
      }

      cerrar()
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function borrar(ventana) {
    if (
      !window.confirm(
        `¿Eliminar la ventana ${ventana.hora_inicio} - ` +
          `${ventana.hora_fin}?`
      )
    ) {
      return
    }

    try {
      setError('')

      await eliminarVentanaTiempo(ventana.id_ventana)

      avisar('Ventana eliminada.')

      if (editando === ventana.id_ventana) {
        cerrar()
      }

      await cargar()
    } catch (err) {
      /* El backend responde 409 si la ventana ya la usan pedidos. */
      setError(err.message)

      await cargar()
    }
  }

  /* Aplica la jornada sugerida sin duplicar horas ya existentes. */
  async function aplicarSugerencia() {
    const existentes = ventanas.map(
      (v) => `${v.hora_inicio}-${v.hora_fin}`
    )

    const faltantes = JORNADA_SUGERIDA.filter(
      (s) =>
        !existentes.includes(`${s.hora_inicio}-${s.hora_fin}`)
    )

    if (faltantes.length === 0) {
      setError('Las dos ventanas sugeridas ya existen.')
      return
    }

    try {
      setGuardando(true)
      setError('')

      for (const ventana of faltantes) {
        await crearVentanaTiempo({
          ...ventana,
          tolerancia_minutos: 15,
          penalizacion_por_minuto: Number(PENALIZACION_POR_MINUTO),
        })
      }

      avisar(
        `Se agregaron ${faltantes.length} ventanas de la propuesta.`
      )

      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }


  return (
    <section className="gestor-ventanas">

      <div className="gestor-ventanas-cabecera">
        <div>
          <h2>Ventanas de tiempo</h2>

          <p className="gestor-ventanas-sub">
            Cada pedido se entrega dentro de una de estas
            ventanas. Fuera de ventana se aplica la
            penalización por minuto de retraso. El horario de
            atención va de 05:00 a 22:00.
          </p>
        </div>

        {puedeEditar && (
          <div className="gestor-ventanas-acciones">
            <button
              type="button"
              className="boton-secundario"
              onClick={aplicarSugerencia}
              disabled={guardando}
              title={
                '4 h de trabajo, 1 h de descanso y otras 4 h ' +
                'de trabajo: 8 h en total'
              }
            >
              Jornada sugerida
            </button>

            <button
              type="button"
              className="boton-principal"
              onClick={abrirNueva}
              disabled={formulario !== null}
            >
              Nueva ventana
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mensaje error">{error}</div>
      )}

      {mensaje && (
        <div className="mensaje exito">{mensaje}</div>
      )}

      {formulario && (
        <form
          className="formulario-ventana"
          onSubmit={guardar}
        >
          <h3>
            {editando ? 'Editar ventana' : 'Nueva ventana'}
          </h3>

          <div className="formulario-ventana-campos">
            <label>
              Hora de inicio

              <input
                type="time"
                name="hora_inicio"
                value={formulario.hora_inicio}
                min={HORA_MIN}
                max={HORA_MAX}
                step={900}
                onChange={(e) =>
                  setFormulario((a) => ({
                    ...a,
                    hora_inicio: e.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Hora de fin

              <input
                type="time"
                name="hora_fin"
                value={formulario.hora_fin}
                min={HORA_MIN}
                max={HORA_MAX}
                step={900}
                onChange={(e) =>
                  setFormulario((a) => ({
                    ...a,
                    hora_fin: e.target.value,
                  }))
                }
                required
              />
            </label>

            <label>
              Tolerancia (min)

              <input
                type="number"
                name="tolerancia_minutos"
                value={formulario.tolerancia_minutos}
                min="0"
                step="5"
                onChange={(e) =>
                  setFormulario((a) => ({
                    ...a,
                    tolerancia_minutos: e.target.value,
                  }))
                }
              />
            </label>

            <label>
              Penalización (S/ por min)

              <input
                type="number"
                name="penalizacion_por_minuto"
                value={formulario.penalizacion_por_minuto}
                min="0"
                step="0.05"
                onChange={(e) =>
                  setFormulario((a) => ({
                    ...a,
                    penalizacion_por_minuto: e.target.value,
                  }))
                }
              />
            </label>
          </div>

          <p className="instruccion-mapa">
            La penalización documentada es S/ 0.50 por minuto de
            retraso. El límite operativo es {HORA_MIN} - {HORA_MAX}.
          </p>

          <div className="formulario-acciones">
            <button
              type="submit"
              className="boton-principal"
              disabled={guardando}
            >
              {guardando
                ? 'Guardando...'
                : editando
                  ? 'Guardar cambios'
                  : 'Crear ventana'}
            </button>

            <button
              type="button"
              className="boton-secundario"
              onClick={cerrar}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <Esqueleto texto="ventanas de tiempo" filas={3} />
      ) : ventanas.length === 0 ? (
        <div className="ventanas-vacias vacio">
          <strong>
            No hay ventanas de tiempo configuradas
          </strong>

          <p>
            Sin ventanas no se puede registrar ningún pedido, porque
            cada pedido debe entregarse dentro de una ventana.
          </p>

          {puedeEditar && (
            <div className="ventanas-vacias-acciones">
              <button
                type="button"
                className="boton-secundario"
                onClick={aplicarSugerencia}
                disabled={guardando}
              >
                Usar jornada sugerida
              </button>

              <button
                type="button"
                className="boton-principal"
                onClick={abrirNueva}
              >
                Crear la primera ventana
              </button>
            </div>
          )}
        </div>
      ) : (
        <ul className="lista-ventanas">
          {ventanas.map((ventana) => {
            const enUso = Number(ventana.pedidos_asociados) > 0

            return (
              <li
                key={ventana.id_ventana}
                className={
                  editando === ventana.id_ventana
                    ? 'ventana en-edicion'
                    : 'ventana'
                }
              >
                <div className="ventana-horario">
                  <span className="ventana-hora">
                    {ventana.hora_inicio}
                  </span>

                  <span className="ventana-guion" />

                  <span className="ventana-hora">
                    {ventana.hora_fin}
                  </span>
                </div>

                <div className="ventana-datos">
                  <span>
                    {duracion(ventana)}
                  </span>

                  <span>
                    tolerancia {ventana.tolerancia_minutos} min
                  </span>

                  <span>
                    S/{' '}
                    {Number(
                      ventana.penalizacion_por_minuto
                    ).toFixed(2)}{' '}
                    por min
                  </span>
                </div>

                <div className="ventana-uso">
                  {enUso ? (
                    <span className="badge-en-uso">
                      {ventana.pedidos_asociados} pedido(s)
                    </span>
                  ) : (
                    <span className="badge-libre">Sin usar</span>
                  )}
                </div>

                {puedeEditar && (
                  <div className="ventana-acciones">
                    <button
                      type="button"
                      className="boton-icono"
                      onClick={() => abrirEdicion(ventana)}
                      aria-label="Editar ventana"
                      title="Editar"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      className="boton-icono peligro"
                      onClick={() => borrar(ventana)}
                      disabled={enUso}
                      aria-label="Eliminar ventana"
                      title={
                        enUso
                          ? 'No se puede eliminar: hay pedidos ' +
                            'que la usan'
                          : 'Eliminar'
                      }
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
