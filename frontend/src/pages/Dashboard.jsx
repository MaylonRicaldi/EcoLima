import { useEffect, useState } from 'react'

import {
  obtenerDashboard,
  obtenerImpactoAmbiental,
  obtenerReporteConsolidado,
  calcularCompensacion,
  listarCompensaciones,
  generarReporte,
  listarReportes,
} from '../services/operacion'


function Tarjeta({ titulo, valor, unidad, detalle, tono = '' }) {
  return (
    <div className={`tarjeta-indicador ${tono}`}>
      <span className="tarjeta-titulo">{titulo}</span>

      <span className="tarjeta-valor">
        {valor}
        {unidad && (
          <small>{unidad}</small>
        )}
      </span>

      {detalle && (
        <span className="tarjeta-detalle">
          {detalle}
        </span>
      )}
    </div>
  )
}


export default function Dashboard() {
  const [datos, setDatos] = useState(null)
  const [impacto, setImpacto] = useState(null)
  const [consolidado, setConsolidado] = useState(null)
  const [compensaciones, setCompensaciones] = useState([])
  const [reportes, setReportes] = useState([])

  const [cargando, setCargando] = useState(true)
  const [trabajando, setTrabajando] = useState(false)

  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')


  async function cargar() {
    try {
      setCargando(true)
      setError('')

      const [d, i, c, comp, rep] = await Promise.all([
        obtenerDashboard(),
        obtenerImpactoAmbiental(),
        obtenerReporteConsolidado(),
        listarCompensaciones(),
        listarReportes(),
      ])

      setDatos(d)
      setImpacto(i)
      setConsolidado(c)
      setCompensaciones(comp)
      setReportes(rep)
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }


  useEffect(() => {
    cargar()
  }, [])


  async function calcularPlan() {
    try {
      setTrabajando(true)
      setError('')
      setMensaje('')

      const plan = await calcularCompensacion()

      setMensaje(
        `Plan generado: ${plan.arboles_necesarios} árboles ` +
          `en ${plan.proyecto_reforestacion}.`
      )

      const nuevos = await listarCompensaciones()

      setCompensaciones(nuevos)
      setImpacto(await obtenerImpactoAmbiental())
    } catch (err) {
      setError(err.message)
    } finally {
      setTrabajando(false)
    }
  }


  async function generar(tipo) {
    try {
      setTrabajando(true)
      setError('')
      setMensaje('')

      const rep = await generarReporte(tipo)

      setMensaje(
        `Reporte generado: ${rep.ruta_archivo}`
      )

      setReportes(await listarReportes())
    } catch (err) {
      setError(err.message)
    } finally {
      setTrabajando(false)
    }
  }


  if (cargando) {
    return (
      <main>
        <h1>Dashboard</h1>
        <p>Cargando indicadores...</p>
      </main>
    )
  }


  const c = datos.conteos
  const op = datos.operacion
  const ah = datos.ahorro
  const sus = datos.sostenibilidad

  return (
    <main>

      <div className="pagina-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Indicadores de operación y sostenibilidad
            calculados sobre las rutas reales.
          </p>
        </div>
      </div>

      {error && (
        <div className="mensaje error">{error}</div>
      )}

      {mensaje && (
        <div className="mensaje exito">{mensaje}</div>
      )}


      {/* ---------- Operación ---------- */}
      <section>
        <h2>Operación logística</h2>

        <div className="grid-indicadores">
          <Tarjeta
            titulo="Pedidos totales"
            valor={c.pedidos}
            detalle={`${c.pendientes} pendientes · ${c.entregados} entregados`}
          />
          <Tarjeta
            titulo="Rutas"
            valor={c.rutas}
            detalle={`${c.rutas_planificadas} planificadas · ${c.rutas_en_curso} en curso`}
          />
          <Tarjeta
            titulo="Flota"
            valor={`${c.vehiculos_activos}/${c.vehiculos}`}
            detalle="vehículos activos"
          />
          <Tarjeta
            titulo="Conductores"
            valor={c.conductores}
            detalle={`${c.conductores_disponibles} disponibles`}
          />
          <Tarjeta
            titulo="Clientes activos"
            valor={c.clientes_activos}
          />
          <Tarjeta
            titulo="Incidentes"
            valor={c.incidentes_activos}
            tono={c.incidentes_activos > 0 ? 'alerta' : ''}
          />
        </div>
      </section>


      {/* ---------- Desempeño ---------- */}
      <section>
        <h2>Desempeño de rutas</h2>

        <div className="grid-indicadores">
          <Tarjeta
            titulo="Distancia recorrida"
            valor={op.distancia_km}
            unidad=" km"
          />
          <Tarjeta
            titulo="Tiempo en ruta"
            valor={op.duracion_minutos}
            unidad=" min"
          />
          <Tarjeta
            titulo="Combustible"
            valor={op.combustible_l}
            unidad=" L"
          />
          <Tarjeta
            titulo="Costo total"
            valor={`S/ ${op.costo_total}`}
          />
          <Tarjeta
            titulo="Cumplimiento de ventanas"
            valor={datos.ventanas.cumplimiento_pct}
            unidad="%"
            tono={
              datos.ventanas.cumplimiento_pct >= 90
                ? 'bien'
                : 'alerta'
            }
          />
          <Tarjeta
            titulo="Ahorro vs ruta secuencial"
            valor={`S/ ${ah.economico}`}
            detalle={`${ah.reduccion_distancia_pct}% menos distancia`}
            tono="bien"
          />
        </div>
      </section>


      {/* ---------- Sostenibilidad ---------- */}
      <section>
        <h2>Sostenibilidad</h2>

        <div className="grid-indicadores">
          <Tarjeta
            titulo="CO₂ emitido"
            valor={op.co2_kg}
            unidad=" kg"
          />
          <Tarjeta
            titulo="CO₂ ahorrado"
            valor={ah.co2_kg}
            unidad=" kg"
            tono="bien"
          />
          <Tarjeta
            titulo="Reducción de CO₂"
            valor={`${ah.reduccion_co2_pct}%`}
            tono="bien"
          />
          <Tarjeta
            titulo="Combustible ahorrado"
            valor={ah.combustible_l}
            unidad=" L"
            tono="bien"
          />
          <Tarjeta
            titulo="Árboles equivalentes"
            valor={sus.arboles_equivalentes}
            detalle="equivale a sembrar en Huáscar"
            tono="eco"
          />
          <Tarjeta
            titulo="Factor por árbol"
            valor={sus.kg_co2_por_arbol_anio}
            unidad=" kg/año"
          />
        </div>

        <p className="mensaje eco">{sus.mensaje}</p>

        <div className="flota-combustible">
          <h3>Flota por combustible</h3>

          <ul>
            {datos.flota_por_combustible.map((f) => (
              <li key={f.tipo_combustible}>
                <strong>{f.tipo_combustible}</strong>:{' '}
                {f.vehiculos} vehículo(s)
              </li>
            ))}
          </ul>
        </div>
      </section>


      {/* ---------- Pedidos por estado ---------- */}
      <section>
        <h2>Pedidos por estado</h2>

        <div className="grid-indicadores">
          {datos.pedidos_por_estado.map((e) => (
            <Tarjeta
              key={e.estado}
              titulo={e.estado}
              valor={e.cantidad}
            />
          ))}
        </div>
      </section>


      {/* ---------- HU-11: compensación ---------- */}
      <section>
        <h2>Plan de compensación de carbono</h2>

        {impacto && (
          <p className="mensaje eco">
            {impacto.equivalencia}
          </p>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="boton-principal"
            onClick={calcularPlan}
            disabled={trabajando}
          >
            {trabajando
              ? 'Calculando...'
              : 'Calcular plan de compensación'}
          </button>
        </div>

        {compensaciones.length === 0 ? (
          <p>
            Aún no hay planes de compensación
            registrados.
          </p>
        ) : (
          <div className="tabla-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>CO₂ total kg</th>
                  <th>CO₂ a compensar</th>
                  <th>Factor kg/árbol</th>
                  <th>Árboles necesarios</th>
                  <th>Proyecto</th>
                  <th>Fecha</th>
                </tr>
              </thead>

              <tbody>
                {compensaciones.map((c2) => (
                  <tr key={c2.id_compensacion}>
                    <td>{c2.id_compensacion}</td>
                    <td>{c2.co2_total_kg}</td>
                    <td>{c2.co2_a_compensar_kg}</td>
                    <td>{c2.factor_captura_arbol_kg}</td>
                    <td>
                      <strong>
                        {c2.arboles_necesarios}
                      </strong>
                    </td>
                    <td>
                      {c2.proyecto_reforestacion}
                    </td>
                    <td>
                      {new Date(
                        c2.fecha_calculo
                      ).toLocaleDateString('es-PE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>


      {/* ---------- HU-10: reportes ---------- */}
      <section>
        <h2>Reportes de sostenibilidad</h2>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => generar('SOSTENIBILIDAD')}
            disabled={trabajando}
          >
            Reporte de sostenibilidad
          </button>

          <button
            type="button"
            onClick={() => generar('TCO')}
            disabled={trabajando}
          >
            Reporte de TCO
          </button>

          <button
            type="button"
            onClick={() => generar('COMPENSACION')}
            disabled={trabajando}
          >
            Reporte de compensación
          </button>

          <button
            type="button"
            onClick={() => generar('AUDITORIA')}
            disabled={trabajando}
          >
            Reporte de auditoría
          </button>
        </div>

        {reportes.length === 0 ? (
          <p>No hay reportes generados.</p>
        ) : (
          <div className="tabla-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Ruta</th>
                  <th>Generado por</th>
                  <th>Fecha</th>
                  <th>Archivo</th>
                </tr>
              </thead>

              <tbody>
                {reportes.map((r) => (
                  <tr key={r.id_reporte}>
                    <td>{r.id_reporte}</td>
                    <td>{r.tipo}</td>
                    <td>{r.id_ruta ?? '-'}</td>
                    <td>{r.usuario_nombre}</td>
                    <td>
                      {new Date(
                        r.fecha_generacion
                      ).toLocaleString('es-PE')}
                    </td>
                    <td>{r.ruta_archivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {consolidado && (
          <div className="ruta-meta">
            <span>
              Distancia consolidada:{' '}
              <strong>
                {consolidado.totales.distancia_km} km
              </strong>
            </span>

            <span>
              CO₂ consolidado:{' '}
              <strong>
                {consolidado.totales.co2_kg} kg
              </strong>
            </span>

            <span>
              Costo consolidado:{' '}
              <strong>
                S/ {consolidado.totales.costo_total}
              </strong>
            </span>

            <span>
              Árboles del consolidado:{' '}
              <strong>
                {
                  consolidado.totales.arboles_equivalentes
                }
              </strong>
            </span>
          </div>
        )}
      </section>


      </main>
  )
}