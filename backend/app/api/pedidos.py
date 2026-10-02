from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.core.dependencies import id_cliente_de, require_permiso
from app.core.permisos import (
    PEDIDOS,
    ESCRITURA,
    LECTURA,
)
from app.schemas.pedido import (
    PedidoCreate,
    PedidoUpdate,
    PedidoEstadoUpdate,
)

router = APIRouter(
    prefix="/pedidos",
    tags=["Pedidos"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.get("")
def listar_pedidos(
    db: Session = Depends(get_db),
    usuario_actual=Depends(require_permiso(PEDIDOS, LECTURA)),
):
    # El rol CLIENTE sólo ve los pedidos de su propia cuenta.
    cliente_id = id_cliente_de(usuario_actual, db)

    resultado = db.execute(
        text("""
            SELECT
                p.id_pedido,
                p.id_cliente,
                p.id_ventana_tiempo,
                p.direccion_entrega,
                p.referencia,
                p.latitud,
                p.longitud,
                p.peso_kg,
                p.volumen_m3,
                p.prioridad,
                p.tipo_producto,
                p.estado,
                p.fecha_registro
            FROM pedidos p
            WHERE (:id_cliente IS NULL OR p.id_cliente = :id_cliente)
            ORDER BY p.id_pedido
        """),
        {"id_cliente": cliente_id},
    )

    return [dict(row._mapping) for row in resultado]


@router.get("/{id_pedido}")
def obtener_pedido(
    id_pedido: int,
    db: Session = Depends(get_db),
    usuario_actual=Depends(require_permiso(PEDIDOS, LECTURA)),
):
    resultado = db.execute(
        text("""
            SELECT
                p.id_pedido,
                p.id_cliente,
                p.id_ventana_tiempo,
                p.direccion_entrega,
                p.referencia,
                p.latitud,
                p.longitud,
                p.peso_kg,
                p.volumen_m3,
                p.prioridad,
                p.tipo_producto,
                p.estado,
                p.fecha_registro
            FROM pedidos p
            WHERE p.id_pedido = :id_pedido
              AND (:id_cliente IS NULL OR p.id_cliente = :id_cliente)
        """),
        {
            "id_pedido": id_pedido,
            "id_cliente": id_cliente_de(usuario_actual, db),
        },
    ).mappings().first()

    if not resultado:
        raise HTTPException(
            status_code=404,
            detail="El pedido no existe",
        )

    return dict(resultado)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
)
def crear_pedido(
    datos: PedidoCreate,
    db: Session = Depends(get_db),
    usuario_actual=Depends(require_permiso(PEDIDOS, ESCRITURA)),
):
    cliente = db.execute(
        text("""
            SELECT id_cliente
            FROM clientes
            WHERE id_cliente = :id_cliente
              AND estado = 'ACTIVO'
        """),
        {
            "id_cliente": datos.id_cliente,
        },
    ).mappings().first()

    if not cliente:
        raise HTTPException(
            status_code=400,
            detail="El cliente no existe o está inactivo",
        )

    ventana = db.execute(
        text("""
            SELECT
                id_ventana,
                hora_inicio,
                hora_fin
            FROM ventanas_tiempo
            WHERE id_ventana = :id_ventana_tiempo
        """),
        {
            "id_ventana_tiempo": datos.id_ventana_tiempo,
        },
    ).mappings().first()

    if not ventana:
        raise HTTPException(
            status_code=400,
            detail="La ventana de tiempo no existe",
        )

    resultado = db.execute(
        text("""
            INSERT INTO pedidos (
                id_cliente,
                id_ventana_tiempo,
                direccion_entrega,
                referencia,
                latitud,
                longitud,
                ubicacion,
                peso_kg,
                volumen_m3,
                prioridad,
                tipo_producto,
                estado
            )
            VALUES (
                :id_cliente,
                :id_ventana_tiempo,
                :direccion_entrega,
                :referencia,
                :latitud,
                :longitud,
                ST_SetSRID(
                    ST_MakePoint(
                        :longitud,
                        :latitud
                    ),
                    4326
                ),
                :peso_kg,
                :volumen_m3,
                :prioridad,
                :tipo_producto,
                :estado
            )
            RETURNING
                id_pedido,
                id_cliente,
                id_ventana_tiempo,
                direccion_entrega,
                referencia,
                latitud,
                longitud,
                peso_kg,
                volumen_m3,
                prioridad,
                tipo_producto,
                estado,
                fecha_registro
        """),
        {
            "id_cliente": datos.id_cliente,
            "id_ventana_tiempo": datos.id_ventana_tiempo,
            "direccion_entrega": datos.direccion_entrega,
            "referencia": datos.referencia,
            "latitud": datos.latitud,
            "longitud": datos.longitud,
            "peso_kg": datos.peso_kg,
            "volumen_m3": datos.volumen_m3,
            "prioridad": datos.prioridad,
            "tipo_producto": datos.tipo_producto,
            "estado": datos.estado,
        },
    )

    db.commit()

    return dict(resultado.mappings().one())


@router.put("/{id_pedido}")
def actualizar_pedido(
    id_pedido: int,
    datos: PedidoUpdate,
    db: Session = Depends(get_db),
    usuario_actual=Depends(require_permiso(PEDIDOS, ESCRITURA)),
):
    pedido = db.execute(
        text("""
            SELECT id_pedido
            FROM pedidos
            WHERE id_pedido = :id_pedido
        """),
        {
            "id_pedido": id_pedido,
        },
    ).mappings().first()

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="El pedido no existe",
        )

    cliente = db.execute(
        text("""
            SELECT id_cliente
            FROM clientes
            WHERE id_cliente = :id_cliente
              AND estado = 'ACTIVO'
        """),
        {
            "id_cliente": datos.id_cliente,
        },
    ).mappings().first()

    if not cliente:
        raise HTTPException(
            status_code=400,
            detail="El cliente no existe o está inactivo",
        )

    ventana = db.execute(
        text("""
            SELECT id_ventana
            FROM ventanas_tiempo
            WHERE id_ventana = :id_ventana_tiempo
        """),
        {
            "id_ventana_tiempo": datos.id_ventana_tiempo,
        },
    ).mappings().first()

    if not ventana:
        raise HTTPException(
            status_code=400,
            detail="La ventana de tiempo no existe",
        )

    resultado = db.execute(
        text("""
            UPDATE pedidos
            SET
                id_cliente = :id_cliente,
                id_ventana_tiempo = :id_ventana_tiempo,
                direccion_entrega = :direccion_entrega,
                referencia = :referencia,
                latitud = :latitud,
                longitud = :longitud,
                ubicacion = ST_SetSRID(
                    ST_MakePoint(
                        :longitud,
                        :latitud
                    ),
                    4326
                ),
                peso_kg = :peso_kg,
                volumen_m3 = :volumen_m3,
                prioridad = :prioridad,
                tipo_producto = :tipo_producto,
                estado = :estado
            WHERE id_pedido = :id_pedido
            RETURNING
                id_pedido,
                id_cliente,
                id_ventana_tiempo,
                direccion_entrega,
                referencia,
                latitud,
                longitud,
                peso_kg,
                volumen_m3,
                prioridad,
                tipo_producto,
                estado,
                fecha_registro
        """),
        {
            "id_pedido": id_pedido,
            "id_cliente": datos.id_cliente,
            "id_ventana_tiempo": datos.id_ventana_tiempo,
            "direccion_entrega": datos.direccion_entrega,
            "referencia": datos.referencia,
            "latitud": datos.latitud,
            "longitud": datos.longitud,
            "peso_kg": datos.peso_kg,
            "volumen_m3": datos.volumen_m3,
            "prioridad": datos.prioridad,
            "tipo_producto": datos.tipo_producto,
            "estado": datos.estado,
        },
    )

    db.commit()

    return dict(resultado.mappings().one())


@router.patch("/{id_pedido}/estado")
def cambiar_estado_pedido(
    id_pedido: int,
    datos: PedidoEstadoUpdate,
    db: Session = Depends(get_db),
    usuario_actual=Depends(require_permiso(PEDIDOS, ESCRITURA)),
):
    resultado = db.execute(
        text("""
            UPDATE pedidos
            SET estado = :estado
            WHERE id_pedido = :id_pedido
            RETURNING
                id_pedido,
                id_cliente,
                id_ventana_tiempo,
                direccion_entrega,
                referencia,
                latitud,
                longitud,
                peso_kg,
                volumen_m3,
                prioridad,
                tipo_producto,
                estado,
                fecha_registro
        """),
        {
            "id_pedido": id_pedido,
            "estado": datos.estado,
        },
    )

    pedido = resultado.mappings().first()

    if not pedido:
        raise HTTPException(
            status_code=404,
            detail="El pedido no existe",
        )

    db.commit()

    return dict(pedido)