import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_local_mapa', 'Local y mapa (comprobaciones de lectura)')
