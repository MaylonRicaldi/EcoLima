import { useEffect, useState } from 'react'
import {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
} from '../services/usuarios'

const ROLES = {
  1: 'ADMIN',
  2: 'OPERADOR',
  3: 'CONDUCTOR',
  4: 'AUDITOR',
  5: 'CLIENTE',
}

function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [editando, setEditando] = useState(null)

  const [formulario, setFormulario] = useState({
    nombre: '',
    email: '',
    password: '',
    id_rol: '3',
    estado: 'ACTIVO',
  })

  async function cargarUsuarios() {
    try {
      setError('')
      const data = await listarUsuarios()
      setUsuarios(data)
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  function manejarCambio(event) {
    const { name, value } = event.target

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }))
  }

  function limpiarFormulario() {
    setFormulario({
      nombre: '',
      email: '',
      password: '',
      id_rol: '3',
      estado: 'ACTIVO',
    })

    setEditando(null)
  }

  async function manejarGuardar(event) {
    event.preventDefault()

    try {
      setError('')
      setMensaje('')

      if (editando) {
        await actualizarUsuario(editando, {
          nombre: formulario.nombre,
          email: formulario.email,
          estado: formulario.estado,
        })

        setMensaje('Usuario actualizado correctamente.')
      } else {
        await crearUsuario({
          nombre: formulario.nombre,
          email: formulario.email,
          password: formulario.password,
          id_rol: Number(formulario.id_rol),
          estado: formulario.estado,
        })

        setMensaje('Usuario creado correctamente.')
      }

      limpiarFormulario()
      await cargarUsuarios()
    } catch (err) {
      setError(err.message)
    }
  }

  function prepararEdicion(usuario) {
    setEditando(usuario.id_usuario)

    setFormulario({
      nombre: usuario.nombre,
      email: usuario.email,
      password: '',
      id_rol: String(usuario.id_rol),
      estado: usuario.estado,
    })

    setMensaje('')
    setError('')
  }

  async function manejarEstado(usuario) {
    const nuevoEstado =
      usuario.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'

    try {
      setError('')
      setMensaje('')

      await cambiarEstadoUsuario(
        usuario.id_usuario,
        nuevoEstado
      )

      setMensaje('Estado actualizado correctamente.')
      await cargarUsuarios()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <main>
      <h1>Gestión de usuarios</h1>

      {error && <p>{error}</p>}
      {mensaje && <p>{mensaje}</p>}

      <section>
        <h2>
          {editando ? 'Editar usuario' : 'Registrar usuario'}
        </h2>

        <form onSubmit={manejarGuardar}>
          <div>
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              name="nombre"
              value={formulario.nombre}
              onChange={manejarCambio}
              required
            />
          </div>

          <div>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formulario.email}
              onChange={manejarCambio}
              required
            />
          </div>

          {!editando && (
            <div>
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formulario.password}
                onChange={manejarCambio}
                minLength={8}
                required
              />
            </div>
          )}

          {!editando && (
            <div>
              <label htmlFor="id_rol">Rol</label>
              <select
                id="id_rol"
                name="id_rol"
                value={formulario.id_rol}
                onChange={manejarCambio}
              >
                <option value="1">ADMIN</option>
                <option value="2">OPERADOR</option>
                <option value="3">CONDUCTOR</option>
                <option value="4">AUDITOR</option>
                <option value="5">CLIENTE</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="estado">Estado</label>
            <select
              id="estado"
              name="estado"
              value={formulario.estado}
              onChange={manejarCambio}
            >
              <option value="ACTIVO">ACTIVO</option>
              <option value="BLOQUEADO">BLOQUEADO</option>
              <option value="INACTIVO">INACTIVO</option>
            </select>
          </div>

          <button type="submit">
            {editando ? 'Guardar cambios' : 'Crear usuario'}
          </button>

          {editando && (
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
        <h2>Usuarios registrados</h2>

        {usuarios.length === 0 ? (
          <p>No hay usuarios registrados.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id_usuario}>
                  <td>{usuario.id_usuario}</td>
                  <td>{usuario.nombre}</td>
                  <td>{usuario.email}</td>
                  <td>{ROLES[usuario.id_rol]}</td>
                  <td>
                    <span
                      className={`estado estado-${usuario.estado.toLowerCase()}`}
                    >
                      {usuario.estado}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      onClick={() => prepararEdicion(usuario)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => manejarEstado(usuario)}
                    >
                      {usuario.estado === 'ACTIVO'
                        ? 'Desactivar'
                        : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}

export default Usuarios