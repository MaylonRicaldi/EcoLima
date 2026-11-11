import { createRoadsService } from '../src/services/roads.js'
import { Resultado } from './shared.js'

const result = new Resultado('Motor de rutas por calzada')
let calls = 0
const roads = createRoadsService({
  baseUrl: 'https://osrm.test',
  fetchImpl: async (url) => {
    calls += 1
    const count = (new URL(url).pathname.split('/').at(-1) ?? '').split(';').length
    return {
      ok: true,
      json: async () => ({
        distances: Array.from({ length: count }, (_row, i) =>
          Array.from({ length: count }, (_cell, j) => i === j ? 0 : 1200)
        ),
        durations: Array.from({ length: count }, (_row, i) =>
          Array.from({ length: count }, (_cell, j) => i === j ? 0 : 300)
        ),
      }),
    }
  },
})
const coordinates = [[-12.015, -77.005], [-12.02, -76.99]]
const first = await roads.matrix(coordinates)
const second = await roads.matrix(coordinates)
result.check('la matriz resuelve distancias y tiempos', first.km?.[0]?.[1] === 1.2 && first.minutes?.[0]?.[1] === 5)
result.check('la misma consulta usa caché', calls === 1 && second.km?.[0]?.[1] === 1.2)
result.check('geometría de segmento disponible', typeof roads.segment === 'function')
process.exitCode = result.resumen() ? 0 : 1
