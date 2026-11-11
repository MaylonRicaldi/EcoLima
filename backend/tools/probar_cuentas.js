import { Api, Resultado, requireApply } from './shared.js'

const accounts = [
  ['admin@ecolima.com', 'admin'],
  ['operador@ecolima.com', 'operador'],
  ['auditor@ecolima.com', 'auditor'],
  ['cliente@ecolima.com', 'cliente'],
  ['conductor@ecolima.com', 'conductor'],
  ...Array.from({ length: 5 }, (_item, index) => {
    const name = `conductoreco${index + 1}`
    return [`${name}@ecolima.com`, name]
  }),
]
if (await requireApply('probar inicios de sesión (actualiza contadores de acceso)')) {
  const result = new Resultado('Cuentas y contraseñas')
  const api = new Api()
  for (const [email, password] of accounts) {
    try {
      const [status, body] = await api.post('/auth/login', { email, password })
      result.check(`login ${email}`, status === 200, status === 200 ? `rol ${body.rol}` : `status ${status}`)
    } catch (error) {
      result.check(`login ${email}`, false, error.message)
    }
  }
  process.exitCode = result.resumen() ? 0 : 1
}
