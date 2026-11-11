import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_modo_conductor', 'Modo conductor (comprobaciones de lectura ADMIN)')
