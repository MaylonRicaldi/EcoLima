import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_permisos', 'Permisos de lectura ADMIN')
