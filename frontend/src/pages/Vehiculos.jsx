import { useEffect, useState } from 'react'

import {
  listarVehiculos,
  crearVehiculo,
  actualizarVehiculo,
  cambiarEstadoVehiculo,
} from '../services/vehiculos'


const formularioInicial = {
  id_tipo_vehiculo: 1,
  placa: '',
  marca: '',
  modelo: '',
  anio_fabricacion: '',
  capacidad_kg: '',
  capacidad_m3: '',
  consumo_km_l: '',
  factor_co2_kg_km: '',
  tipo_combustible: 'DIESEL',
  costo_adquisicion: '',
  valor_actual: '',
  depreciacion_anual: '',
  costo_soat_anual: '',
  costo_seguro_anual: '',
  estado: 'ACTIVO',
}


function convertirDatosFormulario(formulario) {
  return {
    id_tipo_vehiculo: Number(formulario.id_tipo_vehiculo),
    placa: formulario.placa,
    marca: formulario.marca || null,
    modelo: formulario.modelo || null,
    anio_fabricacion: formulario.anio_fabricacion
      ? Number(formulario.anio_fabricacion)
      : null,
    capacidad_kg: Number(formulario.capacidad_kg),
    capacidad_m3: Number(formulario.capacidad_m3),
    consumo_km_l: Number(formulario.consumo_km_l),
    factor_co2_kg_km: Number(formulario.factor_co2_kg_km),
    tipo_combustible: formulario.tipo_combustible,
    costo_adquisicion: formulario.costo_adquisicion
      ? Number(formulario.costo_adquisicion)
      : null,
    valor_actual: formulario.valor_actual
      ? Number(formulario.valor_actual)
      : null,
    depreciacion_anual: formulario.depreciacion_anual
      ? Number(formulario.depreciacion_anual)
      : null,
    costo_soat_anual: formulario.costo_soat_anual
      ? Number(formulario.costo_soat_anual)
      : null,
    costo_seguro_anual: formulario.costo_seguro_anual
      ? Number(formulario.costo_seguro_anual)
      : null,
    estado: formulario.estado,
  }
}


export default function Vehiculos() {
  const [vehiculos, setVehiculos] = useState([])
  const [formulario, setFormulario] = useState(formularioInicial)
  const [vehiculoEditando, setVehiculoEditando] = useState(null)

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')


  async function cargarVehiculos() {
    try {
      setCargando(true)
      setError('')

      const data = await listarVehiculos()

      setVehiculos(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }


  useEffect(() => {
    cargarVehiculos()
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
    setVehiculoEditando(null)
  }


  function editarVehiculo(vehiculo) {
    setVehiculoEditando(vehiculo.id_vehiculo)

    setFormulario({
      id_tipo_vehiculo: vehiculo.id_tipo_vehiculo,
      placa: vehiculo.placa,
      marca: vehiculo.marca || '',
      modelo: vehiculo.modelo || '',
      anio_fabricacion: vehiculo.anio_fabricacion || '',
      capacidad_kg: vehiculo.capacidad_kg,
      capacidad_m3: vehiculo.capacidad_m3,
      consumo_km_l: vehiculo.consumo_km_l,
      factor_co2_kg_km: vehiculo.factor_co2_kg_km,
      tipo_combustible: vehiculo.tipo_combustible,
      costo_adquisicion: vehiculo.costo_adquisicion || '',
      valor_actual: vehiculo.valor_actual || '',
      depreciacion_anual: vehiculo.depreciacion_anual || '',
      costo_soat_anual: vehiculo.costo_soat_anual || '',
      costo_seguro_anual: vehiculo.costo_seguro_anual || '',
      estado: vehiculo.estado,
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

      const datos = convertirDatosFormulario(formulario)

      if (vehiculoEditando) {
        await actualizarVehiculo(
          vehiculoEditando,
          datos,
        )

        setMensaje('Vehículo actualizado correctamente.')
      } else {
        await crearVehiculo(datos)

        setMensaje('Vehículo registrado correctamente.')
      }

      limpiarFormulario()
      await cargarVehiculos()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }


  async function manejarEstado(id, estadoActual) {
    const nuevoEstado =
      estadoActual === 'ACTIVO'
        ? 'MANTENIMIENTO'
        : 'ACTIVO'

    try {
      setError('')
      setMensaje('')

      await cambiarEstadoVehiculo(
        id,
        nuevoEstado,
      )

      setMensaje(
        `Estado cambiado a ${nuevoEstado}.`,
      )

      await cargarVehiculos()
    } catch (err) {
      setError(err.message)
    }
  }


  return (
    <div className="vehiculos-page">

      <h1>Gestión de vehículos</h1>

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


      <section className="formulario-vehiculo">

        <h2>
          {vehiculoEditando
            ? 'Editar vehículo'
            : 'Registrar vehículo'}
        </h2>

        <form onSubmit={manejarSubmit}>

          <div className="form-grid">

            <label>
              Tipo de vehículo

              <select
                name="id_tipo_vehiculo"
                value={formulario.id_tipo_vehiculo}
                onChange={manejarCambio}
              >
                <option value="1">
                  CAMIONETA
                </option>

                <option value="2">
                  FURGON
                </option>

                <option value="3">
                  MOTO
                </option>
              </select>
            </label>


            <label>
              Placa

              <input
                name="placa"
                value={formulario.placa}
                onChange={manejarCambio}
                placeholder="ABC-123"
                required
              />
            </label>


            <label>
              Marca

              <input
                name="marca"
                value={formulario.marca}
                onChange={manejarCambio}
              />
            </label>


            <label>
              Modelo

              <input
                name="modelo"
                value={formulario.modelo}
                onChange={manejarCambio}
              />
            </label>


            <label>
              Año de fabricación

              <input
                type="number"
                name="anio_fabricacion"
                value={formulario.anio_fabricacion}
                onChange={manejarCambio}
                min="1990"
                max="2026"
              />
            </label>


            <label>
              Capacidad (kg)

              <input
                type="number"
                step="0.01"
                name="capacidad_kg"
                value={formulario.capacidad_kg}
                onChange={manejarCambio}
                min="0.01"
                required
              />
            </label>


            <label>
              Capacidad (m³)

              <input
                type="number"
                step="0.01"
                name="capacidad_m3"
                value={formulario.capacidad_m3}
                onChange={manejarCambio}
                min="0.01"
                required
              />
            </label>


            <label>
              Consumo (km/l)

              <input
                type="number"
                step="0.01"
                name="consumo_km_l"
                value={formulario.consumo_km_l}
                onChange={manejarCambio}
                min="0.01"
                required
              />
            </label>


            <label>
              Factor CO₂ (kg/km)

              <input
                type="number"
                step="0.0001"
                name="factor_co2_kg_km"
                value={formulario.factor_co2_kg_km}
                onChange={manejarCambio}
                min="0.0001"
                required
              />
            </label>


            <label>
              Combustible

              <select
                name="tipo_combustible"
                value={formulario.tipo_combustible}
                onChange={manejarCambio}
              >
                <option value="DIESEL">
                  DIESEL
                </option>

                <option value="GNV">
                  GNV
                </option>

                <option value="GASOLINA">
                  GASOLINA
                </option>

                <option value="ELECTRICO">
                  ELECTRICO
                </option>
              </select>
            </label>


            <label>
              Costo adquisición

              <input
                type="number"
                step="0.01"
                name="costo_adquisicion"
                value={formulario.costo_adquisicion}
                onChange={manejarCambio}
                min="0"
              />
            </label>


            <label>
              Valor actual

              <input
                type="number"
                step="0.01"
                name="valor_actual"
                value={formulario.valor_actual}
                onChange={manejarCambio}
                min="0"
              />
            </label>


            <label>
              Depreciación anual

              <input
                type="number"
                step="0.01"
                name="depreciacion_anual"
                value={formulario.depreciacion_anual}
                onChange={manejarCambio}
                min="0"
              />
            </label>


            <label>
              SOAT anual

              <input
                type="number"
                step="0.01"
                name="costo_soat_anual"
                value={formulario.costo_soat_anual}
                onChange={manejarCambio}
                min="0"
              />
            </label>


            <label>
              Seguro anual

              <input
                type="number"
                step="0.01"
                name="costo_seguro_anual"
                value={formulario.costo_seguro_anual}
                onChange={manejarCambio}
                min="0"
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

                <option value="MANTENIMIENTO">
                  MANTENIMIENTO
                </option>

                <option value="BAJA">
                  BAJA
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
                : vehiculoEditando
                  ? 'Actualizar vehículo'
                  : 'Registrar vehículo'}
            </button>

            {vehiculoEditando && (
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


      <section className="lista-vehiculos">

        <h2>Vehículos registrados</h2>

        {cargando ? (
          <p>Cargando vehículos...</p>
        ) : vehiculos.length === 0 ? (
          <p>No hay vehículos registrados.</p>
        ) : (

          <div className="tabla-container">

            <table>

              <thead>
                <tr>
                  <th>ID</th>
                  <th>Placa</th>
                  <th>Tipo</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Combustible</th>
                  <th>Capacidad kg</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>

                {vehiculos.map((vehiculo) => (

                  <tr key={vehiculo.id_vehiculo}>

                    <td>
                      {vehiculo.id_vehiculo}
                    </td>

                    <td>
                      {vehiculo.placa}
                    </td>

                    <td>
                      {vehiculo.id_tipo_vehiculo === 1
                        ? 'CAMIONETA'
                        : vehiculo.id_tipo_vehiculo === 2
                          ? 'FURGON'
                          : 'MOTO'}
                    </td>

                    <td>
                      {vehiculo.marca || '-'}
                    </td>

                    <td>
                      {vehiculo.modelo || '-'}
                    </td>

                    <td>
                      {vehiculo.tipo_combustible}
                    </td>

                    <td>
                      {vehiculo.capacidad_kg}
                    </td>

                    <td>
                      <span
                        className={`estado estado-${vehiculo.estado.toLowerCase()}`}
                      >
                        {vehiculo.estado}
                      </span>
                    </td>

                    <td>

                      <button
                        type="button"
                        onClick={() =>
                          editarVehiculo(vehiculo)
                        }
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          manejarEstado(
                            vehiculo.id_vehiculo,
                            vehiculo.estado,
                          )
                        }
                      >
                        {vehiculo.estado === 'ACTIVO'
                          ? 'Mantenimiento'
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

    </div>
  )
}