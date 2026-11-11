import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_entregas', 'Entregas y rutas (comprobaciones de lectura)')
