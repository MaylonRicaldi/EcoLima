import bcrypt from 'bcryptjs'
import { createToolsPool, requireApply } from './shared.js'

const password = 'Demo1234'
const users = [
  { email: 'admin@ecolima.com', nombre: 'Administrador EcoLima', rol: 'ADMIN' },
  { email: 'operador@ecolima.com', nombre: 'Operador Demo', rol: 'OPERADOR' },
  { email: 'conductor@ecolima.com', nombre: 'Conductor Demo', rol: 'CONDUCTOR' },
  { email: 'auditor@ecolima.com', nombre: 'Auditor Demo', rol: 'AUDITOR' },
  { email: 'cliente@ecolima.com', nombre: 'Cliente Demo', rol: 'CLIENTE' },
]
const pool = createToolsPool()

try {
  const action = process.argv[2] ?? 'listar'
  if (action === 'listar') {
    const { rows } = await pool.query(`
      SELECT u.id_usuario, r.nombre AS rol, u.email, u.estado
      FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
      ORDER BY r.id_rol, u.id_usuario
    `)
    console.log(' id  rol        email                            estado')
    for (const row of rows) console.log(row)
  } else if (action === 'crear' || action === 'resetar') {
    if (action === 'resetar' && (!process.argv[3] || !process.argv[4])) {
      console.log('Uso: resetar <email> <contrasena> --apply')
      process.exitCode = 1
    } else if (await requireApply(`${action} usuarios de demostración`)) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        if (action === 'resetar') {
          const hash = await bcrypt.hash(process.argv[4], 12)
          const result = await client.query(`
            UPDATE usuarios SET password_hash = $1, intentos_fallidos = 0,
              bloqueado_hasta = NULL, estado = 'ACTIVO' WHERE email = $2
          `, [hash, process.argv[3]])
          if (!result.rowCount) throw new Error(`No existe el usuario ${process.argv[3]}.`)
          console.log(`Contraseña de ${process.argv[3]} restablecida.`)
        } else {
          const hash = await bcrypt.hash(password, 12)
          for (const user of users) {
            const existing = await client.query(
              'SELECT id_usuario FROM usuarios WHERE email = $1', [user.email]
            )
            const role = await client.query(
              'SELECT id_rol FROM roles WHERE nombre = $1', [user.rol]
            )
            if (!role.rows[0]) throw new Error(`No existe rol ${user.rol}.`)
            if (existing.rows[0]) {
              await client.query(`
                UPDATE usuarios SET estado = 'ACTIVO', intentos_fallidos = 0,
                  bloqueado_hasta = NULL WHERE email = $1
              `, [user.email])
              console.log(`  ya existe: ${user.email}`)
            } else {
              await client.query(`
                INSERT INTO usuarios (id_rol, nombre, email, password_hash, estado)
                VALUES ($1, $2, $3, $4, 'ACTIVO')
              `, [role.rows[0].id_rol, user.nombre, user.email, hash])
              console.log(`  creado: ${user.email}`)
            }
          }
          const clientExists = await client.query(
            'SELECT 1 FROM clientes WHERE email = $1', ['cliente@ecolima.com']
          )
          if (!clientExists.rowCount) {
            await client.query(`
              INSERT INTO clientes (nombre, email, direccion, latitud, longitud, estado)
              VALUES ('Cliente Demo', 'cliente@ecolima.com',
                'Av. Siempre Viva 742, San Juan de Lurigancho', -12.01, -77.005, 'ACTIVO')
            `)
            console.log('  creado cliente homónimo para el rol CLIENTE')
          }
        }
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }
  } else {
    console.log('Acciones: listar | crear --apply | resetar <email> <contrasena> --apply')
    process.exitCode = 1
  }
} finally {
  await pool.end()
}
