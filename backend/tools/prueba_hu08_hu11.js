import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_hu08_hu11', 'Tráfico, incidentes, reportes y sostenibilidad')
