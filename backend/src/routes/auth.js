import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

function isEmail(value) {
  return typeof value === 'string'
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validationError(errors) {
  return { detail: errors.map((error) => ({ loc: ['body', error.field], msg: error.message, type: 'value_error' })) }
}

export function createAuthRouter({ pool, config, authenticate, requireRoles }) {
  const router = Router()

  router.post('/login', async (req, res, next) => {
    const { email, password } = req.body ?? {}
    const errors = []
    if (!isEmail(email)) {
      errors.push({ field: 'email', message: 'value is not a valid email address' })
    }
    if (typeof password !== 'string') {
      errors.push({ field: 'password', message: 'Field required' })
    }
    if (errors.length) {
      return res.status(422).json(validationError(errors))
    }

    const client = await pool.connect().catch(next)
    if (!client) return

    try {
      await client.query('BEGIN')
      const result = await client.query(
        `SELECT u.id_usuario, u.id_rol, u.nombre, u.email, u.password_hash,
                u.estado, u.intentos_fallidos, u.bloqueado_hasta, r.nombre AS rol
         FROM usuarios u
         INNER JOIN roles r ON r.id_rol = u.id_rol
         WHERE LOWER(u.email) = LOWER($1)
         FOR UPDATE OF u`,
        [email]
      )
      const user = result.rows[0]

      if (!user) {
        await client.query('ROLLBACK')
        return res.status(401).json({ detail: 'Credenciales incorrectas' })
      }

      const now = new Date()
      if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > now) {
        const remainingMinutes = Math.ceil(
          (new Date(user.bloqueado_hasta).getTime() - now.getTime()) / 60_000
        )
        await client.query('ROLLBACK')
        return res.status(423).json({
          detail: `Usuario bloqueado. Intente nuevamente en ${remainingMinutes} minutos`,
        })
      }

      if (user.bloqueado_hasta) {
        await client.query(
          `UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL,
           estado = 'ACTIVO' WHERE id_usuario = $1`,
          [user.id_usuario]
        )
      }

      if (user.estado !== 'ACTIVO' && !user.bloqueado_hasta) {
        await client.query('ROLLBACK')
        return res.status(403).json({ detail: 'Usuario inactivo o bloqueado' })
      }

      const passwordMatches = await bcrypt.compare(password, user.password_hash)
      if (!passwordMatches) {
        const failedAttempts = user.bloqueado_hasta
          ? 1
          : Number(user.intentos_fallidos) + 1

        if (failedAttempts >= 3) {
          await client.query(
            `UPDATE usuarios SET intentos_fallidos = 0,
             bloqueado_hasta = CURRENT_TIMESTAMP + INTERVAL '15 minutes',
             estado = 'BLOQUEADO' WHERE id_usuario = $1`,
            [user.id_usuario]
          )
          await client.query('COMMIT')
          return res.status(423).json({
            detail: 'Usuario bloqueado por 15 minutos debido a 3 intentos fallidos',
          })
        }

        await client.query(
          'UPDATE usuarios SET intentos_fallidos = $1 WHERE id_usuario = $2',
          [failedAttempts, user.id_usuario]
        )
        await client.query('COMMIT')
        return res.status(401).json({
          detail: `Credenciales incorrectas. Intentos restantes: ${3 - failedAttempts}`,
        })
      }

      await client.query(
        `UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL,
         estado = 'ACTIVO', ultimo_acceso = CURRENT_TIMESTAMP
         WHERE id_usuario = $1`,
        [user.id_usuario]
      )
      await client.query('COMMIT')

      const accessToken = jwt.sign(
        { rol: user.rol },
        config.jwtSecret,
        {
          algorithm: config.jwtAlgorithm,
          subject: String(user.id_usuario),
          expiresIn: `${config.tokenMinutes}m`,
        }
      )

      return res.json({
        message: 'Inicio de sesión exitoso',
        access_token: accessToken,
        token_type: 'bearer',
        usuario_id: user.id_usuario,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      })
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        error.rollbackError = rollbackError
      }
      return next(error)
    } finally {
      client.release()
    }
  })

  router.get('/me', authenticate, (req, res) => res.json({
    usuario_id: req.user.id_usuario,
    nombre: req.user.nombre,
    email: req.user.email,
    rol: req.user.rol,
  }))

  router.get('/admin-test', authenticate, requireRoles('ADMIN'), (req, res) => res.json({
    message: 'Acceso autorizado',
    usuario: req.user.nombre,
    rol: req.user.rol,
  }))

  return router
}
