import { useEffect, useState } from 'react'
import {
  listarConductores,
  crearConductor,
  actualizarConductor,
  cambiarEstadoConductor,
  listarLicencias,
  listarVehiculosCompatibles,
  crearLicencia,
  actualizarLicencia,
  cambiarEstadoLicencia,
} from '../services/conductores'
import Esqueleto from '../components/Esqueleto'
import Modal from '../components/Modal'

function Conductores() {
  const [conductores, setConductores] = useState([])
  const [conductorEditando, setConductorEditando] = useState(null)
  const [modalConductor, setModalConductor] = useState(false)

  const [licencias, setLicencias] = useState([])
  const [conductorLicencias, setConductorLicencias] = useState(null)

  const [mostrarLicencia, setMostrarLicencia] = useState(false)
  const [licenciaEditando, setLicenciaEditando] = useState(null)

  const [habilitacion, setHabilitacion] = useState(null)

  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const formularioInicial = {
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
    categoria: 'B-IIB',
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
    setModalConductor(false)
  }


  function abrirRegistro() {
    limpiarFormulario()

    setMensaje('')
    setError('')
    setModalConductor(true)
  }

  async function guardarConductor(event) {
    event.preventDefault()

    setMensaje('')
    setError('')

    const datos = {
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
    setModalConductor(true)

    setFormulario({
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


  /* Muestra, para un conductor, qué vehículos de la flota puede
     manejar y cuáles no, con el motivo de cada bloqueo. */
  async function verHabilitacion(conductor) {
    try {
      setMensaje('')
      setError('')

      setHabilitacion({
        cargando: true,
        conductor,
        datos: null,
      })

      const data = await listarVehiculosCompatibles(
        conductor.id_conductor
      )

      setHabilitacion({
        cargando: false,
        conductor,
        datos: data,
      })
    } catch (err) {
      setError(err.message)

      setHabilitacion(null)
    }
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
      <div className="pagina-header">
        <div>
          <h1>Gestión de conductores</h1>

          <p>
            Personal de reparto y licencias de conducir.
          </p>
        </div>

        <button
          className="boton-principal"
          onClick={abrirRegistro}
        >
          Registrar conductor
        </button>
      </div>

      {mensaje && <p>{mensaje}</p>}
      {error && <p>{error}</p>}

      <Modal
        abierto={modalConductor}
        onCerrar={limpiarFormulario}
        titulo={
          conductorEditando
            ? 'Editar conductor'
            : 'Registrar conductor'
        }
        descripcion={
          'El conductor es un registro de la operación: se guarda ' +
          'solo, sin necesidad de una cuenta de acceso al sistema.'
        }
      >

        <form onSubmit={guardarConductor}>
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
              Cerrar
            </button>
          )}
        </form>
      </Modal>

      <section>
        <h2>Conductores registrados</h2>

        {cargando ? (
          <Esqueleto texto="conductores" tipo="filas" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>DNI</th>
                <th>Nombre</th>
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

                    <button
                      type="button"
                      onClick={() =>
                        verHabilitacion(conductor)
                      }
                    >
                      Qué puede manejar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {habilitacion && (
        <section>
          <h2>
            Qué puede manejar{' '}
            {habilitacion.conductor.nombre}{' '}
            {habilitacion.conductor.apellido}
          </h2>

          <p className="instruccion-mapa">
            Se cruza la categoría de sus licencias vigentes con el
            tipo de cada vehículo de la flota. Un conductor sin la
            licencia habilitante no puede recibir ese vehículo en una
            ruta.
          </p>

          {habilitacion.cargando ? (
            <Esqueleto texto="vehículos" filas={3} />
          ) : (
            <>
              <div className="licencias-conductor">
                <strong>Licencias vigentes:</strong>

                {habilitacion.datos.categorias_licencia.length ===
                0 ? (
                  <span className="sin-licencia">
                    ninguna vigente
                  </span>
                ) : (
                  habilitacion.datos.categorias_licencia.map(
                    (categoria) => (
                      <span
                        key={categoria}
                        className="chip-licencia"
                      >
                        {categoria}
                      </span>
                    )
                  )
                )}
              </div>

              <ul className="lista-habilitacion">
                {habilitacion.datos.vehiculos.map((vehiculo) => (
                  <li
                    key={vehiculo.id_vehiculo}
                    className={
                      vehiculo.habilitado
                        ? 'habilitacion-item si'
                        : 'habilitacion-item no'
                    }
                  >
                    <span className="habilitacion-placa">
                      {vehiculo.placa}
                    </span>

                    <span className="habilitacion-tipo">
                      {vehiculo.tipo_vehiculo}
                    </span>

                    <span className="habilitacion-detalle">
                      {vehiculo.habilitado
                        ? `${vehiculo.capacidad_kg} kg · ` +
                          `${vehiculo.capacidad_m3} m³`
                        : vehiculo.motivo}
                    </span>

                    <span
                      className={
                        vehiculo.habilitado
                          ? 'chip-si'
                          : 'chip-no'
                      }
                    >
                      {vehiculo.habilitado
                        ? 'Puede'
                        : 'No puede'}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={() => setHabilitacion(null)}
            >
              Cerrar
            </button>
          </div>
        </section>
      )}

      {conductorLicencias && (
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

            <Modal
              abierto={mostrarLicencia}
              onCerrar={() => {
                setMostrarLicencia(false)
                setLicenciaEditando(null)
              }}
              titulo={
                licenciaEditando
                  ? 'Editar licencia'
                  : 'Registrar licencia'
              }
              descripcion={`Licencias de ${conductorLicencias.nombre} ${conductorLicencias.apellido}`}
            >
              <form onSubmit={guardarLicencia}>

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
                    <optgroup label="Clase A · autos, camionetas, camiones y buses">
                      <option value="A-I">
                        A-I · autos particulares
                      </option>

                      <option value="A-IIA">
                        A-IIa · autos y transporte público
                      </option>

                      <option value="A-IIB">
                        A-IIb · combis, microbuses y camiones
                      </option>

                      <option value="A-IIIA">
                        A-IIIa · buses interprovinciales
                      </option>

                      <option value="A-IIIB">
                        A-IIIb · carga pesada y trailers
                      </option>

                      <option value="A-IIIC">
                        A-IIIc · máxima categoría
                      </option>
                    </optgroup>

                    <optgroup label="Clase B · motos y mototaxis">
                      <option value="B-I">
                        B-I · baja cilindrada o eléctricas
                      </option>

                      <option value="B-IIA">
                        B-IIa · bicimotos y motos adaptadas
                      </option>

                      <option value="B-IIB">
                        B-IIb · motos de dos ruedas (delivery)
                      </option>

                      <option value="B-IIC">
                        B-IIc · mototaxis y trimotos
                      </option>
                    </optgroup>
                  </select>

                  <small className="ayuda-campo">
                    Un brevete de clase A no habilita para manejar
                    una moto, ni uno de clase B para un camión.
                  </small>
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
                  Cerrar
                </button>
              </form>
            </Modal>

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
      )}
    </main>
  )
}

export default Conductores
