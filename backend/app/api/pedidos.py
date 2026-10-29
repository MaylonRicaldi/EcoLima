from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.core.dependencies import (
    id_cliente_de,
    id_pedidos_de_conductor,
    require_permiso,
)
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
    # Filtro por fila según el rol:
    #  CLIENTE   -> sólo los pedidos de su propia cuenta
    #  CONDUCTOR -> sólo los pedidos de las rutas que tiene asignadas
    cliente_id = id_cliente_de(usuario_actual, db)
    pedidos_conductor = id_pedidos_de_conductor(usuario_actual, db)

    ids = None

    if pedidos_conductor is not None:
        ids = sorted(pedidos_conductor)

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
              AND (
                :es_conductor IS FALSE
                OR p.id_pedido = ANY(:ids)
              )
            ORDER BY p.id_pedido
        """),
        {
            "id_cliente": cliente_id,
            "es_conductor": ids is not None,
            "ids": ids if ids else [],
        },
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
              AND (
                :es_conductor IS FALSE
                OR p.id_pedido = ANY(:ids)
              )
        """),
        {
            "id_pedido": id_pedido,
            "id_cliente": id_cliente_de(usuario_actual, db),
            "es_conductor": (
                id_pedidos_de_conductor(usuario_actual, db)
                is not None
            ),
            "ids": (
                sorted(id_pedidos_de_conductor(usuario_actual, db) or [])
            ),
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

    # El estado tiene que ser el mismo en los dos módulos: ver
    # _revisar_estado_contra_ruta.
    en_ruta = _revisar_estado_contra_ruta(db, id_pedido, datos.estado)

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

    # Si el pedido está en una ruta y el estado nuevo es de los que
    # la ruta sabe expresar, se escribe también allí. Es el camino
    # inverso al del módulo Rutas: los dos terminan en el mismo sitio.
    if (
        en_ruta
        and en_ruta["estado_ruta"] != 'COMPLETADA'
        and datos.estado in ('ENTREGADO', 'FALLIDO')
        and en_ruta["estado_entrega"] != datos.estado
    ):
        _propagar_estado_a_ruta(db, id_pedido, en_ruta, datos.estado)

    db.commit()

    return dict(resultado.mappings().one())


def _ruta_del_pedido(db, id_pedido):
    """La ruta en la que está repartiéndose el pedido, si la hay.

    Se ignoran las rutas canceladas: un pedido que estuvo en una ruta
    cancelada vuelve a estar libre y su estado se puede cambiar sin
    consultar a nadie.
    """
    return db.execute(
        text("""
            SELECT rp.id_ruta, rp.estado_entrega, r.estado AS estado_ruta
            FROM ruta_pedidos rp
            INNER JOIN rutas r ON r.id_ruta = rp.id_ruta
            WHERE rp.id_pedido = :id_pedido
              AND r.estado <> 'CANCELADA'
            ORDER BY rp.id_ruta DESC
            LIMIT 1
        """),
        {"id_pedido": id_pedido},
    ).mappings().first()


def _revisar_estado_contra_ruta(db, id_pedido, estado):
    """Impide que el estado del pedido contradiga al de su ruta.

    Un pedido vive en dos sitios a la vez: en `pedidos`, que es lo que
    ve el módulo Pedidos, y en `ruta_pedidos`, que es lo que ve el
    conductor en su ruta. Si se escribe sólo en una de las dos, los
    módulos se contradicen: el pedido aparece entregado en un sitio y
    pendiente de reparto en el otro, y el conductor reparte un pedido
    que ya se dio por entregado.

    Las reglas:

      - Una entrega ya cerrada (ENTREGADO / FALLIDO) es un registro.
        No se cambia ni se deshace desde aquí.
      - ENTREGADO y FALLIDO se propagan a la ruta, que sí sabe
        expresar esos dos estados.
      - Cualquier otro estado sobre un pedido que una ruta activa
        sigue repartiendo se rechaza: `ruta_pedidos.estado_entrega`
        no tiene forma de decir "cancelado", así que aceptar el
        cambio dejaría los módulos en desacuerdo.

    Devuelve la fila de la ruta, o None si el pedido no está en
    ninguna. La comprobación va ANTES de escribir nada, para no dejar
    el cambio a medias si después resulta que no se puede.

    Vive en una función y no duplicado en cada endpoint a propósito:
    las dos vías de cambio de estado tienen que aplicar exactamente
    las mismas reglas, o volverían a separarse.
    """
    en_ruta = _ruta_del_pedido(db, id_pedido)

    if not en_ruta:
        return None

    if en_ruta["estado_entrega"] in ('ENTREGADO', 'FALLIDO'):
        if estado != en_ruta["estado_entrega"]:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"El pedido ya está {en_ruta['estado_entrega'].lower()} "
                    f"en la ruta {en_ruta['id_ruta']} y no se puede "
                    f"cambiar a {estado.lower()}. Una entrega cerrada "
                    f"queda como registro."
                ),
            )

        return en_ruta

    if (
        en_ruta["estado_ruta"] != 'COMPLETADA'
        and estado not in ('ENTREGADO', 'FALLIDO')
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                f"El pedido ya está asignado a la ruta "
                f"{en_ruta['id_ruta']}. No se puede pasar a "
                f"{estado.lower()} desde aquí: la ruta lo sigue "
                f"repartiendo y los dos módulos dejarían de "
                f"coincidir. Cámbielo en el módulo Rutas."
            ),
        )

    return en_ruta


def _propagar_estado_a_ruta(db, id_pedido, en_ruta, estado):
    """Escribe en `ruta_pedidos` el estado que se puso en `pedidos`.

    Sin esto, marcar un pedido como ENTREGADO desde el módulo Pedidos
    lo dejaría pendiente de reparto en la pantalla del conductor: los
    dos módulos irían en direcciones opuestas.

    La hora real se guarda como en la vía del módulo Rutas: se
    conserva la que ya tuviera si la entrega se había cerrado antes,
    porque ésa es la hora en que ocurrió de verdad.
    """
    db.execute(
        text("""
            UPDATE ruta_pedidos
            SET estado_entrega = :estado,
                hora_llegada_real = CASE
                    WHEN :estado IN ('ENTREGADO', 'FALLIDO')
                        THEN COALESCE(hora_llegada_real, CURRENT_TIMESTAMP)
                    ELSE NULL
                END
            WHERE id_ruta = :id_ruta AND id_pedido = :id_pedido
        """),
        {
            "estado": estado,
            "id_ruta": en_ruta["id_ruta"],
            "id_pedido": id_pedido,
        },
    )

    cerrada = db.execute(
        text("""
            SELECT COUNT(*) FROM ruta_pedidos
            WHERE id_ruta = :id_ruta
              AND estado_entrega IN ('ENTREGADO', 'FALLIDO')
        """),
        {"id_ruta": en_ruta["id_ruta"]},
    ).scalar()

    total = db.execute(
        text("""
            SELECT COUNT(*) FROM ruta_pedidos WHERE id_ruta = :id_ruta
        """),
        {"id_ruta": en_ruta["id_ruta"]},
    ).scalar()

    # Si ya no queda nada por entregar, la ruta se cierra y el
    # conductor queda libre. Lo mismo que hace el módulo Rutas: si las
    # dos vías cerraran distinto, un conductor podría quedar
    # bloqueado por cerrar la última entrega desde Pedidos.
    if total and cerrada >= total:
        from app.api.rutas import _cerrar_ruta

        _cerrar_ruta(db, en_ruta["id_ruta"])

    else:
        db.execute(
            text("""
                UPDATE rutas SET estado = 'EN_CURSO'
                WHERE id_ruta = :id_ruta
                  AND estado IN ('PLANIFICADA', 'REOPTIMIZADA')
            """),
            {"id_ruta": en_ruta["id_ruta"]},
        )


@router.patch("/{id_pedido}/estado")
def cambiar_estado_pedido(
    id_pedido: int,
    datos: PedidoEstadoUpdate,
    db: Session = Depends(get_db),
    usuario_actual=Depends(require_permiso(PEDIDOS, ESCRITURA)),
):
    # Mismas reglas que en actualizar_pedido: el estado del pedido no
    # puede contradecir al de su ruta. Ver _revisar_estado_contra_ruta.
    en_ruta = _revisar_estado_contra_ruta(db, id_pedido, datos.estado)

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

    # El estado nuevo se propaga a la ruta cuando la ruta sabe
    # expresarlo. Es el camino inverso al del módulo Rutas: marcar un
    # pedido como entregado en Pedidos tiene que verse igual en la
    # pantalla del conductor.
    if (
        en_ruta
        and en_ruta["estado_ruta"] != 'COMPLETADA'
        and en_ruta["estado_entrega"] != datos.estado
    ):
        _propagar_estado_a_ruta(db, id_pedido, en_ruta, datos.estado)

    db.commit()

    return dict(pedido)