import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_saturacion', 'Saturación y obstáculos (comprobaciones de lectura)')
