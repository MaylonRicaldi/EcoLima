import { ProblemaVRPTW } from '../src/services/optimizer.js'
import { PARAMS } from '../src/core/parameters.js'
import { Resultado } from './shared.js'

const base = { latitud: -12.055, longitud: -77.143 }
const problem = new ProblemaVRPTW([], [], [{
  id_conductor: 1, nombre: 'Prueba', apellido: 'Conductor',
  hora_disponibilidad_inicio: '05:00', hora_disponibilidad_fin: '22:00',
  horas_max_conduccion: 8, horas_conduccion_acumuladas: 0,
  ubicacion_inicio: { x: -77.01, y: -12.01 },
}], base, '2026-10-12')
const driver = problem.conductores[0]
const cutoff = PARAMS.returnToDepotHour * 60
const result = new Resultado('Vuelta al local por la noche')
result.check('antes de la hora de retorno se usa el origen del conductor',
  problem._idx_retorno(driver, cutoff - 1) === problem._idx_origen(driver))
result.check('desde la hora de retorno se usa el local',
  problem._idx_retorno(driver, cutoff) === 0)
result.check('el local es el primer punto de origen',
  problem._origenes[0][0] === base.latitud && problem._origenes[0][1] === base.longitud)
process.exitCode = result.resumen() ? 0 : 1
