import {
  calculateCo2, calculateTco, equivalentTrees, windowLatePenalty,
} from '../src/services/calculations.js'
import { ProblemaVRPTW } from '../src/services/optimizer.js'
import { Resultado } from './shared.js'

const result = new Resultado('Optimizador y cálculos de logística')
const base = { latitud: -12.015, longitud: -77.005 }
const vehicle = (plate, capacityKg = 100) => ({
  id_vehiculo: 1, placa: plate, capacidad_kg: capacityKg, capacidad_m3: 10,
  consumo_km_l: 10, factor_co2_kg_km: 0.9, tipo_combustible: 'DIESEL',
  costo_adquisicion: 50000, costo_soat_anual: 500, costo_seguro_anual: 1500,
})
const order = (id, kg = 60) => ({
  id_pedido: id, id_cliente: id, direccion_entrega: `Dirección ${id}`,
  latitud: -12.01, longitud: -77.01, peso_kg: kg, volumen_m3: 1,
  prioridad: 'ESTANDAR', tipo_producto: 'NO_PERECEDERO',
  hora_inicio: '08:00', hora_fin: '12:00', tolerancia_minutos: 15,
})

result.check('CO2 = distancia * factor', calculateCo2(10, 0.9) === 9)
result.check('equivalencia de árboles', equivalentTrees(22000) === 1000)
result.check('penalidad por 30 minutos', windowLatePenalty(30) === 15)
const tco = calculateTco(20, vehicle('ABC-123'))
result.check('TCO contiene emisiones y costos', tco.co2_kg === 18 && tco.costo_total > 0)

const monday = new ProblemaVRPTW([], [vehicle('ABC-120'), vehicle('ABC-121')], [], base, '2026-10-05')
result.check('restricción MTC lunes: dígito 0', monday.vehiculos[0].elegible_hoy(monday.dia_semana) === false)
result.check('restricción MTC lunes: dígito 1', monday.vehiculos[1].elegible_hoy(monday.dia_semana) === true)
const sunday = new ProblemaVRPTW([], [vehicle('ABC-120')], [], base, '2026-10-04')
result.check('domingo: todos los vehículos circulan', sunday.vehiculos[0].elegible_hoy(sunday.dia_semana) === true)

const capacityProblem = new ProblemaVRPTW(
  [order(1)], [vehicle('ABC-123', 100)], [], base, '2026-10-05'
)
const routes = capacityProblem.solucion_inicial()
result.check('pedido dentro de capacidad genera ruta', routes.length === 1 && routes[0].vehiculo.carga_kg === 60)
const tooSmall = new ProblemaVRPTW([order(1)], [vehicle('ABC-123', 50)], [], base, '2026-10-05')
result.check('pedido fuera de capacidad queda sin ruta', tooSmall.solucion_inicial().length === 0)

process.exitCode = result.resumen() ? 0 : 1
