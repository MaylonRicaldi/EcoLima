import { useEffect, useState } from 'react'

import {
  listarClientes,
  crearCliente,
  actualizarCliente,
  cambiarEstadoCliente,
} from '../services/clientes'


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
}


function convertirDatosFormulario(formulario) {
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


  function limpiarFormulario() {
    setFormulario(formularioInicial)
    setClienteEditando(null)
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

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
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

        setMensaje(
          'Cliente actualizado correctamente.'
        )
      } else {
        await crearCliente(datos)

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

      <h1>Gestión de clientes</h1>

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


      <section className="formulario-cliente">

        <h2>
          {clienteEditando
            ? 'Editar cliente'
            : 'Registrar cliente'}
        </h2>

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


            <label>
              Latitud

              <input
                type="number"
                step="0.0000001"
                name="latitud"
                value={formulario.latitud}
                onChange={manejarCambio}
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
                value={formulario.longitud}
                onChange={manejarCambio}
                min="-78"
                max="-76"
                required
              />
            </label>


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

            {clienteEditando && (
              <button
                type="button"
                onClick={limpiarFormulario}
              >
                Cancelar
              </button>
            )}

          </div>

        </form>

      </section>


      <section className="lista-clientes">

        <h2>Clientes registrados</h2>

        {cargando ? (
          <p>Cargando clientes...</p>
        ) : clientes.length === 0 ? (
          <p>No hay clientes registrados.</p>
        ) : (
          <div className="tabla-container">

            <table>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
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