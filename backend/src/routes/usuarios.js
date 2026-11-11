import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { OPERATIONS } from '../core/permissions.js'

const STATES = new Set(['ACTIVO', 'BLOQUEADO', 'INACTIVO'])
const SELECT_USER = `SELECT id_usuario, id_rol, nombre, email, estado
                     FROM usuarios`

function validationResponse(res, errors) {
  return res.status(422).json({
    detail: errors.map(({ field, message, type }) => ({
      loc: ['body', field],
      msg: message,
      type,
    })),
  })
}

function validateUserBody(value, mode) {
  const errors = []
  const body = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  if (body !== value) {
    errors.push({ field: 'body', message: 'Input should be a valid dictionary or object to extract fields from', type: 'model_attributes_type' })
  }
  const output = {}
  const required = (field) => {
    if (!(field in body)) {
      errors.push({ field, message: 'Field required', type: 'missing' })
      return false
    }
    return true
  }
  const string = (field, { min, max, defaultValue, normalize } = {}) => {
    if (!(field in body)) {
      if (defaultValue !== undefined) output[field] = defaultValue
      else required(field)
      return
    }
    const raw = body[field]
    if (typeof raw !== 'string') {
      errors.push({ field, message: 'Input should be a valid string', type: 'string_type' })
      return
    }
    if (min !== undefined && raw.length < min) {
      errors.push({ field, message: `String should have at least ${min} characters`, type: 'string_too_short' })
    }
    if (max !== undefined && raw.length > max) {
      errors.push({ field, message: `String should have at most ${max} characters`, type: 'string_too_long' })
    }
    output[field] = normalize ? normalize(raw) : raw
  }

  if (mode === 'state') {
    string('estado', { normalize: (state) => state.toUpperCase().trim() })
  } else {
    string('nombre', {
      min: 1,
      max: 100,
      normalize: (name) => name.trim(),
    })
    if (mode === 'create' && typeof body.nombre === 'string' && body.nombre.length > 0 && !body.nombre.trim()) {
      errors.push({ field: 'nombre', message: 'El nombre no puede estar vacío', type: 'value_error' })
    }
    string('email', {
      min: 5,
      max: 150,
      normalize: (email) => email.trim().toLowerCase(),
    })
    if (mode === 'create') {
      string('password', { min: 8 })
      if (!('id_rol' in body)) {
        required('id_rol')
      } else {
        const roleId = Number(body.id_rol)
        if (!Number.isInteger(roleId)) {
          errors.push({ field: 'id_rol', message: 'Input should be a valid integer', type: 'int_parsing' })
        } else if (roleId <= 0) {
          errors.push({ field: 'id_rol', message: 'Input should be greater than 0', type: 'greater_than' })
        } else {
          output.id_rol = roleId
        }
      }
      string('estado', { defaultValue: 'ACTIVO', normalize: (state) => state.toUpperCase().trim() })
    } else {
      string('estado', { defaultValue: 'ACTIVO', normalize: (state) => state.toUpperCase().trim() })
    }
  }

  if (typeof output.estado === 'string' && !STATES.has(output.estado)) {
    errors.push({ field: 'estado', message: 'Estado no válido', type: 'value_error' })
  }
  return { output, errors }
}

function parseId(value) {
  if (!/^[+-]?\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

function withIdValidation(req, res, next, name) {
  const id = parseId(req.params[name])
  if (id === null) {
    return res.status(422).json({
      detail: [{
        loc: ['path', name],
        msg: 'Input should be a valid integer, unable to parse string as an integer',
        type: 'int_parsing',
      }],
    })
  }
  req[name] = id
  return next()
}

export function createUsuariosRouter({ pool, authenticate, requirePermission }) {
  const router = Router()
  const read = requirePermission('usuarios', OPERATIONS.READ)
  const write = requirePermission('usuarios', OPERATIONS.WRITE)

  router.get('', authenticate, read, async (_req, res, next) => {
    try {
      const { rows } = await pool.query(`${SELECT_USER} ORDER BY id_usuario`)
      return res.json(rows)
    } catch (error) {
      return next(error)
    }
  })

  router.get('/:id_usuario', authenticate, read, (req, res, next) => {
    withIdValidation(req, res, next, 'id_usuario')
  }, async (req, res, next) => {
    try {
      const { rows } = await pool.query(`${SELECT_USER} WHERE id_usuario = $1`, [req.id_usuario])
      if (!rows[0]) return res.status(404).json({ detail: 'El usuario no existe' })
      return res.json(rows[0])
    } catch (error) {
      return next(error)
    }
  })

  router.post('', authenticate, write, async (req, res, next) => {
    const { output, errors } = validateUserBody(req.body, 'create')
    if (errors.length) return validationResponse(res, errors)
    try {
      const role = await pool.query('SELECT id_rol FROM roles WHERE id_rol = $1', [output.id_rol])
      if (!role.rows[0]) return res.status(400).json({ detail: 'El rol indicado no existe' })

      const duplicate = await pool.query('SELECT id_usuario FROM usuarios WHERE email = $1', [output.email])
      if (duplicate.rows[0]) {
        return res.status(400).json({ detail: 'El correo electrónico ya está registrado' })
      }

      const passwordHash = await bcrypt.hash(output.password, 12)
      const result = await pool.query(
        `INSERT INTO usuarios (id_rol, nombre, email, password_hash, estado)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id_usuario, id_rol, nombre, email, estado`,
        [output.id_rol, output.nombre, output.email, passwordHash, output.estado]
      )
      return res.status(201).json(result.rows[0])
    } catch (error) {
      return next(error)
    }
  })

  router.put('/:id_usuario', authenticate, write, (req, res, next) => {
    withIdValidation(req, res, next, 'id_usuario')
  }, async (req, res, next) => {
    const { output, errors } = validateUserBody(req.body, 'update')
    if (errors.length) return validationResponse(res, errors)
    try {
      const existing = await pool.query('SELECT id_usuario FROM usuarios WHERE id_usuario = $1', [req.id_usuario])
      if (!existing.rows[0]) return res.status(404).json({ detail: 'El usuario no existe' })

      const duplicate = await pool.query(
        'SELECT id_usuario FROM usuarios WHERE email = $1 AND id_usuario <> $2',
        [output.email, req.id_usuario]
      )
      if (duplicate.rows[0]) {
        return res.status(400).json({ detail: 'El correo electrónico ya está registrado' })
      }

      const result = await pool.query(
        `UPDATE usuarios SET nombre = $1, email = $2, estado = $3
         WHERE id_usuario = $4
         RETURNING id_usuario, id_rol, nombre, email, estado`,
        [output.nombre, output.email, output.estado, req.id_usuario]
      )
      return res.json(result.rows[0])
    } catch (error) {
      return next(error)
    }
  })

  router.patch('/:id_usuario/estado', authenticate, write, (req, res, next) => {
    withIdValidation(req, res, next, 'id_usuario')
  }, async (req, res, next) => {
    const { output, errors } = validateUserBody(req.body, 'state')
    if (errors.length) return validationResponse(res, errors)
    try {
      const result = await pool.query(
        `UPDATE usuarios SET estado = $1 WHERE id_usuario = $2
         RETURNING id_usuario, id_rol, nombre, email, estado`,
        [output.estado, req.id_usuario]
      )
      if (!result.rows[0]) return res.status(404).json({ detail: 'El usuario no existe' })
      return res.json(result.rows[0])
    } catch (error) {
      return next(error)
    }
  })

  return router
}
