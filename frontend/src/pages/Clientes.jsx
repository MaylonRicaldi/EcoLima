import { useEffect, useState } from 'react'

import {
  listarClientes,
  crearCliente,
  actualizarCliente,
  cambiarEstadoCliente,
} from '../services/clientes'

import MapaUbicador from '../components/MapaUbicador'
import Modal from '../components/Modal'
import Esqueleto from '../components/Esqueleto'


const formularioInicial = {
  nombre: '',
  documento: '',
  telefono: '',
  email: '',
  direccion: '',
  referencia: '',
  latitud: '',
  longitud: '',
  horario_apertura: '',
  horario_cierre: '',
  restricciones_acceso: '',
  estado: 'ACTIVO',
  tipo_comercio: 'COMERCIO_MINORISTA',
}

/* Tipo de comercio del cliente.
   La tabla clientes no tiene columna para esto y el proyecto
   decidió no tocar el esquema, así que el dato vive sólo en esta
   pantalla: sirve para clasificar y leer de un vistazo, y se
   reinicia al recargar. */
const TIPOS_COMERCIO = [
  {
    valor: 'COMERCIO_MINORISTA',
    texto: 'Pequeño comerciante',
    ayuda: 'Atiende en su casa o en un local pequeño.',
  },
  {
    valor: 'BODEGA',
    texto: 'Bodega',
    ayuda: 'Abre temprano y suele tener poco personal.',
  },
  {
    valor: 'MERCADO_LOCAL',
    texto: 'Mercado local',
    ayuda: 'Puesto o local dentro de un mercado.',
  },
]


function convertirDatosFormulario(formulario) {
  if (
    formulario.latitud === '' ||
    formulario.longitud === ''
  ) {
    throw new Error(
      'Elija la ubicación del cliente en el mapa'
    )
  }

  return {
    nombre: formulario.nombre,
    documento: formulario.documento || null,
    telefono: formulario.telefono || null,
    email: formulario.email || null,
    direccion: formulario.direccion,
    referencia: formulario.referencia || null,
    latitud: Number(formulario.latitud),
    longitud: Number(formulario.longitud),
    horario_apertura:
      formulario.horario_apertura || null,
    horario_cierre:
      formulario.horario_cierre || null,
    restricciones_acceso:
      formulario.restricciones_acceso || null,
    estado: formulario.estado,
  }
}


export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [formulario, setFormulario] =
    useState(formularioInicial)
  const [clienteEditando, setClienteEditando] =
    useState(null)

  /* La ventana de registro arranca cerrada: el listado es lo que
     se ve al entrar al módulo. */
  const [modalAbierto, setModalAbierto] = useState(false)

  /* Tipo de comercio elegido por cliente id.
     No va al backend: la tabla clientes no tiene esa columna, así
     que se mantiene sólo mientras la pantalla esté abierta. */
  const [tiposElegidos, setTiposElegidos] = useState({})

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')


  async function cargarClientes() {
    try {
      setCargando(true)
      setError('')

      const data = await listarClientes()

      setClientes(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }


  useEffect(() => {
    cargarClientes()
  }, [])


  function manejarCambio(event) {
    const { name, value } = event.target

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }))
  }


  function manejarUbicacion(coordenadas) {
    setFormulario((actual) => ({
      ...actual,
      latitud: String(coordenadas.latitud),
      longitud: String(coordenadas.longitud),
      /* Elegir una dirección del buscador rellena el texto: es una
         acción deliberada. Mover el marcador llega sin etiqueta y
         no toca lo que el usuario escribió. */
      direccion: coordenadas.etiqueta
        ? coordenadas.etiqueta
        : actual.direccion,
    }))
  }


  function limpiarFormulario() {
    setFormulario(formularioInicial)
    setClienteEditando(null)
  }


  function abrirRegistro() {
    setMensaje('')
    setError('')
    setClienteEditando(null)
    setFormulario(formularioInicial)
    setModalAbierto(true)
  }


  function cerrarFormulario() {
    limpiarFormulario()
    setModalAbierto(false)
  }


  function editarCliente(cliente) {
    setClienteEditando(cliente.id_cliente)

    setFormulario({
      nombre: cliente.nombre || '',
      documento: cliente.documento || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      direccion: cliente.direccion || '',
      referencia: cliente.referencia || '',
      latitud: cliente.latitud ?? '',
      longitud: cliente.longitud ?? '',
      horario_apertura:
        cliente.horario_apertura || '',
      horario_cierre:
        cliente.horario_cierre || '',
      restricciones_acceso:
        cliente.restricciones_acceso || '',
      estado: cliente.estado,
    })

    setError('')
    setModalAbierto(true)
  }


  async function manejarSubmit(event) {
    event.preventDefault()

    try {
      setGuardando(true)
      setError('')
      setMensaje('')

      const datos = convertirDatosFormulario(
        formulario
      )

      if (clienteEditando) {
        await actualizarCliente(
          clienteEditando,
          datos
        )

        /* Se recuerda el tipo elegido para que la fila siga
           mostrando la clasificación. */
        setTiposElegidos((actual) => ({
          ...actual,
          [clienteEditando]: formulario.tipo_comercio,
        }))

        setMensaje(
          'Cliente actualizado correctamente.'
        )
      } else {
        const creado = await crearCliente(datos)

        setTiposElegidos((actual) => ({
          ...actual,
          [creado?.id_cliente]: formulario.tipo_comercio,
        }))

        setMensaje(
          'Cliente registrado correctamente.'
        )
      }

      limpiarFormulario()
      await cargarClientes()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }


  async function manejarEstado(id, estadoActual) {
    const nuevoEstado =
      estadoActual === 'ACTIVO'
        ? 'INACTIVO'
        : 'ACTIVO'

    try {
      setError('')
      setMensaje('')

      await cambiarEstadoCliente(id, nuevoEstado)

      setMensaje(
        `Estado cambiado a ${nuevoEstado}.`
      )

      await cargarClientes()
    } catch (err) {
      setError(err.message)
    }
  }


  return (
    <main>

      <div className="pagina-header">
        <div>
          <h1>Gestión de clientes</h1>

          <p>
            Registro y administración de clientes y sus
            ubicaciones de entrega.
          </p>
        </div>

        <button
          className="boton-principal"
          onClick={abrirRegistro}
        >
          Registrar cliente
        </button>
      </div>

      {error && (
        <div className="mensaje error">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mensaje exito">
          {mensaje}
        </div>
      )}


      {/* El registro va en una ventana propia para que el listado
          de abajo no se desplace ni se mezcle con el formulario. */}
      <Modal
        abierto={modalAbierto}
        onCerrar={cerrarFormulario}
        ancho="grande"
        titulo={
          clienteEditando
            ? 'Editar cliente'
            : 'Registrar cliente'
        }
        descripcion={
          'La ubicación se elige en el mapa. Arrastre el marcador ' +
          'para ajustar el punto exacto de la entrega.'
        }
      >

        <form onSubmit={manejarSubmit}>

          <div className="form-grid">

            <label>
              Nombre

              <input
                type="text"
                name="nombre"
                value={formulario.nombre}
                onChange={manejarCambio}
                required
                minLength="2"
                maxLength="150"
              />
            </label>


            <label>
              Documento

              <input
                type="text"
                name="documento"
                value={formulario.documento}
                onChange={manejarCambio}
                maxLength="20"
                placeholder="DNI o RUC"
              />
            </label>


            <label>
              Teléfono

              <input
                type="text"
                name="telefono"
                value={formulario.telefono}
                onChange={manejarCambio}
                maxLength="20"
              />
            </label>


            <label>
              Correo electrónico

              <input
                type="email"
                name="email"
                value={formulario.email}
                onChange={manejarCambio}
                maxLength="150"
              />
            </label>


            <label className="campo-completo">
              Dirección

              <input
                type="text"
                name="direccion"
                value={formulario.direccion}
                onChange={manejarCambio}
                required
                minLength="5"
                placeholder="Av. Nombre 123, distrito"
              />
            </label>


            <label className="campo-completo">
              Referencia

              <input
                type="text"
                name="referencia"
                value={formulario.referencia}
                onChange={manejarCambio}
                maxLength="200"
                placeholder="Frente a la bodega El Ahorro"
              />
            </label>


            <div className="campo">
              <label htmlFor="tipo_comercio">
                Tipo de comercio
              </label>

              <select
                id="tipo_comercio"
                name="tipo_comercio"
                value={formulario.tipo_comercio}
                onChange={manejarCambio}
              >
                {TIPOS_COMERCIO.map((tipo) => (
                  <option
                    key={tipo.valor}
                    value={tipo.valor}
                  >
                    {tipo.texto}
                  </option>
                ))}
              </select>

              <small className="ayuda-campo">
                {
                  TIPOS_COMERCIO.find(
                    (t) => t.valor === formulario.tipo_comercio
                  )?.ayuda
                }
              </small>
            </div>


            <div className="campo campo-completo">
              <label className="etiqueta-mapa">
                Ubicación de la entrega
              </label>

              <MapaUbicador
                latitud={formulario.latitud}
                longitud={formulario.longitud}
                onCambio={manejarUbicacion}
              />

              {/* El backend exige estos dos campos; el mapa los
                  escribe y se validan aquí antes de enviar. */}
              <input
                type="hidden"
                name="latitud"
                value={formulario.latitud}
              />

              <input
                type="hidden"
                name="longitud"
                value={formulario.longitud}
              />

              {!formulario.latitud && (
                <p className="aviso-validacion">
                  Elija la ubicación en el mapa para
                  registrar el cliente.
                </p>
              )}
            </div>


            <label>
              Horario apertura

              <input
                type="time"
                name="horario_apertura"
                value={formulario.horario_apertura}
                onChange={manejarCambio}
              />
            </label>


            <label>
              Horario cierre

              <input
                type="time"
                name="horario_cierre"
                value={formulario.horario_cierre}
                onChange={manejarCambio}
              />
            </label>


            <label className="campo-completo">
              Restricciones de acceso

              <input
                type="text"
                name="restricciones_acceso"
                value={
                  formulario.restricciones_acceso
                }
                onChange={manejarCambio}
                maxLength="200"
                placeholder="No entrar por la puerta lateral"
              />
            </label>


            <label>
              Estado

              <select
                name="estado"
                value={formulario.estado}
                onChange={manejarCambio}
              >
                <option value="ACTIVO">
                  ACTIVO
                </option>

                <option value="INACTIVO">
                  INACTIVO
                </option>
              </select>
            </label>

          </div>


          <div className="form-actions">

            <button
              type="submit"
              disabled={guardando}
            >
              {guardando
                ? 'Guardando...'
                : clienteEditando
                  ? 'Actualizar cliente'
                  : 'Registrar cliente'}
            </button>

            <button
              type="button"
              onClick={cerrarFormulario}
            >
              Cerrar
            </button>

          </div>

        </form>

      </Modal>


      <section className="lista-clientes">

        <h2>Clientes registrados</h2>

        {cargando ? (
          <Esqueleto texto="clientes" tipo="filas" />
        ) : clientes.length === 0 ? (
          <p>No hay clientes registrados.</p>
        ) : (
          <div className="tabla-container">

            <table>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Comercio</th>
                  <th>Documento</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th>Horario</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>

                {clientes.map((cliente) => (

                  <tr key={cliente.id_cliente}>

                    <td>
                      {cliente.id_cliente}
                    </td>

                    <td>
                      {cliente.nombre}
                    </td>

                    {/* El tipo de comercio no se guarda en la
                        base: se muestra sólo para lo que se acaba
                        de escribir en el formulario. */}
                    <td>
                      {tiposElegidos[cliente.id_cliente] ? (
                        <span className="chip-tipo-comercio">
                          {
                            TIPOS_COMERCIO.find(
                              (t) =>
                                t.valor ===
                                tiposElegidos[cliente.id_cliente]
                            )?.texto
                          }
                        </span>
                      ) : (
                        <span className="tipo-no-elegido">—</span>
                      )}
                    </td>

                    <td>
                      {cliente.documento || '-'}
                    </td>

                    <td>
                      {cliente.telefono || '-'}
                    </td>

                    <td>
                      {cliente.direccion}
                    </td>

                    <td>
                      {cliente.horario_apertura
                        ? `${cliente.horario_apertura} - ${cliente.horario_cierre ?? ''}`
                        : '-'}
                    </td>

                    <td>
                      <span
                        className={`estado estado-${cliente.estado.toLowerCase()}`}
                      >
                        {cliente.estado}
                      </span>
                    </td>

                    <td>

                      <button
                        type="button"
                        onClick={() =>
                          editarCliente(cliente)
                        }
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          manejarEstado(
                            cliente.id_cliente,
                            cliente.estado,
                          )
                        }
                      >
                        {cliente.estado === 'ACTIVO'
                          ? 'Desactivar'
                          : 'Activar'}
                      </button>

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
