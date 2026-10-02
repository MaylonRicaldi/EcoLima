from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
import bcrypt

from app.db.database import SessionLocal
from app.core.dependencies import require_permiso
from app.core.permisos import (
    USUARIOS,
    ESCRITURA,
    LECTURA,
)
from app.schemas.usuario import (
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioEstadoUpdate,
)

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def listar_usuarios(
    db: Session = Depends(get_db),
    usuario_actual=Depends(require_permiso(USUARIOS, LECTURA)),
):
    resultado = db.execute(
        text("""
            SELECT
                id_usuario,
                id_rol,
                nombre,
                email,
                estado
            FROM usuarios
            ORDER BY id_usuario
        """)
    )

    return [dict(row._mapping) for row in resultado]


@router.get("/{id_usuario}")
def obtener_usuario(
    id_usuario: int,
    db: Session = Depends(get_db),
    usuario_actual=Depends(require_permiso(USUARIOS, LECTURA)),
):
    resultado = db.execute(
        text("""
            SELECT
                id_usuario,
                id_rol,
                nombre,
                email,
                estado
            FROM usuarios
            WHERE id_usuario = :id_usuario
        """),
        {"id_usuario": id_usuario},
    ).mappings().first()

    if not resultado:
        raise HTTPException(
            status_code=404,
            detail="El usuario no existe",
        )

    return dict(resultado)


@router.post("", status_code=status.HTTP_201_CREATED)
def crear_usuario(
    datos: UsuarioCreate,
    db: Session = Depends(get_db),
    usuario_actual=Depends(require_permiso(USUARIOS, ESCRITURA)),
):
    rol = db.execute(
        text("""
            SELECT id_rol
            FROM roles
            WHERE id_rol = :id_rol
        """),
        {"id_rol": datos.id_rol},
    ).mappings().first()

    if not rol:
        raise HTTPException(
            status_code=400,
            detail="El rol indicado no existe",
        )

    usuario_existente = db.execute(
        text("""
            SELECT id_usuario
            FROM usuarios
            WHERE email = :email
        """),
        {"email": datos.email},
    ).mappings().first()

    if usuario_existente:
        raise HTTPException(
            status_code=400,
            detail="El correo electrónico ya está registrado",
        )

    password_hash = bcrypt.hashpw(
        datos.password.encode("utf-8"),
        bcrypt.gensalt(rounds=12),
    ).decode("utf-8")

    resultado = db.execute(
        text("""
            INSERT INTO usuarios (
                id_rol,
                nombre,
                email,
                password_hash,
                estado
            )
            VALUES (
                :id_rol,
                :nombre,
                :email,
                :password_hash,
                :estado
            )
            RETURNING
                id_usuario,
                id_rol,
                nombre,
                email,
                estado
        """),
        {
            "id_rol": datos.id_rol,
            "nombre": datos.nombre,
            "email": datos.email,
            "password_hash": password_hash,
            "estado": datos.estado,
        },
    )

    db.commit()

    return dict(resultado.mappings().one())


@router.put("/{id_usuario}")
def actualizar_usuario(
    id_usuario: int,
    datos: UsuarioUpdate,
    db: Session = Depends(get_db),
    usuario_actual=Depends(require_permiso(USUARIOS, ESCRITURA)),
):
    usuario = db.execute(
        text("""
            SELECT id_usuario
            FROM usuarios
            WHERE id_usuario = :id_usuario
        """),
        {"id_usuario": id_usuario},
    ).mappings().first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="El usuario no existe",
        )

    email_existente = db.execute(
        text("""
            SELECT id_usuario
            FROM usuarios
            WHERE email = :email
              AND id_usuario <> :id_usuario
        """),
        {
            "email": datos.email,
            "id_usuario": id_usuario,
        },
    ).mappings().first()

    if email_existente:
        raise HTTPException(
            status_code=400,
            detail="El correo electrónico ya está registrado",
        )

    resultado = db.execute(
        text("""
            UPDATE usuarios
            SET
                nombre = :nombre,
                email = :email,
                estado = :estado
            WHERE id_usuario = :id_usuario
            RETURNING
                id_usuario,
                id_rol,
                nombre,
                email,
                estado
        """),
        {
            "id_usuario": id_usuario,
            "nombre": datos.nombre,
            "email": datos.email,
            "estado": datos.estado,
        },
    )

    db.commit()

    return dict(resultado.mappings().one())


@router.patch("/{id_usuario}/estado")
def cambiar_estado_usuario(
    id_usuario: int,
    datos: UsuarioEstadoUpdate,
    db: Session = Depends(get_db),
    usuario_actual=Depends(require_permiso(USUARIOS, ESCRITURA)),
):
    resultado = db.execute(
        text("""
            UPDATE usuarios
            SET estado = :estado
            WHERE id_usuario = :id_usuario
            RETURNING
                id_usuario,
                id_rol,
                nombre,
                email,
                estado
        """),
        {
            "id_usuario": id_usuario,
            "estado": datos.estado,
        },
    )

    usuario = resultado.mappings().first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="El usuario no existe",
        )

    db.commit()

    return dict(usuario)