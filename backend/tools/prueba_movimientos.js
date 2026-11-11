import { ProblemaVRPTW, Ruta } from '../src/services/optimizer.js'
import { Resultado } from './shared.js'

const points = [[-12.015, -77.005], [-12.045, -77.02], [-12.03, -76.995], [-12.06, -76.98]]
const problem = new ProblemaVRPTW(
  points.map(([latitud, longitud], index) => ({
    id_pedido: index + 1, id_cliente: 1, direccion_entrega: `Parada ${index + 1}`,
    latitud, longitud, peso_kg: 50, volumen_m3: 0.4,
    prioridad: 'ESTANDAR', tipo_producto: 'NO_PERECEDERO',
    hora_inicio: '05:00', hora_fin: '22:00',
  })),
  [{
    id_vehiculo: 1, placa: 'ABC-257', capacidad_kg: 5000, capacidad_m3: 20,
    consumo_km_l: 12, factor_co2_kg_km: 0.9, tipo_combustible: 'GNV',
  }],
  [], { latitud: -12.015, longitud: -77.005 }, '2026-10-12'
)
const route = new Ruta(problem.vehiculos[0], null)
route.secuencia = [...problem.clientes]
route.recalcular_carga()
route.puede_ordenar_por_ventana = false
problem.evaluar_ruta(route)

const result = new Resultado('Deshacer movimientos de reoptimización')
const idsBefore = route.secuencia.map((customer) => customer.id_pedido)
const loadBefore = route.vehiculo.carga_kg
let draw = 0
const rng = {
  random: () => 0,
  randrange: (limit) => {
    draw += 1
    return draw % limit
  },
}
const move = problem._vecino_interno(route, rng)
result.check('se genera un movimiento reversible', move != null)
if (move) problem._rehacer([route], move)
result.check('restaurar el movimiento recupera la secuencia',
  route.secuencia.map((customer) => customer.id_pedido).join(',') === idsBefore.join(','))
result.check('restaurar el movimiento recupera la carga', route.vehiculo.carga_kg === loadBefore)
const reverse = new Ruta(problem.vehiculos[0], null)
reverse.secuencia = [...problem.clientes].reverse()
reverse.recalcular_carga()
problem.evaluar_ruta(reverse)
result.check('permutar paradas cambia el costo', Math.abs(problem.costo_ruta(reverse) - problem.costo_ruta(route)) > 0.01)
process.exitCode = result.resumen() ? 0 : 1
