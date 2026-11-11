import { runNamedProbe } from './api-probes.js'
process.exitCode = await runNamedProbe('prueba_dashboards', 'Dashboards y recursos por rol (lectura ADMIN)')
