import { useEffect, useState } from 'react'
import {
  listarPedidos,
  crearPedido,
  actualizarPedido,
  cambiarEstadoPedido,
} from '../services/pedidos'
import {
  listarClientes,
  obtenerCliente,
  listarVentanasDisponibles,
} from '../services/clientes'

import MapaUbicador from '../components/MapaUbicador'
import GestorVentanas from '../components/GestorVentanas'
import Modal from '../components/Modal'

import { getUsuario } from '../services/auth'
import Esqueleto from '../components/Esqueleto'

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
  // CONDUCTOR y CLIENTE sólo consultan: el backend filtra por fila y
  // no les permite crear ni editar pedidos.
  const soloLectura = ['CONDUCTOR', 'CLIENTE'].includes(
    getUsuario()?.rol
  )

  const [pedidos, setPedidos] = useState([])
  const [clientes, setClientes] = useState([])
  const [ventanas, setVentanas] = useState([])
  const [clienteActual, setClienteActual] = useState(null)
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

  async function cargarReferencias() {
    // allSettled: que falle una referencia no debe descartar la otra.
    const [resClientes, resVentanas] = await Promise.allSettled([
      listarClientes(),
      listarVentanasDisponibles(),
    ])

    const c =
      resClientes.status === 'fulfilled' ? resClientes.value : []
    const v =
      resVentanas.status === 'fulfilled' ? resVentanas.value : []

    setClientes(c)
    setVentanas(v)

    const fallidos = [resClientes, resVentanas].filter(
      (r) => r.status === 'rejected'
    )

    if (fallidos.length > 0) {
      setError(
        'No se pudieron cargar todas las referencias del formulario: ' +
          fallidos.map((r) => r.reason.message).join(' | ')
      )
    }

    setFormulario((actual) => {
      if (c.length === 0 || v.length === 0) {
        return actual
      }

      const existeCliente = c.some(
        (x) => String(x.id_cliente) === String(actual.id_cliente)
      )

      const existeVentana = v.some(
        (x) => String(x.id_ventana) === String(actual.id_ventana_tiempo)
      )

      return {
        ...actual,
        id_cliente: existeCliente
          ? actual.id_cliente
          : c[0].id_cliente,
        id_ventana_tiempo: existeVentana
          ? actual.id_ventana_tiempo
          : v[0].id_ventana,
      }
    })
  }

  useEffect(() => {
    cargarPedidos()
    cargarReferencias()
  }, [])

  function manejarCambio(event) {
    const { name, value } = event.target

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }))
  }


  /* Copia la ubicación registrada del cliente al pedido.
     Se usa al elegir cliente en un pedido nuevo y desde el botón
     "Usar la ubicación registrada". Nunca se llama al abrir un
     pedido existente: ese ya tiene su propia dirección de entrega.

     Devuelve SÓLO los campos que cambia, nunca el formulario
     entero. Si devolviera {...actual} y quien lo llama lo esparciera
     después de fijar id_cliente, el id_cliente viejo se volvería a
     imponer y el pedido se guardaría contra un cliente
     inexistente. */
  function aplicarUbicacionCliente(cliente, actual) {
    return {
      direccion_entrega:
        actual.direccion_entrega.trim() === ''
          ? cliente.direccion || ''
          : actual.direccion_entrega,
      referencia:
        actual.referencia.trim() === ''
          ? cliente.referencia || ''
          : actual.referencia,
      latitud:
        cliente.latitud === null || cliente.latitud === undefined
          ? actual.latitud
          : String(cliente.latitud),
      longitud:
        cliente.longitud === null || cliente.longitud === undefined
          ? actual.longitud
          : String(cliente.longitud),
    }
  }


  /* Al elegir un cliente se carga su ficha completa (el listado
     no trae coordenadas ni horario) y se muestran sus datos. */
  async function seleccionarCliente(id, autocompletar = false) {
    if (!id) {
      return
    }

    /* Si ya está en el listado se usa ese registro y se evita
       una petición innecesaria. */
    const enListado = clientes.find(
      (c) => String(c.id_cliente) === String(id)
    )

    setFormulario((actual) => ({
      ...actual,
      id_cliente: id,
      ...(autocompletar && enListado
        ? aplicarUbicacionCliente(enListado, actual)
        : {}),
    }))

    if (enListado) {
      setClienteActual(enListado)
    }

    try {
      const ficha = await obtenerCliente(id)

      setClienteActual(ficha)

      if (autocompletar) {
        /* Se conserva todo lo que ya tiene el formulario y sólo se
           pisan los campos de ubicación que trae la ficha. */
        setFormulario((actual) => ({
          ...actual,
          ...aplicarUbicacionCliente(ficha, actual),
        }))
      }
    } catch (err) {
      setClienteActual(enListado || null)

      setError(
        'No se pudo leer la ficha del cliente: ' + err.message
      )
    }
  }


  function manejarCambioCliente(event) {
    seleccionarCliente(event.target.value, !editando)
  }


  function manejarUbicacion(coordenadas) {
    setFormulario((actual) => ({
      ...actual,
      latitud: String(coordenadas.latitud),
      longitud: String(coordenadas.longitud),
      /* Elegir una dirección del buscador rellena el texto: es una
         acción deliberada. Mover el marcador llega sin etiqueta y
         no toca lo que el usuario escribió. */
      direccion_entrega: coordenadas.etiqueta
        ? coordenadas.etiqueta
        : actual.direccion_entrega,
    }))
  }


  function usarUbicacionRegistrada() {
    if (!clienteActual) {
      return
    }

    setFormulario((actual) => ({
      ...actual,
      direccion_entrega: clienteActual.direccion || '',
      referencia: clienteActual.referencia || '',
      latitud:
        clienteActual.latitud === null ||
        clienteActual.latitud === undefined
          ? actual.latitud
          : String(clienteActual.latitud),
      longitud:
        clienteActual.longitud === null ||
        clienteActual.longitud === undefined
          ? actual.longitud
          : String(clienteActual.longitud),
    }))
  }

  function limpiarFormulario() {
    setFormulario(pedidoInicial)
    setClienteActual(null)
    setEditando(null)
    setMostrarFormulario(false)
  }

  function nuevoPedido() {
    setMensaje('')
    setError('')

    /* Sin clientes no hay pedido posible: cada pedido pertenece a
       uno. Se avisa en vez de abrir un formulario que no iba a
       poder guardarse. */
    if (clientes.length === 0) {
      setError(
        'Primero registre un cliente: cada pedido se hace para un ' +
          'cliente.'
      )

      return
    }

    setFormulario(pedidoInicial)
    setEditando(null)
    setMostrarFormulario(true)

    /* Se carga de entrada la ficha del primer cliente para que el
       formulario venga con dirección y ubicación ya puestas. */
    seleccionarCliente(clientes[0].id_cliente, true)
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

    /* Ficha del cliente sólo como referencia: la dirección y las
       coordenadas del pedido no se tocan al editar. */
    setClienteActual(
      clientes.find((c) => c.id_cliente === pedido.id_cliente) ||
        null
    )

    setEditando(pedido.id_pedido)
    setMostrarFormulario(true)
  }

  async function manejarSubmit(event) {
    event.preventDefault()

    try {
      setError('')
      setMensaje('')

      if (
        formulario.latitud === '' ||
        formulario.longitud === ''
      ) {
        throw new Error(
          'Elija la ubicación de la entrega en el mapa'
        )
      }

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
          <h1>
            {soloLectura
              ? 'Mis pedidos'
              : 'Gestión de pedidos'}
          </h1>

          <p>
            {soloLectura
              ? 'Pedidos asignados a sus rutas.'
              : 'Registro y administración de pedidos de entrega.'}
          </p>
        </div>

        {!soloLectura && (
          <button
            className="boton-principal boton-vivo"
            onClick={nuevoPedido}
          >
            <span className="boton-brillo" />
            Nuevo pedido
          </button>
        )}
      </div>

      {!soloLectura && (
        <GestorVentanas puedeEditar />
      )}

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

      {mostrarFormulario && !soloLectura && (
        <Modal
          abierto
          onCerrar={limpiarFormulario}
          ancho="grande"
          titulo={
            editando ? 'Editar pedido' : 'Registrar pedido'
          }
          descripcion={
            'Al elegir el cliente se completan su dirección y su ' +
            'ubicicación registradas. Puede ajustarlas en el mapa.'
          }
        >
          <form onSubmit={manejarSubmit}>
            <div className="formulario-grid">
              <div className="campo">
                <label>Cliente</label>
                <select
                  name="id_cliente"
                  value={formulario.id_cliente}
                  onChange={manejarCambioCliente}
                  required
                >
                  {clientes.length === 0 && (
                    <option value="">
                      Sin clientes registrados
                    </option>
                  )}

                  {clientes.map((c) => (
                    <option
                      key={c.id_cliente}
                      value={c.id_cliente}
                    >
                      #{c.id_cliente} · {c.nombre}
                      {c.estado !== 'ACTIVO'
                        ? ' (inactivo)'
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo">
                <label>Ventana de tiempo</label>
                <select
                  name="id_ventana_tiempo"
                  value={formulario.id_ventana_tiempo}
                  onChange={manejarCambio}
                  required
                >
                  {ventanas.length === 0 && (
                    <option value="">
                      Sin ventanas configuradas
                    </option>
                  )}

                  {ventanas.map((v) => (
                    <option
                      key={v.id_ventana}
                      value={v.id_ventana}
                    >
                      {String(v.hora_inicio).slice(0, 5)} -{' '}
                      {String(v.hora_fin).slice(0, 5)}
                      {Number(v.tolerancia_minutos) > 0
                        ? ` (+${v.tolerancia_minutos} min)`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              {clienteActual && (
                <div className="campo campo-completo">
                  <div className="ficha-cliente">
                    <div className="ficha-cliente-cabecera">
                      <strong>
                        Ficha de {clienteActual.nombre}
                      </strong>

                      <button
                        type="button"
                        className="boton-secundario"
                        onClick={usarUbicacionRegistrada}
                        disabled={editando !== null}
                        title={
                          editando !== null
                            ? 'El pedido ya tiene su propia dirección'
                            : 'Copiar la dirección y coordenadas registradas'
                        }
                      >
                        Usar ubicación registrada
                      </button>
                    </div>

                    <dl className="ficha-cliente-datos">
                      <div>
                        <dt>Dirección</dt>
                        <dd>{clienteActual.direccion || '—'}</dd>
                      </div>

                      {clienteActual.referencia && (
                        <div>
                          <dt>Referencia</dt>
                          <dd>{clienteActual.referencia}</dd>
                        </div>
                      )}

                      <div>
                        <dt>Documento</dt>
                        <dd>{clienteActual.documento || '—'}</dd>
                      </div>

                      <div>
                        <dt>Teléfono</dt>
                        <dd>{clienteActual.telefono || '—'}</dd>
                      </div>

                      <div>
                        <dt>Correo</dt>
                        <dd>{clienteActual.email || '—'}</dd>
                      </div>

                      <div>
                        <dt>Horario</dt>
                        <dd>
                          {clienteActual.horario_apertura &&
                          clienteActual.horario_cierre
                            ? `${String(
                                clienteActual.horario_apertura
                              ).slice(0, 5)} - ${String(
                                clienteActual.horario_cierre
                              ).slice(0, 5)}`
                            : 'Sin horario'}
                        </dd>
                      </div>

                      <div>
                        <dt>Acceso</dt>
                        <dd>
                          {clienteActual.restricciones_acceso ||
                            'Sin restricciones'}
                        </dd>
                      </div>
                    </dl>

                    {editando !== null && (
                      <p className="instruccion-mapa">
                        Este pedido ya tiene su propia dirección de
                        entrega; los datos del cliente son sólo
                        referencia.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="campo campo-completo">
                <label>
                  Dirección y ubicación de la entrega
                </label>

                <MapaUbicador
                  latitud={formulario.latitud}
                  longitud={formulario.longitud}
                  onCambio={manejarUbicacion}
                />

                <input
                  type="text"
                  name="direccion_entrega"
                  value={formulario.direccion_entrega}
                  onChange={manejarCambio}
                  placeholder="Dirección de la entrega"
                  required
                />

                {clienteActual && (
                  <small className="celda-sub">
                    Viene de la ficha de {clienteActual.nombre}
                  </small>
                )}
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
                Cerrar
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="tabla-contenedor">
        {cargando ? (
          <Esqueleto texto="pedidos" tipo="filas" />
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
                  <td>
                    {(() => {
                      const c = clientes.find(
                        (x) =>
                          x.id_cliente === pedido.id_cliente
                      )

                      return c ? (
                        <>
                          {c.nombre}
                          <small className="celda-sub">
                            #{pedido.id_cliente}
                          </small>
                        </>
                      ) : (
                        `#${pedido.id_cliente}`
                      )
                    })()}
                  </td>
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