from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.jwt import decode_access_token
from app.core.permisos import CLIENTE, CONDUCTOR, roles_con_permiso
from app.db.database import SessionLocal


security = HTTPBearer()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    token = credentials.credentials

    try:
        payload = decode_access_token(token)

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    usuario_id = payload.get("sub")

    if not usuario_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    usuario = db.execute(
        text("""
            SELECT
                u.id_usuario,
                u.nombre,
                u.email,
                u.estado,
                r.nombre AS rol
            FROM usuarios u
            INNER JOIN roles r
                ON r.id_rol = u.id_rol
            WHERE u.id_usuario = :id_usuario
        """),
        {
            "id_usuario": int(usuario_id),
        },
    ).mappings().first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if usuario["estado"] != "ACTIVO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo o bloqueado",
        )

    return usuario

def require_roles(*roles_permitidos):
    def role_checker(
        usuario=Depends(get_current_user),
    ):
        if usuario["rol"] not in roles_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para acceder a este recurso",
            )

        return usuario

    return role_checker


def require_permiso(recurso, operacion):
    """Exige un permiso concreto de la matriz de app/core/permisos.py.

    Complementa a require_roles: en vez de nombrar roles, se declara qué
    operación se necesita sobre qué recurso.
    """
    roles_autorizados = roles_con_permiso(recurso, operacion)

    def permiso_checker(
        usuario=Depends(get_current_user),
    ):
        if usuario["rol"] not in roles_autorizados:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para acceder a este recurso",
            )

        return usuario

    return permiso_checker


def es_conductor(usuario):
    """True si el usuario autenticado tiene rol CONDUCTOR."""
    return usuario["rol"] == CONDUCTOR


def es_cliente(usuario):
    """True si el usuario autenticado tiene rol CLIENTE."""
    return usuario["rol"] == CLIENTE


def id_conductor_de(usuario, db):
    """Devuelve el id_conductor del usuario si tiene rol CONDUCTOR.

    El vínculo usuario -> conductor es columnas.id_usuario (UNIQUE).
    Devuelve None si no existe el conductor asociado.
    """
    if not es_conductor(usuario):
        return None

    return db.execute(
        text("SELECT id_conductor FROM conductores WHERE id_usuario = :id"),
        {"id": int(usuario["id_usuario"])},
    ).scalar()


def id_cliente_de(usuario, db):
    """Devuelve el id_cliente del usuario si tiene rol CLIENTE.

    El vínculo usuario -> cliente es por correo: el usuario registrado
    comparte email con el cliente al que pertenece. Devuelve None para
    cualquier otro rol, de modo que el filtro por fila no restea.
    """
    if not es_cliente(usuario):
        return None

    return db.execute(
        text("SELECT id_cliente FROM clientes WHERE email = :email"),
        {"email": usuario["email"]},
    ).scalar()