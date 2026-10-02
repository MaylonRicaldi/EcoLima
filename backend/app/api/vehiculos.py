from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_permiso
from app.core.permisos import (
    VEHICULOS,
    ESCRITURA,
    LECTURA,
)
from app.schemas.vehiculo import (
    VehiculoCreate,
    VehiculoEstadoUpdate,
    VehiculoResponse,
    VehiculoUpdate,
)


router = APIRouter(
    prefix="/vehiculos",
    tags=["Vehículos"],
)


@router.get(
    "",
    response_model=list[VehiculoResponse],
)
def listar_vehiculos(
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(VEHICULOS, LECTURA)),
):
    vehiculos = db.execute(
        text("""
            SELECT
                id_vehiculo,
                id_tipo_vehiculo,
                placa,
                marca,
                modelo,
                anio_fabricacion,
                capacidad_kg,
                capacidad_m3,
                consumo_km_l,
                factor_co2_kg_km,
                tipo_combustible,
                costo_adquisicion,
                valor_actual,
                depreciacion_anual,
                costo_soat_anual,
                costo_seguro_anual,
                estado
            FROM vehiculos
            ORDER BY id_vehiculo
        """)
    ).mappings().all()

    return vehiculos


@router.get(
    "/{id_vehiculo}",
    response_model=VehiculoResponse,
)
def obtener_vehiculo(
    id_vehiculo: int,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(VEHICULOS, LECTURA)),
):
    vehiculo = db.execute(
        text("""
            SELECT
                id_vehiculo,
                id_tipo_vehiculo,
                placa,
                marca,
                modelo,
                anio_fabricacion,
                capacidad_kg,
                capacidad_m3,
                consumo_km_l,
                factor_co2_kg_km,
                tipo_combustible,
                costo_adquisicion,
                valor_actual,
                depreciacion_anual,
                costo_soat_anual,
                costo_seguro_anual,
                estado
            FROM vehiculos
            WHERE id_vehiculo = :id_vehiculo
        """),
        {
            "id_vehiculo": id_vehiculo,
        },
    ).mappings().first()

    if not vehiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehículo no encontrado",
        )

    return vehiculo


@router.post(
    "",
    response_model=VehiculoResponse,
    status_code=status.HTTP_201_CREATED,
)
def crear_vehiculo(
    datos: VehiculoCreate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(VEHICULOS, ESCRITURA)),
):
    tipo_existe = db.execute(
        text("""
            SELECT id_tipo
            FROM tipos_vehiculo
            WHERE id_tipo = :id_tipo
        """),
        {
            "id_tipo": datos.id_tipo_vehiculo,
        },
    ).scalar()

    if tipo_existe is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El tipo de vehículo no existe",
        )

    placa_existe = db.execute(
        text("""
            SELECT id_vehiculo
            FROM vehiculos
            WHERE placa = :placa
        """),
        {
            "placa": datos.placa,
        },
    ).scalar()

    if placa_existe is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La placa ya está registrada",
        )

    vehiculo_id = db.execute(
        text("""
            INSERT INTO vehiculos (
                id_tipo_vehiculo,
                placa,
                marca,
                modelo,
                anio_fabricacion,
                capacidad_kg,
                capacidad_m3,
                consumo_km_l,
                factor_co2_kg_km,
                tipo_combustible,
                costo_adquisicion,
                valor_actual,
                depreciacion_anual,
                costo_soat_anual,
                costo_seguro_anual,
                estado
            )
            VALUES (
                :id_tipo_vehiculo,
                :placa,
                :marca,
                :modelo,
                :anio_fabricacion,
                :capacidad_kg,
                :capacidad_m3,
                :consumo_km_l,
                :factor_co2_kg_km,
                :tipo_combustible,
                :costo_adquisicion,
                :valor_actual,
                :depreciacion_anual,
                :costo_soat_anual,
                :costo_seguro_anual,
                :estado
            )
            RETURNING id_vehiculo
        """),
        datos.model_dump(),
    ).scalar_one()

    db.commit()

    vehiculo = db.execute(
        text("""
            SELECT
                id_vehiculo,
                id_tipo_vehiculo,
                placa,
                marca,
                modelo,
                anio_fabricacion,
                capacidad_kg,
                capacidad_m3,
                consumo_km_l,
                factor_co2_kg_km,
                tipo_combustible,
                costo_adquisicion,
                valor_actual,
                depreciacion_anual,
                costo_soat_anual,
                costo_seguro_anual,
                estado
            FROM vehiculos
            WHERE id_vehiculo = :id_vehiculo
        """),
        {
            "id_vehiculo": vehiculo_id,
        },
    ).mappings().one()

    return vehiculo


@router.put(
    "/{id_vehiculo}",
    response_model=VehiculoResponse,
)
def actualizar_vehiculo(
    id_vehiculo: int,
    datos: VehiculoUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(VEHICULOS, ESCRITURA)),
):
    existe = db.execute(
        text("""
            SELECT id_vehiculo
            FROM vehiculos
            WHERE id_vehiculo = :id_vehiculo
        """),
        {
            "id_vehiculo": id_vehiculo,
        },
    ).scalar()

    if existe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehículo no encontrado",
        )

    tipo_existe = db.execute(
        text("""
            SELECT id_tipo
            FROM tipos_vehiculo
            WHERE id_tipo = :id_tipo
        """),
        {
            "id_tipo": datos.id_tipo_vehiculo,
        },
    ).scalar()

    if tipo_existe is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El tipo de vehículo no existe",
        )

    placa_existe = db.execute(
        text("""
            SELECT id_vehiculo
            FROM vehiculos
            WHERE placa = :placa
              AND id_vehiculo <> :id_vehiculo
        """),
        {
            "placa": datos.placa,
            "id_vehiculo": id_vehiculo,
        },
    ).scalar()

    if placa_existe is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La placa ya está registrada en otro vehículo",
        )

    db.execute(
        text("""
            UPDATE vehiculos
            SET
                id_tipo_vehiculo = :id_tipo_vehiculo,
                placa = :placa,
                marca = :marca,
                modelo = :modelo,
                anio_fabricacion = :anio_fabricacion,
                capacidad_kg = :capacidad_kg,
                capacidad_m3 = :capacidad_m3,
                consumo_km_l = :consumo_km_l,
                factor_co2_kg_km = :factor_co2_kg_km,
                tipo_combustible = :tipo_combustible,
                costo_adquisicion = :costo_adquisicion,
                valor_actual = :valor_actual,
                depreciacion_anual = :depreciacion_anual,
                costo_soat_anual = :costo_soat_anual,
                costo_seguro_anual = :costo_seguro_anual,
                estado = :estado
            WHERE id_vehiculo = :id_vehiculo
        """),
        {
            **datos.model_dump(),
            "id_vehiculo": id_vehiculo,
        },
    )

    db.commit()

    vehiculo = db.execute(
        text("""
            SELECT
                id_vehiculo,
                id_tipo_vehiculo,
                placa,
                marca,
                modelo,
                anio_fabricacion,
                capacidad_kg,
                capacidad_m3,
                consumo_km_l,
                factor_co2_kg_km,
                tipo_combustible,
                costo_adquisicion,
                valor_actual,
                depreciacion_anual,
                costo_soat_anual,
                costo_seguro_anual,
                estado
            FROM vehiculos
            WHERE id_vehiculo = :id_vehiculo
        """),
        {
            "id_vehiculo": id_vehiculo,
        },
    ).mappings().one()

    return vehiculo


@router.patch(
    "/{id_vehiculo}/estado",
    response_model=VehiculoResponse,
)
def cambiar_estado_vehiculo(
    id_vehiculo: int,
    datos: VehiculoEstadoUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(VEHICULOS, ESCRITURA)),
):
    existe = db.execute(
        text("""
            SELECT id_vehiculo
            FROM vehiculos
            WHERE id_vehiculo = :id_vehiculo
        """),
        {
            "id_vehiculo": id_vehiculo,
        },
    ).scalar()

    if existe is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vehículo no encontrado",
        )

    db.execute(
        text("""
            UPDATE vehiculos
            SET estado = :estado
            WHERE id_vehiculo = :id_vehiculo
        """),
        {
            "estado": datos.estado,
            "id_vehiculo": id_vehiculo,
        },
    )

    db.commit()

    vehiculo = db.execute(
        text("""
            SELECT
                id_vehiculo,
                id_tipo_vehiculo,
                placa,
                marca,
                modelo,
                anio_fabricacion,
                capacidad_kg,
                capacidad_m3,
                consumo_km_l,
                factor_co2_kg_km,
                tipo_combustible,
                costo_adquisicion,
                valor_actual,
                depreciacion_anual,
                costo_soat_anual,
                costo_seguro_anual,
                estado
            FROM vehiculos
            WHERE id_vehiculo = :id_vehiculo
        """),
        {
            "id_vehiculo": id_vehiculo,
        },
    ).mappings().one()

    return vehiculo