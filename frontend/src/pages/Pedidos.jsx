import { useEffect, useState } from 'react'
import {
  listarPedidos,
  crearPedido,
  actualizarPedido,
  cambiarEstadoPedido,
} from '../services/pedidos'

const pedidoInicial = {
  id_cliente: 1,
  id_ventana_tiempo: 1,
  direccion_entrega: '',
  referencia: '',
  latitud: '',
  longitud: '',
  peso_kg: '',
  volumen_m3: '',
  prioridad: 'ESTANDAR',
  tipo_producto: 'NO_PERECEDERO',
  estado: 'PENDIENTE',
}

function Pedidos() {
  const [pedidos, setPedidos] = useState([])
  const [formulario, setFormulario] = useState(pedidoInicial)
  const [editando, setEditando] = useState(null)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  async function cargarPedidos() {
    try {
      setCargando(true)
      setError('')

      const datos = await listarPedidos()
      setPedidos(datos)
    } catch (error) {
      setError(error.message)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarPedidos()
  }, [])

  function manejarCambio(event) {
    const { name, value } = event.target

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }))
  }

  function limpiarFormulario() {
    setFormulario(pedidoInicial)
    setEditando(null)
    setMostrarFormulario(false)
  }

  function nuevoPedido() {
    setMensaje('')
    setError('')
    setFormulario(pedidoInicial)
    setEditando(null)
    setMostrarFormulario(true)
  }

  function editarPedido(pedido) {
    setMensaje('')
    setError('')

    setFormulario({
      id_cliente: pedido.id_cliente,
      id_ventana_tiempo: pedido.id_ventana_tiempo,
      direccion_entrega: pedido.direccion_entrega,
      referencia: pedido.referencia || '',
      latitud: pedido.latitud,
      longitud: pedido.longitud,
      peso_kg: pedido.peso_kg,
      volumen_m3: pedido.volumen_m3,
      prioridad: pedido.prioridad,
      tipo_producto: pedido.tipo_producto,
      estado: pedido.estado,
    })

    setEditando(pedido.id_pedido)
    setMostrarFormulario(true)
  }

  async function manejarSubmit(event) {
    event.preventDefault()

    try {
      setError('')
      setMensaje('')

      const datos = {
        id_cliente: Number(formulario.id_cliente),
        id_ventana_tiempo: Number(formulario.id_ventana_tiempo),
        direccion_entrega: formulario.direccion_entrega,
        referencia: formulario.referencia || null,
        latitud: Number(formulario.latitud),
        longitud: Number(formulario.longitud),
        peso_kg: Number(formulario.peso_kg),
        volumen_m3: Number(formulario.volumen_m3),
        prioridad: formulario.prioridad,
        tipo_producto: formulario.tipo_producto,
        estado: formulario.estado,
      }

      if (editando) {
        await actualizarPedido(editando, datos)
        setMensaje('Pedido actualizado correctamente')
      } else {
        await crearPedido(datos)
        setMensaje('Pedido creado correctamente')
      }

      await cargarPedidos()
      limpiarFormulario()
    } catch (error) {
      setError(error.message)
    }
  }

  async function manejarEstado(id, estado) {
    try {
      setError('')
      setMensaje('')

      await cambiarEstadoPedido(id, estado)

      setMensaje('Estado actualizado correctamente')
      await cargarPedidos()
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <div className="pagina">
      <div className="pagina-header">
        <div>
          <h1>Gestión de pedidos</h1>
          <p>Registro y administración de pedidos de entrega.</p>
        </div>

        <button
          className="boton-principal"
          onClick={nuevoPedido}
        >
          Nuevo pedido
        </button>
      </div>

      {mensaje && (
        <div className="mensaje-exito">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="mensaje-error">
          {error}
        </div>
      )}

      {mostrarFormulario && (
        <div className="formulario-contenedor">
          <h2>
            {editando ? 'Editar pedido' : 'Registrar pedido'}
          </h2>

          <form onSubmit={manejarSubmit}>
            <div className="formulario-grid">
              <div className="campo">
                <label>Cliente</label>
                <input
                  type="number"
                  name="id_cliente"
                  min="1"
                  value={formulario.id_cliente}
                  onChange={manejarCambio}
                  required
                />
              </div>

              <div className="campo">
                <label>Ventana de tiempo</label>
                <input
                  type="number"
                  name="id_ventana_tiempo"
                  min="1"
                  value={formulario.id_ventana_tiempo}
                  onChange={manejarCambio}
                  required
                />
              </div>

              <div className="campo campo-completo">
                <label>Dirección de entrega</label>
                <input
                  type="text"
                  name="direccion_entrega"
                  value={formulario.direccion_entrega}
                  onChange={manejarCambio}
                  required
                />
              </div>

              <div className="campo campo-completo">
                <label>Referencia</label>
                <input
                  type="text"
                  name="referencia"
                  value={formulario.referencia}
                  onChange={manejarCambio}
                />
              </div>

              <div className="campo">
                <label>Latitud</label>
                <input
                  type="number"
                  step="any"
                  name="latitud"
                  value={formulario.latitud}
                  onChange={manejarCambio}
                  required
                />
              </div>

              <div className="campo">
                <label>Longitud</label>
                <input
                  type="number"
                  step="any"
                  name="longitud"
                  value={formulario.longitud}
                  onChange={manejarCambio}
                  required
                />
              </div>

              <div className="campo">
                <label>Peso (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="peso_kg"
                  value={formulario.peso_kg}
                  onChange={manejarCambio}
                  required
                />
              </div>

              <div className="campo">
                <label>Volumen (m³)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="volumen_m3"
                  value={formulario.volumen_m3}
                  onChange={manejarCambio}
                  required
                />
              </div>

              <div className="campo">
                <label>Prioridad</label>
                <select
                  name="prioridad"
                  value={formulario.prioridad}
                  onChange={manejarCambio}
                >
                  <option value="EXPRESS">EXPRESS</option>
                  <option value="ESTANDAR">ESTANDAR</option>
                  <option value="ECONOMICO">ECONOMICO</option>
                </select>
              </div>

              <div className="campo">
                <label>Tipo de producto</label>
                <select
                  name="tipo_producto"
                  value={formulario.tipo_producto}
                  onChange={manejarCambio}
                >
                  <option value="PERECEDERO">PERECEDERO</option>
                  <option value="NO_PERECEDERO">NO_PERECEDERO</option>
                  <option value="QUIMICO">QUIMICO</option>
                </select>
              </div>

              <div className="campo">
                <label>Estado</label>
                <select
                  name="estado"
                  value={formulario.estado}
                  onChange={manejarCambio}
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="ASIGNADO">ASIGNADO</option>
                  <option value="EN_RUTA">EN_RUTA</option>
                  <option value="ENTREGADO">ENTREGADO</option>
                  <option value="CANCELADO">CANCELADO</option>
                  <option value="FALLIDO">FALLIDO</option>
                </select>
              </div>
            </div>

            <div className="formulario-acciones">
              <button
                type="submit"
                className="boton-principal"
              >
                {editando ? 'Guardar cambios' : 'Registrar pedido'}
              </button>

              <button
                type="button"
                className="boton-secundario"
                onClick={limpiarFormulario}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="tabla-contenedor">
        {cargando ? (
          <p>Cargando pedidos...</p>
        ) : pedidos.length === 0 ? (
          <p>No hay pedidos registrados.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Dirección</th>
                <th>Peso</th>
                <th>Volumen</th>
                <th>Prioridad</th>
                <th>Producto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.id_pedido}>
                  <td>{pedido.id_pedido}</td>
                  <td>{pedido.id_cliente}</td>
                  <td>{pedido.direccion_entrega}</td>
                  <td>{pedido.peso_kg} kg</td>
                  <td>{pedido.volumen_m3} m³</td>
                  <td>{pedido.prioridad}</td>
                  <td>{pedido.tipo_producto}</td>

                  <td>
                    <select
                      value={pedido.estado}
                      onChange={(event) =>
                        manejarEstado(
                          pedido.id_pedido,
                          event.target.value
                        )
                      }
                    >
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="ASIGNADO">ASIGNADO</option>
                      <option value="EN_RUTA">EN_RUTA</option>
                      <option value="ENTREGADO">ENTREGADO</option>
                      <option value="CANCELADO">CANCELADO</option>
                      <option value="FALLIDO">FALLIDO</option>
                    </select>
                  </td>

                  <td>
                    <button
                      className="boton-secundario"
                      onClick={() => editarPedido(pedido)}
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Pedidos