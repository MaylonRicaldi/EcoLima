import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_ventanas', 'Ventanas de tiempo (comprobaciones de lectura)')
