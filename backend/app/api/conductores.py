from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_permiso
from app.core.permisos import (
    CONDUCTORES,
    LICENCIAS,
    ESCRITURA,
    LECTURA,
)
from app.schemas.conductor import (
    ConductorCreate,
    ConductorUpdate,
    ConductorEstadoUpdate,
)
from app.schemas.licencia import (
    LicenciaCreate,
    LicenciaUpdate,
    LicenciaEstadoUpdate,
)


router = APIRouter(
    prefix="/conductores",
    tags=["Conductores"],
)


# ============================================================
# CONDUCTORES
# ============================================================

@router.get("")
def listar_conductores(
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CONDUCTORES, LECTURA)),
):
    resultado = db.execute(
        text("""
            SELECT
                c.id_conductor,
                c.id_usuario,
                c.dni,
                c.nombre,
                c.apellido,
                c.telefono,
                c.anios_experiencia,
                c.hora_disponibilidad_inicio,
                c.hora_disponibilidad_fin,
                c.horas_max_conduccion,
                c.horas_conduccion_acumuladas,
                c.estado,
                u.email AS usuario_email
            FROM conductores c
            INNER JOIN usuarios u
                ON u.id_usuario = c.id_usuario
            ORDER BY c.id_conductor
        """)
    ).mappings().all()

    return [dict(item) for item in resultado]


@router.get("/{id_conductor}")
def obtener_conductor(
    id_conductor: int,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CONDUCTORES, LECTURA)),
):
    resultado = db.execute(
        text("""
            SELECT
                c.id_conductor,
                c.id_usuario,
                c.dni,
                c.nombre,
                c.apellido,
                c.telefono,
                c.anios_experiencia,
                c.hora_disponibilidad_inicio,
                c.hora_disponibilidad_fin,
                c.horas_max_conduccion,
                c.horas_conduccion_acumuladas,
                c.estado,
                u.email AS usuario_email
            FROM conductores c
            INNER JOIN usuarios u
                ON u.id_usuario = c.id_usuario
            WHERE c.id_conductor = :id_conductor
        """),
        {"id_conductor": id_conductor},
    ).mappings().first()

    if not resultado:
        raise HTTPException(
            status_code=404,
            detail="Conductor no encontrado",
        )

    return dict(resultado)


@router.post("", status_code=status.HTTP_201_CREATED)
def crear_conductor(
    datos: ConductorCreate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CONDUCTORES, ESCRITURA)),
):
    # Verificar que el usuario exista
    usuario_db = db.execute(
        text("""
            SELECT id_usuario, email
            FROM usuarios
            WHERE id_usuario = :id_usuario
        """),
        {"id_usuario": datos.id_usuario},
    ).mappings().first()

    if not usuario_db:
        raise HTTPException(
            status_code=404,
            detail="El usuario indicado no existe",
        )

    # Verificar que el usuario no tenga ya un conductor asociado
    conductor_usuario = db.execute(
        text("""
            SELECT id_conductor
            FROM conductores
            WHERE id_usuario = :id_usuario
        """),
        {"id_usuario": datos.id_usuario},
    ).first()

    if conductor_usuario:
        raise HTTPException(
            status_code=409,
            detail="El usuario ya está asociado a un conductor",
        )

    # Verificar DNI
    conductor_dni = db.execute(
        text("""
            SELECT id_conductor
            FROM conductores
            WHERE dni = :dni
        """),
        {"dni": datos.dni},
    ).first()

    if conductor_dni:
        raise HTTPException(
            status_code=409,
            detail="El DNI ya está registrado",
        )

    resultado = db.execute(
        text("""
            INSERT INTO conductores (
                id_usuario,
                dni,
                nombre,
                apellido,
                telefono,
                anios_experiencia,
                hora_disponibilidad_inicio,
                hora_disponibilidad_fin,
                horas_max_conduccion,
                horas_conduccion_acumuladas,
                estado
            )
            VALUES (
                :id_usuario,
                :dni,
                :nombre,
                :apellido,
                :telefono,
                :anios_experiencia,
                :hora_disponibilidad_inicio,
                :hora_disponibilidad_fin,
                :horas_max_conduccion,
                :horas_conduccion_acumuladas,
                :estado
            )
            RETURNING id_conductor
        """),
        {
            "id_usuario": datos.id_usuario,
            "dni": datos.dni,
            "nombre": datos.nombre,
            "apellido": datos.apellido,
            "telefono": datos.telefono,
            "anios_experiencia": datos.anios_experiencia,
            "hora_disponibilidad_inicio": datos.hora_disponibilidad_inicio,
            "hora_disponibilidad_fin": datos.hora_disponibilidad_fin,
            "horas_max_conduccion": datos.horas_max_conduccion,
            "horas_conduccion_acumuladas": datos.horas_conduccion_acumuladas,
            "estado": datos.estado,
        },
    )

    id_conductor = resultado.scalar_one()

    db.commit()

    return {
        "message": "Conductor registrado correctamente",
        "id_conductor": id_conductor,
    }


@router.put("/{id_conductor}")
def actualizar_conductor(
    id_conductor: int,
    datos: ConductorUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CONDUCTORES, ESCRITURA)),
):
    conductor = db.execute(
        text("""
            SELECT id_conductor
            FROM conductores
            WHERE id_conductor = :id_conductor
        """),
        {"id_conductor": id_conductor},
    ).first()

    if not conductor:
        raise HTTPException(
            status_code=404,
            detail="Conductor no encontrado",
        )

    # Verificar usuario
    usuario_db = db.execute(
        text("""
            SELECT id_usuario
            FROM usuarios
            WHERE id_usuario = :id_usuario
        """),
        {"id_usuario": datos.id_usuario},
    ).first()

    if not usuario_db:
        raise HTTPException(
            status_code=404,
            detail="El usuario indicado no existe",
        )

    # Verificar que otro conductor no use el mismo usuario
    usuario_asignado = db.execute(
        text("""
            SELECT id_conductor
            FROM conductores
            WHERE id_usuario = :id_usuario
              AND id_conductor <> :id_conductor
        """),
        {
            "id_usuario": datos.id_usuario,
            "id_conductor": id_conductor,
        },
    ).first()

    if usuario_asignado:
        raise HTTPException(
            status_code=409,
            detail="El usuario ya está asociado a otro conductor",
        )

    # Verificar DNI
    dni_asignado = db.execute(
        text("""
            SELECT id_conductor
            FROM conductores
            WHERE dni = :dni
              AND id_conductor <> :id_conductor
        """),
        {
            "dni": datos.dni,
            "id_conductor": id_conductor,
        },
    ).first()

    if dni_asignado:
        raise HTTPException(
            status_code=409,
            detail="El DNI ya está registrado en otro conductor",
        )

    db.execute(
        text("""
            UPDATE conductores
            SET
                id_usuario = :id_usuario,
                dni = :dni,
                nombre = :nombre,
                apellido = :apellido,
                telefono = :telefono,
                anios_experiencia = :anios_experiencia,
                hora_disponibilidad_inicio = :hora_disponibilidad_inicio,
                hora_disponibilidad_fin = :hora_disponibilidad_fin,
                horas_max_conduccion = :horas_max_conduccion,
                horas_conduccion_acumuladas = :horas_conduccion_acumuladas,
                estado = :estado
            WHERE id_conductor = :id_conductor
        """),
        {
            "id_conductor": id_conductor,
            "id_usuario": datos.id_usuario,
            "dni": datos.dni,
            "nombre": datos.nombre,
            "apellido": datos.apellido,
            "telefono": datos.telefono,
            "anios_experiencia": datos.anios_experiencia,
            "hora_disponibilidad_inicio": datos.hora_disponibilidad_inicio,
            "hora_disponibilidad_fin": datos.hora_disponibilidad_fin,
            "horas_max_conduccion": datos.horas_max_conduccion,
            "horas_conduccion_acumuladas": datos.horas_conduccion_acumuladas,
            "estado": datos.estado,
        },
    )

    db.commit()

    return {
        "message": "Conductor actualizado correctamente",
    }


@router.patch("/{id_conductor}/estado")
def cambiar_estado_conductor(
    id_conductor: int,
    datos: ConductorEstadoUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CONDUCTORES, ESCRITURA)),
):
    resultado = db.execute(
        text("""
            UPDATE conductores
            SET estado = :estado
            WHERE id_conductor = :id_conductor
            RETURNING id_conductor, estado
        """),
        {
            "id_conductor": id_conductor,
            "estado": datos.estado,
        },
    ).mappings().first()

    if not resultado:
        raise HTTPException(
            status_code=404,
            detail="Conductor no encontrado",
        )

    db.commit()

    return {
        "message": "Estado actualizado correctamente",
        "id_conductor": resultado["id_conductor"],
        "estado": resultado["estado"],
    }


# ============================================================
# LICENCIAS
# ============================================================

@router.get("/{id_conductor}/licencias")
def listar_licencias(
    id_conductor: int,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(LICENCIAS, LECTURA)),
):
    conductor = db.execute(
        text("""
            SELECT id_conductor
            FROM conductores
            WHERE id_conductor = :id_conductor
        """),
        {"id_conductor": id_conductor},
    ).first()

    if not conductor:
        raise HTTPException(
            status_code=404,
            detail="Conductor no encontrado",
        )

    resultado = db.execute(
        text("""
            SELECT
                id_licencia,
                id_conductor,
                numero,
                categoria,
                fecha_emision,
                fecha_vencimiento,
                estado
            FROM licencias
            WHERE id_conductor = :id_conductor
            ORDER BY id_licencia
        """),
        {"id_conductor": id_conductor},
    ).mappings().all()

    return [dict(item) for item in resultado]


@router.post("/{id_conductor}/licencias", status_code=status.HTTP_201_CREATED)
def crear_licencia(
    id_conductor: int,
    datos: LicenciaCreate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(LICENCIAS, ESCRITURA)),
):
    if datos.id_conductor != id_conductor:
        raise HTTPException(
            status_code=400,
            detail="El id_conductor de la URL no coincide con el enviado",
        )

    conductor = db.execute(
        text("""
            SELECT id_conductor
            FROM conductores
            WHERE id_conductor = :id_conductor
        """),
        {"id_conductor": id_conductor},
    ).first()

    if not conductor:
        raise HTTPException(
            status_code=404,
            detail="Conductor no encontrado",
        )

    resultado = db.execute(
        text("""
            INSERT INTO licencias (
                id_conductor,
                numero,
                categoria,
                fecha_emision,
                fecha_vencimiento,
                estado
            )
            VALUES (
                :id_conductor,
                :numero,
                :categoria,
                :fecha_emision,
                :fecha_vencimiento,
                :estado
            )
            RETURNING id_licencia
        """),
        {
            "id_conductor": id_conductor,
            "numero": datos.numero,
            "categoria": datos.categoria,
            "fecha_emision": datos.fecha_emision,
            "fecha_vencimiento": datos.fecha_vencimiento,
            "estado": datos.estado,
        },
    )

    id_licencia = resultado.scalar_one()

    db.commit()

    return {
        "message": "Licencia registrada correctamente",
        "id_licencia": id_licencia,
    }


@router.put("/{id_conductor}/licencias/{id_licencia}")
def actualizar_licencia(
    id_conductor: int,
    id_licencia: int,
    datos: LicenciaUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(LICENCIAS, ESCRITURA)),
):
    if datos.id_conductor != id_conductor:
        raise HTTPException(
            status_code=400,
            detail="El id_conductor de la URL no coincide con el enviado",
        )

    licencia = db.execute(
        text("""
            SELECT id_licencia
            FROM licencias
            WHERE id_licencia = :id_licencia
              AND id_conductor = :id_conductor
        """),
        {
            "id_licencia": id_licencia,
            "id_conductor": id_conductor,
        },
    ).first()

    if not licencia:
        raise HTTPException(
            status_code=404,
            detail="Licencia no encontrada para este conductor",
        )

    db.execute(
        text("""
            UPDATE licencias
            SET
                numero = :numero,
                categoria = :categoria,
                fecha_emision = :fecha_emision,
                fecha_vencimiento = :fecha_vencimiento,
                estado = :estado
            WHERE id_licencia = :id_licencia
              AND id_conductor = :id_conductor
        """),
        {
            "id_licencia": id_licencia,
            "id_conductor": id_conductor,
            "numero": datos.numero,
            "categoria": datos.categoria,
            "fecha_emision": datos.fecha_emision,
            "fecha_vencimiento": datos.fecha_vencimiento,
            "estado": datos.estado,
        },
    )

    db.commit()

    return {
        "message": "Licencia actualizada correctamente",
    }


@router.patch("/{id_conductor}/licencias/{id_licencia}/estado")
def cambiar_estado_licencia(
    id_conductor: int,
    id_licencia: int,
    datos: LicenciaEstadoUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(LICENCIAS, ESCRITURA)),
):
    resultado = db.execute(
        text("""
            UPDATE licencias
            SET estado = :estado
            WHERE id_licencia = :id_licencia
              AND id_conductor = :id_conductor
            RETURNING id_licencia, estado
        """),
        {
            "id_licencia": id_licencia,
            "id_conductor": id_conductor,
            "estado": datos.estado,
        },
    ).mappings().first()

    if not resultado:
        raise HTTPException(
            status_code=404,
            detail="Licencia no encontrada para este conductor",
        )

    db.commit()

    return {
        "message": "Estado de licencia actualizado correctamente",
        "id_licencia": resultado["id_licencia"],
        "estado": resultado["estado"],
    }