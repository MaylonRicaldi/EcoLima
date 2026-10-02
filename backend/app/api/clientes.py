from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_permiso
from app.core.permisos import (
    CLIENTES,
    ESCRITURA,
    LECTURA,
)
from app.schemas.cliente import (
    ClienteCreate,
    ClienteEstadoUpdate,
    ClienteResponse,
    ClienteUpdate,
)


router = APIRouter(
    prefix="/clientes",
    tags=["Clientes"],
)

COLUMNAS = """
    c.id_cliente,
    c.nombre,
    c.documento,
    c.telefono,
    c.email,
    c.direccion,
    c.referencia,
    c.latitud,
    c.longitud,
    c.horario_apertura,
    c.horario_cierre,
    c.restricciones_acceso,
    c.estado
"""


@router.get(
    "",
    response_model=list[ClienteResponse],
)
def listar_clientes(
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CLIENTES, LECTURA)),
):
    resultado = db.execute(
        text(f"""
            SELECT {COLUMNAS}
            FROM clientes c
            ORDER BY c.nombre
        """)
    )

    return [dict(row._mapping) for row in resultado]


@router.get(
    "/{id_cliente}",
    response_model=ClienteResponse,
)
def obtener_cliente(
    id_cliente: int,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CLIENTES, LECTURA)),
):
    resultado = db.execute(
        text(f"""
            SELECT {COLUMNAS}
            FROM clientes c
            WHERE c.id_cliente = :id_cliente
        """),
        {"id_cliente": id_cliente},
    ).mappings().first()

    if not resultado:
        raise HTTPException(
            status_code=404,
            detail="El cliente no existe",
        )

    return dict(resultado)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ClienteResponse,
)
def crear_cliente(
    datos: ClienteCreate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CLIENTES, ESCRITURA)),
):
    if datos.email:
        duplicado = db.execute(
            text("""
                SELECT id_cliente
                FROM clientes
                WHERE LOWER(email) = LOWER(:email)
            """),
            {"email": datos.email},
        ).scalar()

        if duplicado:
            raise HTTPException(
                status_code=400,
                detail="Ya existe un cliente registrado con ese correo",
            )

    # ubicacion la sincroniza el trigger trg_clientes_geo a partir de
    # latitud/longitud (RN-011).
    cliente = db.execute(
        text("""
            INSERT INTO clientes (
                nombre,
                documento,
                telefono,
                email,
                direccion,
                referencia,
                latitud,
                longitud,
                horario_apertura,
                horario_cierre,
                restricciones_acceso,
                estado
            )
            VALUES (
                :nombre,
                :documento,
                :telefono,
                :email,
                :direccion,
                :referencia,
                :latitud,
                :longitud,
                :horario_apertura,
                :horario_cierre,
                :restricciones_acceso,
                :estado
            )
            RETURNING id_cliente
        """),
        {
            "nombre": datos.nombre,
            "documento": datos.documento,
            "telefono": datos.telefono,
            "email": datos.email,
            "direccion": datos.direccion,
            "referencia": datos.referencia,
            "latitud": datos.latitud,
            "longitud": datos.longitud,
            "horario_apertura": datos.horario_apertura,
            "horario_cierre": datos.horario_cierre,
            "restricciones_acceso": datos.restricciones_acceso,
            "estado": datos.estado,
        },
    ).scalar()

    db.commit()

    return obtener_cliente(cliente, db, usuario)


@router.put(
    "/{id_cliente}",
    response_model=ClienteResponse,
)
def actualizar_cliente(
    id_cliente: int,
    datos: ClienteUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CLIENTES, ESCRITURA)),
):
    existente = db.execute(
        text("""
            SELECT id_cliente
            FROM clientes
            WHERE id_cliente = :id_cliente
        """),
        {"id_cliente": id_cliente},
    ).scalar()

    if not existente:
        raise HTTPException(
            status_code=404,
            detail="El cliente no existe",
        )

    if datos.email:
        duplicado = db.execute(
            text("""
                SELECT id_cliente
                FROM clientes
                WHERE LOWER(email) = LOWER(:email)
                  AND id_cliente <> :id_cliente
            """),
            {
                "email": datos.email,
                "id_cliente": id_cliente,
            },
        ).scalar()

        if duplicado:
            raise HTTPException(
                status_code=400,
                detail="Ya existe otro cliente registrado con ese correo",
            )

    db.execute(
        text("""
            UPDATE clientes
            SET
                nombre = :nombre,
                documento = :documento,
                telefono = :telefono,
                email = :email,
                direccion = :direccion,
                referencia = :referencia,
                latitud = :latitud,
                longitud = :longitud,
                horario_apertura = :horario_apertura,
                horario_cierre = :horario_cierre,
                restricciones_acceso = :restricciones_acceso
            WHERE id_cliente = :id_cliente
        """),
        {
            "id_cliente": id_cliente,
            "nombre": datos.nombre,
            "documento": datos.documento,
            "telefono": datos.telefono,
            "email": datos.email,
            "direccion": datos.direccion,
            "referencia": datos.referencia,
            "latitud": datos.latitud,
            "longitud": datos.longitud,
            "horario_apertura": datos.horario_apertura,
            "horario_cierre": datos.horario_cierre,
            "restricciones_acceso": datos.restricciones_acceso,
        },
    )

    db.commit()

    return obtener_cliente(id_cliente, db, usuario)


@router.patch(
    "/{id_cliente}/estado",
    response_model=ClienteResponse,
)
def cambiar_estado_cliente(
    id_cliente: int,
    datos: ClienteEstadoUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CLIENTES, ESCRITURA)),
):
    cliente = db.execute(
        text("""
            UPDATE clientes
            SET estado = :estado
            WHERE id_cliente = :id_cliente
            RETURNING id_cliente
        """),
        {
            "id_cliente": id_cliente,
            "estado": datos.estado,
        },
    ).scalar()

    if not cliente:
        raise HTTPException(
            status_code=404,
            detail="El cliente no existe",
        )

    db.commit()

    return obtener_cliente(cliente, db, usuario)