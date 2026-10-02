import { useEffect, useState } from 'react'
import {
  listarConductores,
  crearConductor,
  actualizarConductor,
  cambiarEstadoConductor,
  listarLicencias,
  crearLicencia,
  actualizarLicencia,
  cambiarEstadoLicencia,
} from '../services/conductores'

function Conductores() {
  const [conductores, setConductores] = useState([])
  const [conductorEditando, setConductorEditando] = useState(null)

  const [licencias, setLicencias] = useState([])
  const [conductorLicencias, setConductorLicencias] = useState(null)

  const [mostrarLicencia, setMostrarLicencia] = useState(false)
  const [licenciaEditando, setLicenciaEditando] = useState(null)

  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const formularioInicial = {
    id_usuario: '',
    dni: '',
    nombre: '',
    apellido: '',
    telefono: '',
    anios_experiencia: '',
    hora_disponibilidad_inicio: '06:00',
    hora_disponibilidad_fin: '18:00',
    horas_max_conduccion: '8',
    horas_conduccion_acumuladas: '0',
    estado: 'DISPONIBLE',
  }

  const licenciaInicial = {
    numero: '',
    categoria: 'A-I',
    fecha_emision: '',
    fecha_vencimiento: '',
    estado: 'VIGENTE',
  }

  const [formulario, setFormulario] = useState(formularioInicial)
  const [formularioLicencia, setFormularioLicencia] =
    useState(licenciaInicial)

  async function cargarConductores() {
    try {
      setCargando(true)
      const data = await listarConductores()
      setConductores(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarConductores()
  }, [])

  function cambiarCampo(event) {
    const { name, value } = event.target

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }))
  }

  function cambiarCampoLicencia(event) {
    const { name, value } = event.target

    setFormularioLicencia((actual) => ({
      ...actual,
      [name]: value,
    }))
  }

  function limpiarFormulario() {
    setFormulario(formularioInicial)
    setConductorEditando(null)
  }

  async function guardarConductor(event) {
    event.preventDefault()

    setMensaje('')
    setError('')

    const datos = {
      id_usuario: Number(formulario.id_usuario),
      dni: formulario.dni,
      nombre: formulario.nombre,
      apellido: formulario.apellido,
      telefono: formulario.telefono || null,
      anios_experiencia: Number(formulario.anios_experiencia),
      hora_disponibilidad_inicio:
        formulario.hora_disponibilidad_inicio,
      hora_disponibilidad_fin:
        formulario.hora_disponibilidad_fin,
      horas_max_conduccion:
        Number(formulario.horas_max_conduccion),
      horas_conduccion_acumuladas:
        Number(formulario.horas_conduccion_acumuladas),
      estado: formulario.estado,
    }

    try {
      if (conductorEditando) {
        await actualizarConductor(
          conductorEditando.id_conductor,
          datos
        )

        setMensaje('Conductor actualizado correctamente')
      } else {
        await crearConductor(datos)

        setMensaje('Conductor registrado correctamente')
      }

      limpiarFormulario()
      await cargarConductores()
    } catch (err) {
      setError(err.message)
    }
  }

  function editarConductor(conductor) {
    setMensaje('')
    setError('')
    setConductorEditando(conductor)

    setFormulario({
      id_usuario: String(conductor.id_usuario),
      dni: conductor.dni,
      nombre: conductor.nombre,
      apellido: conductor.apellido,
      telefono: conductor.telefono || '',
      anios_experiencia: String(conductor.anios_experiencia),
      hora_disponibilidad_inicio:
        String(conductor.hora_disponibilidad_inicio).slice(0, 5),
      hora_disponibilidad_fin:
        String(conductor.hora_disponibilidad_fin).slice(0, 5),
      horas_max_conduccion:
        String(conductor.horas_max_conduccion),
      horas_conduccion_acumuladas:
        String(conductor.horas_conduccion_acumuladas),
      estado: conductor.estado,
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function cambiarEstado(conductor) {
    const estadoReal =
      conductor.estado === 'DISPONIBLE'
        ? 'INACTIVO'
        : 'DISPONIBLE'

    try {
      setMensaje('')
      setError('')

      await cambiarEstadoConductor(
        conductor.id_conductor,
        estadoReal
      )

      setMensaje('Estado del conductor actualizado')
      await cargarConductores()
    } catch (err) {
      setError(err.message)
    }
  }

  async function verLicencias(conductor) {
    try {
      setMensaje('')
      setError('')

      const data = await listarLicencias(
        conductor.id_conductor
      )

      setLicencias(data)
      setConductorLicencias(conductor)
      setMostrarLicencia(false)
      setLicenciaEditando(null)
    } catch (err) {
      setError(err.message)
    }
  }

  function nuevaLicencia() {
    setFormularioLicencia(licenciaInicial)
    setLicenciaEditando(null)
    setMostrarLicencia(true)
  }

  async function guardarLicencia(event) {
    event.preventDefault()

    if (!conductorLicencias) return

    setMensaje('')
    setError('')

    const datos = {
      id_conductor: conductorLicencias.id_conductor,
      numero: formularioLicencia.numero,
      categoria: formularioLicencia.categoria,
      fecha_emision: formularioLicencia.fecha_emision,
      fecha_vencimiento:
        formularioLicencia.fecha_vencimiento,
      estado: formularioLicencia.estado,
    }

    try {
      if (licenciaEditando) {
        await actualizarLicencia(
          conductorLicencias.id_conductor,
          licenciaEditando.id_licencia,
          datos
        )

        setMensaje('Licencia actualizada correctamente')
      } else {
        await crearLicencia(
          conductorLicencias.id_conductor,
          datos
        )

        setMensaje('Licencia registrada correctamente')
      }

      const nuevasLicencias = await listarLicencias(
        conductorLicencias.id_conductor
      )

      setLicencias(nuevasLicencias)
      setFormularioLicencia(licenciaInicial)
      setLicenciaEditando(null)
      setMostrarLicencia(false)
    } catch (err) {
      setError(err.message)
    }
  }

  function editarLicencia(licencia) {
    setLicenciaEditando(licencia)
    setFormularioLicencia({
      numero: licencia.numero,
      categoria: licencia.categoria,
      fecha_emision: licencia.fecha_emision,
      fecha_vencimiento:
        licencia.fecha_vencimiento,
      estado: licencia.estado,
    })

    setMostrarLicencia(true)
  }

  async function cambiarEstadoDeLicencia(licencia) {
    const nuevoEstado =
      licencia.estado === 'VIGENTE'
        ? 'SUSPENDIDA'
        : 'VIGENTE'

    try {
      setMensaje('')
      setError('')

      await cambiarEstadoLicencia(
        conductorLicencias.id_conductor,
        licencia.id_licencia,
        nuevoEstado
      )

      const nuevasLicencias = await listarLicencias(
        conductorLicencias.id_conductor
      )

      setLicencias(nuevasLicencias)
      setMensaje('Estado de licencia actualizado')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main>
      <h1>Gestión de conductores</h1>

      {mensaje && <p>{mensaje}</p>}
      {error && <p>{error}</p>}

      <section>
        <h2>
          {conductorEditando
            ? 'Editar conductor'
            : 'Registrar conductor'}
        </h2>

        <form onSubmit={guardarConductor}>
          <div>
            <label>ID usuario</label>
            <input
              name="id_usuario"
              type="number"
              min="1"
              value={formulario.id_usuario}
              onChange={cambiarCampo}
              required
            />
          </div>

          <div>
            <label>DNI</label>
            <input
              name="dni"
              maxLength="8"
              value={formulario.dni}
              onChange={cambiarCampo}
              required
            />
          </div>

          <div>
            <label>Nombre</label>
            <input
              name="nombre"
              value={formulario.nombre}
              onChange={cambiarCampo}
              required
            />
          </div>

          <div>
            <label>Apellido</label>
            <input
              name="apellido"
              value={formulario.apellido}
              onChange={cambiarCampo}
              required
            />
          </div>

          <div>
            <label>Teléfono</label>
            <input
              name="telefono"
              value={formulario.telefono}
              onChange={cambiarCampo}
            />
          </div>

          <div>
            <label>Años de experiencia</label>
            <input
              name="anios_experiencia"
              type="number"
              min="0"
              value={formulario.anios_experiencia}
              onChange={cambiarCampo}
              required
            />
          </div>

          <div>
            <label>Disponibilidad desde</label>
            <input
              name="hora_disponibilidad_inicio"
              type="time"
              value={
                formulario.hora_disponibilidad_inicio
              }
              onChange={cambiarCampo}
              required
            />
          </div>

          <div>
            <label>Disponibilidad hasta</label>
            <input
              name="hora_disponibilidad_fin"
              type="time"
              value={
                formulario.hora_disponibilidad_fin
              }
              onChange={cambiarCampo}
              required
            />
          </div>

          <div>
            <label>Horas máximas de conducción</label>
            <input
              name="horas_max_conduccion"
              type="number"
              min="0.1"
              max="8"
              step="0.1"
              value={
                formulario.horas_max_conduccion
              }
              onChange={cambiarCampo}
              required
            />
          </div>

          <div>
            <label>Horas acumuladas</label>
            <input
              name="horas_conduccion_acumuladas"
              type="number"
              min="0"
              step="0.1"
              value={
                formulario.horas_conduccion_acumuladas
              }
              onChange={cambiarCampo}
              required
            />
          </div>

          <div>
            <label>Estado</label>
            <select
              name="estado"
              value={formulario.estado}
              onChange={cambiarCampo}
            >
              <option value="DISPONIBLE">
                DISPONIBLE
              </option>
              <option value="EN_RUTA">
                EN_RUTA
              </option>
              <option value="DESCANSO">
                DESCANSO
              </option>
              <option value="INACTIVO">
                INACTIVO
              </option>
            </select>
          </div>

          <button type="submit">
            {conductorEditando
              ? 'Actualizar conductor'
              : 'Registrar conductor'}
          </button>

          {conductorEditando && (
            <button
              type="button"
              onClick={limpiarFormulario}
            >
              Cancelar
            </button>
          )}
        </form>
      </section>

      <hr />

      <section>
        <h2>Conductores registrados</h2>

        {cargando ? (
          <p>Cargando conductores...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>DNI</th>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Experiencia</th>
                <th>Disponibilidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {conductores.map((conductor) => (
                <tr key={conductor.id_conductor}>
                  <td>{conductor.id_conductor}</td>
                  <td>{conductor.dni}</td>
                  <td>
                    {conductor.nombre}{' '}
                    {conductor.apellido}
                  </td>
                  <td>
                    {conductor.usuario_email}
                  </td>
                  <td>
                    {conductor.anios_experiencia} años
                  </td>
                  <td>
                    {String(
                      conductor.hora_disponibilidad_inicio
                    ).slice(0, 5)}
                    {' - '}
                    {String(
                      conductor.hora_disponibilidad_fin
                    ).slice(0, 5)}
                  </td>
                  <td>
                    <span
                      className={`estado estado-${conductor.estado.toLowerCase()}`}
                    >
                      {conductor.estado}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        editarConductor(conductor)
                      }
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        cambiarEstado(conductor)
                      }
                    >
                      Cambiar estado
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        verLicencias(conductor)
                      }
                    >
                      Licencias
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {conductorLicencias && (
        <>
          <hr />

          <section>
            <h2>
              Licencias de{' '}
              {conductorLicencias.nombre}{' '}
              {conductorLicencias.apellido}
            </h2>

            <button
              type="button"
              onClick={nuevaLicencia}
            >
              Nueva licencia
            </button>

            {mostrarLicencia && (
              <form onSubmit={guardarLicencia}>
                <h3>
                  {licenciaEditando
                    ? 'Editar licencia'
                    : 'Registrar licencia'}
                </h3>

                <div>
                  <label>Número</label>
                  <input
                    name="numero"
                    value={
                      formularioLicencia.numero
                    }
                    onChange={cambiarCampoLicencia}
                    required
                  />
                </div>

                <div>
                  <label>Categoría</label>
                  <select
                    name="categoria"
                    value={
                      formularioLicencia.categoria
                    }
                    onChange={cambiarCampoLicencia}
                  >
                    <option value="A-I">A-I</option>
                    <option value="A-IIA">A-IIA</option>
                    <option value="A-IIB">A-IIB</option>
                    <option value="A-IIIA">A-IIIA</option>
                    <option value="A-IIIB">A-IIIB</option>
                    <option value="A-IIIC">A-IIIC</option>
                  </select>
                </div>

                <div>
                  <label>Fecha de emisión</label>
                  <input
                    name="fecha_emision"
                    type="date"
                    value={
                      formularioLicencia.fecha_emision
                    }
                    onChange={cambiarCampoLicencia}
                    required
                  />
                </div>

                <div>
                  <label>Fecha de vencimiento</label>
                  <input
                    name="fecha_vencimiento"
                    type="date"
                    value={
                      formularioLicencia
                        .fecha_vencimiento
                    }
                    onChange={cambiarCampoLicencia}
                    required
                  />
                </div>

                <div>
                  <label>Estado</label>
                  <select
                    name="estado"
                    value={
                      formularioLicencia.estado
                    }
                    onChange={cambiarCampoLicencia}
                  >
                    <option value="VIGENTE">
                      VIGENTE
                    </option>
                    <option value="VENCIDA">
                      VENCIDA
                    </option>
                    <option value="SUSPENDIDA">
                      SUSPENDIDA
                    </option>
                  </select>
                </div>

                <button type="submit">
                  {licenciaEditando
                    ? 'Actualizar licencia'
                    : 'Registrar licencia'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMostrarLicencia(false)
                    setLicenciaEditando(null)
                  }}
                >
                  Cancelar
                </button>
              </form>
            )}

            <h3>Licencias registradas</h3>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Número</th>
                  <th>Categoría</th>
                  <th>Emisión</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {licencias.map((licencia) => (
                  <tr key={licencia.id_licencia}>
                    <td>{licencia.id_licencia}</td>
                    <td>{licencia.numero}</td>
                    <td>{licencia.categoria}</td>
                    <td>{licencia.fecha_emision}</td>
                    <td>
                      {licencia.fecha_vencimiento}
                    </td>
                    <td>
                      <span
                        className={`estado estado-${licencia.estado.toLowerCase()}`}
                      >
                        {licencia.estado}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          editarLicencia(licencia)
                        }
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          cambiarEstadoDeLicencia(
                            licencia
                          )
                        }
                      >
                        Cambiar estado
                      </button>
                    </td>
                  </tr>
                ))}

                {licencias.length === 0 && (
                  <tr>
                    <td colSpan="7">
                      No hay licencias registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </main>
  )
}

export default Conductores