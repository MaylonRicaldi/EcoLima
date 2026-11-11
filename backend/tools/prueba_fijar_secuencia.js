import { ProblemaVRPTW } from '../src/services/optimizer.js'
import { Resultado } from './shared.js'

const points = [[-12.015, -77.005], [-12.03, -76.995], [-12.065, -76.97], [-12.05, -77.01]]
const base = { latitud: -12.055, longitud: -77.143 }
function problem() {
  return new ProblemaVRPTW(
    points.map(([latitud, longitud], index) => ({
      id_pedido: index + 1, id_cliente: index + 1,
      direccion_entrega: `Destino ${index + 1}`, latitud, longitud,
      peso_kg: 10, volumen_m3: 0.5, prioridad: 'ESTANDAR',
      tipo_producto: 'NO_PERECEDERO', hora_inicio: '05:00', hora_fin: '22:00',
    })),
    [{
      id_vehiculo: 1, placa: 'TEST-1', capacidad_kg: 500, capacidad_m3: 20,
      consumo_km_l: 10, factor_co2_kg_km: 0.9, tipo_combustible: 'DIESEL',
    }],
    [], base, new Date().toISOString().slice(0, 10)
  )
}

const result = new Resultado('Fijación de secuencia')
for (const order of [[1, 2, 3, 4], [4, 3, 2, 1], [3, 1, 4, 2]]) {
  const instance = problem()
  const [route, error] = instance.fijar_secuencia(instance.vehiculos[0], null, order)
  result.check(`acepta la secuencia ${order.join(',')}`, route != null && error == null)
  result.check(`conserva el orden ${order.join(',')}`,
    route?.secuencia.map((customer) => customer.id_pedido).join(',') === order.join(','))
}
const duplicate = problem().fijar_secuencia(problem().vehiculos[0], null, [1, 1])
result.check('rechaza pedidos repetidos', duplicate[0] == null && Boolean(duplicate[1]))
const missing = problem().fijar_secuencia(problem().vehiculos[0], null, [999])
result.check('rechaza pedido no disponible', missing[0] == null && Boolean(missing[1]))
process.exitCode = result.resumen() ? 0 : 1
