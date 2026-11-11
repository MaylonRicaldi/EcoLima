import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_reoptimizacion', 'Rutas para reoptimización (listado)')
