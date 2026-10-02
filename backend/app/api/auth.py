from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.schemas.auth import LoginRequest, LoginResponse
from app.core.security import verify_password
from app.core.jwt import create_access_token
from app.core.dependencies import get_current_user, require_roles

router = APIRouter(
    prefix="/auth",
    tags=["Autenticación"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post("/login", response_model=LoginResponse)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db),
):
    usuario = db.execute(
        text("""
            SELECT
                u.id_usuario,
                u.id_rol,
                u.nombre,
                u.email,
                u.password_hash,
                u.estado,
                u.intentos_fallidos,
                u.bloqueado_hasta,
                r.nombre AS rol
            FROM usuarios u
            INNER JOIN roles r
                ON r.id_rol = u.id_rol
            WHERE LOWER(u.email) = LOWER(:email)
        """),
        {"email": data.email},
    ).mappings().first()

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    ahora = datetime.now()

    if usuario["bloqueado_hasta"]:
        if usuario["bloqueado_hasta"] > ahora:
            minutos = int(
                (usuario["bloqueado_hasta"] - ahora).total_seconds() / 60
            ) + 1

            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Usuario bloqueado. Intente nuevamente en {minutos} minutos",
            )

        db.execute(
            text("""
                UPDATE usuarios
                SET
                    intentos_fallidos = 0,
                    bloqueado_hasta = NULL,
                    estado = 'ACTIVO'
                WHERE id_usuario = :id_usuario
            """),
            {
                "id_usuario": usuario["id_usuario"],
            },
        )

        db.commit()

    if usuario["estado"] != "ACTIVO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo o bloqueado",
        )

    if not verify_password(data.password, usuario["password_hash"]):
        nuevos_intentos = usuario["intentos_fallidos"] + 1

        if nuevos_intentos >= 3:
            bloqueado_hasta = ahora + timedelta(minutes=15)

            db.execute(
                text("""
                    UPDATE usuarios
                    SET
                        intentos_fallidos = 0,
                        bloqueado_hasta = :bloqueado_hasta,
                        estado = 'BLOQUEADO'
                    WHERE id_usuario = :id_usuario
                """),
                {
                    "bloqueado_hasta": bloqueado_hasta,
                    "id_usuario": usuario["id_usuario"],
                },
            )

            db.commit()

            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail="Usuario bloqueado por 15 minutos debido a 3 intentos fallidos",
            )

        db.execute(
            text("""
                UPDATE usuarios
                SET intentos_fallidos = :intentos
                WHERE id_usuario = :id_usuario
            """),
            {
                "intentos": nuevos_intentos,
                "id_usuario": usuario["id_usuario"],
            },
        )

        db.commit()

        restantes = 3 - nuevos_intentos

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Credenciales incorrectas. Intentos restantes: {restantes}",
        )

    db.execute(
        text("""
            UPDATE usuarios
            SET
                intentos_fallidos = 0,
                bloqueado_hasta = NULL,
                estado = 'ACTIVO',
                ultimo_acceso = CURRENT_TIMESTAMP
            WHERE id_usuario = :id_usuario
        """),
        {"id_usuario": usuario["id_usuario"]},
    )

    db.commit()

    access_token = create_access_token(
        usuario_id=usuario["id_usuario"],
        rol=usuario["rol"],
    )

    return {
        "message": "Inicio de sesión exitoso",
        "access_token": access_token,
        "token_type": "bearer",
        "usuario_id": usuario["id_usuario"],
        "nombre": usuario["nombre"],
        "email": usuario["email"],
        "rol": usuario["rol"],
    }

@router.get("/me")
def get_me(
    usuario=Depends(get_current_user),
):
    return {
        "usuario_id": usuario["id_usuario"],
        "nombre": usuario["nombre"],
        "email": usuario["email"],
        "rol": usuario["rol"],
    }

@router.get("/admin-test")
def admin_test(
    usuario=Depends(require_roles("ADMIN")),
):
    return {
        "message": "Acceso autorizado",
        "usuario": usuario["nombre"],
        "rol": usuario["rol"],
    }