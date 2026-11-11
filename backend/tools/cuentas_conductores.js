import bcrypt from 'bcryptjs'
import { createToolsPool, requireApply } from './shared.js'

const accounts = [
  ['conductoreco1', 'Carlos', 'Perez', '74512415'],
  ['conductoreco2', 'Maylon', 'Ricaldi', '74154215'],
  ['conductoreco3', 'Luis', 'Quispe', '70112233'],
  ['conductoreco4', 'Ana', 'Torres', '70223344'],
  ['conductoreco5', 'Jose', 'Ramirez', '70334455'],
]
const licenseCategories = ['A-IIA', 'A-IIB', 'A-IIIA']
const pool = createToolsPool()

try {
  if (!(await requireApply('reorganizar cuentas de conductores'))) {
    console.log('No se modificaron cuentas. Se requiere --apply y confirmación.')
  } else {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const admin = await client.query(`
        SELECT u.id_usuario FROM usuarios u JOIN roles r ON r.id_rol = u.id_rol
        WHERE u.email = 'admin@ecolima.com' AND r.nombre = 'ADMIN'
      `)
      if (!admin.rows[0]) throw new Error('No se encontró admin@ecolima.com.')
      const adminId = admin.rows[0].id_usuario
      const attached = await client.query(
        'SELECT id_conductor FROM conductores WHERE id_usuario = $1 ORDER BY id_conductor',
        [adminId]
      )
      const rest = await client.query(
        'SELECT id_conductor FROM conductores WHERE id_usuario <> $1 ORDER BY id_conductor',
        [adminId]
      )
      const reusable = [
        ...attached.rows.map((row) => row.id_conductor),
        ...rest.rows.map((row) => row.id_conductor),
      ]
      const usedRows = await client.query('SELECT dni FROM conductores')
      const used = new Set(usedRows.rows.map((row) => row.dni))
      await client.query('UPDATE conductores SET id_usuario = NULL WHERE id_usuario = $1', [adminId])
      const conductorRole = await client.query(
        "SELECT id_rol FROM roles WHERE nombre = 'CONDUCTOR'"
      )
      if (!conductorRole.rows[0]) throw new Error('No existe el rol CONDUCTOR.')

      for (const [index, [suffix, firstName, lastName, candidateDni]] of accounts.entries()) {
        const email = `${suffix}@ecolima.com`
        let dni = candidateDni
        if (used.has(dni)) {
          let numeric = 70_000_000 + used.size * 1111
          while (used.has(String(numeric))) numeric += 7
          dni = String(numeric)
        }
        used.add(dni)
        const passwordHash = await bcrypt.hash(suffix, 12)
        const existing = await client.query(
          'SELECT id_usuario FROM usuarios WHERE email = $1', [email]
        )
        let userId
        if (existing.rows[0]) {
          userId = existing.rows[0].id_usuario
          await client.query(`
            UPDATE usuarios SET id_rol = $1, password_hash = $2,
              intentos_fallidos = 0, bloqueado_hasta = NULL, estado = 'ACTIVO'
            WHERE id_usuario = $3
          `, [conductorRole.rows[0].id_rol, passwordHash, userId])
        } else {
          const inserted = await client.query(`
            INSERT INTO usuarios (id_rol, nombre, email, password_hash, estado)
            VALUES ($1, $2, $3, $4, 'ACTIVO') RETURNING id_usuario
          `, [conductorRole.rows[0].id_rol, `${firstName} ${lastName}`, email, passwordHash])
          userId = inserted.rows[0].id_usuario
        }

        const driverId = reusable[index]
        if (driverId) {
          await client.query(`
            UPDATE conductores SET id_usuario = $1, nombre = $2, apellido = $3,
              dni = $4, estado = 'DISPONIBLE', horas_conduccion_acumuladas = 0
            WHERE id_conductor = $5
          `, [userId, firstName, lastName, dni, driverId])
          const license = await client.query(
            'SELECT 1 FROM licencias WHERE id_conductor = $1 LIMIT 1', [driverId]
          )
          if (!license.rowCount) {
            await client.query(`
              INSERT INTO licencias (
                id_conductor, numero, categoria, fecha_emision, fecha_vencimiento, estado
              ) VALUES ($1, $2, $3, CURRENT_DATE - 365, CURRENT_DATE + 730, 'VIGENTE')
            `, [driverId, `Q${suffix.toUpperCase().slice(0, 8)}`, licenseCategories[index % licenseCategories.length]])
          }
        } else {
          const inserted = await client.query(`
            INSERT INTO conductores (
              id_usuario, dni, nombre, apellido, telefono, anios_experiencia,
              hora_disponibilidad_inicio, hora_disponibilidad_fin,
              horas_max_conduccion, horas_conduccion_acumuladas, estado
            ) VALUES ($1, $2, $3, $4, $5, $6, '06:00', '20:00', 8, 0, 'DISPONIBLE')
            RETURNING id_conductor
          `, [userId, dni, firstName, lastName, `90000000${index + 1}`, 2 + index])
          await client.query(`
            INSERT INTO licencias (
              id_conductor, numero, categoria, fecha_emision, fecha_vencimiento, estado
            ) VALUES ($1, $2, $3, CURRENT_DATE - 365, CURRENT_DATE + 730, 'VIGENTE')
          `, [inserted.rows[0].id_conductor, `Q${suffix.toUpperCase().slice(0, 8)}`, licenseCategories[index % licenseCategories.length]])
        }
        console.log(`  cuenta preparada: ${email}`)
      }
      await client.query(`
        UPDATE usuarios SET password_hash = $1, intentos_fallidos = 0,
          bloqueado_hasta = NULL, estado = 'ACTIVO' WHERE id_usuario = $2
      `, [await bcrypt.hash('admin', 12), adminId])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
} finally {
  await pool.end()
}
