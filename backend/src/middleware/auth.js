import jwt from 'jsonwebtoken'
import { hasPermission } from '../core/permissions.js'

export function createAuthMiddleware({ pool, jwtSecret, jwtAlgorithm }) {
  async function authenticate(req, res, next) {
    const authorization = req.get('authorization')
    const [scheme, token, ...extra] = authorization?.split(' ') ?? []

    if (scheme !== 'Bearer' || !token || extra.length > 0) {
      return res.status(401)
        .set('WWW-Authenticate', 'Bearer')
        .json({ detail: 'Not authenticated' })
    }

    let payload
    try {
      payload = jwt.verify(token, jwtSecret, { algorithms: [jwtAlgorithm] })
    } catch {
      return res.status(401)
        .set('WWW-Authenticate', 'Bearer')
        .json({ detail: 'Token inválido o expirado' })
    }

    const userId = Number(payload.sub)
    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(401)
        .set('WWW-Authenticate', 'Bearer')
        .json({ detail: 'Token inválido' })
    }

    try {
      const { rows } = await pool.query(
        `SELECT u.id_usuario, u.nombre, u.email, u.estado, r.nombre AS rol
         FROM usuarios u
         INNER JOIN roles r ON r.id_rol = u.id_rol
         WHERE u.id_usuario = $1`,
        [userId]
      )
      const user = rows[0]

      if (!user) {
        return res.status(401)
          .set('WWW-Authenticate', 'Bearer')
          .json({ detail: 'Usuario no encontrado' })
      }
      if (user.estado !== 'ACTIVO') {
        return res.status(403).json({ detail: 'Usuario inactivo o bloqueado' })
      }

      req.user = user
      return next()
    } catch (error) {
      return next(error)
    }
  }

  function requireRoles(...roles) {
    return (req, res, next) => {
      if (!roles.includes(req.user?.rol)) {
        return res.status(403).json({
          detail: 'No tiene permisos para acceder a este recurso',
        })
      }
      return next()
    }
  }

  function requirePermission(resource, operation) {
    return (req, res, next) => {
      if (!hasPermission(req.user?.rol, resource, operation)) {
        return res.status(403).json({
          detail: 'No tiene permisos para acceder a este recurso',
        })
      }
      return next()
    }
  }

  return { authenticate, requireRoles, requirePermission }
}
