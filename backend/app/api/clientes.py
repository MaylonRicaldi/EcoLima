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
    VentanaTiempoCreate,
    VentanaTiempoResponse,
    VentanaTiempoUpdate,
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


COLUMNAS_VENTANA = """
    vt.id_ventana,
    vt.hora_inicio,
    vt.hora_fin,
    vt.tolerancia_minutos,
    vt.penalizacion_por_minuto,
    vt.es_ocasional,
    (
        SELECT COUNT(*)
        FROM pedidos p
        WHERE p.id_ventana_tiempo = vt.id_ventana
    ) AS pedidos_asociados
"""


# ---------------------------------------------------------------------------
# Ventanas de tiempo
#
# IMPORTANTE: estas rutas tienen un solo segmento, igual que
# "/{id_cliente}". FastAPI resuelve en orden de declaración, así que
# deben quedar ANTES de obtener_cliente o "ventanas-tiempo" se
# interpretaría como un id_cliente. Por lo mismo, la variante
# "/ventanas-tiempo/disponibles" (dos segmentos) tiene que quedar
# antes que "/ventanas-tiempo/{id_ventana}".
# ---------------------------------------------------------------------------


@router.get(
    "/ventanas-tiempo",
    response_model=list[VentanaTiempoResponse],
)
def listar_ventanas_tiempo(
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CLIENTES, LECTURA)),
):
    """Todas las ventanas configuradas, con los pedidos que ya las usan.

    Los permisos son los de CLIENTES: la ventana forma parte del
    pedido y se configura junto a él. No se inventan permisos nuevos.
    """
    filas = db.execute(
        text(f"""
            SELECT {COLUMNAS_VENTANA}
            FROM ventanas_tiempo vt
            ORDER BY vt.hora_inicio, vt.hora_fin
        """)
    ).mappings().all()

    return [dict(f) for f in filas]


@router.get("/ventanas-tiempo/disponibles")
def listar_ventanas_disponibles(
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CLIENTES, LECTURA)),
):
    """Ventanas de tiempo para el desplegable de pedidos.

    Es la misma informacion que GET /ventanas-tiempo sin el conteo de
    pedidos asociados: el formulario de pedidos solo necesita las
    horas. Se conserva porque ya la consumia el frontend.

    Solo devuelve el CATALOGO. Las ventanas marcadas como
    ocasionales se crearon para un pedido concreto y no deben
    ofrecerse para los demas: si no, el horario de una entrega
    especial acabaria siendo la opcion normal de todos los pedidos.

    IMPORTANTE: esta ruta tiene dos segmentos, igual que
    "/ventanas-tiempo/{id_ventana}". FastAPI resuelve en orden de
    declaracion, asi que debe quedar ANTES o "disponibles" se
    interpretaria como un id de ventana.
    """
    filas = db.execute(
        text("""
            SELECT
                vt.id_ventana,
                vt.hora_inicio,
                vt.hora_fin,
                vt.tolerancia_minutos,
                vt.penalizacion_por_minuto
            FROM ventanas_tiempo vt
            WHERE vt.es_ocasional = FALSE
            ORDER BY vt.hora_inicio, vt.hora_fin
        """)
    ).mappings().all()

    return [dict(f) for f in filas]


@router.post(
    "/ventanas-tiempo",
    status_code=status.HTTP_201_CREATED,
    response_model=VentanaTiempoResponse,
)
def crear_ventana_tiempo(
    datos: VentanaTiempoCreate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CLIENTES, ESCRITURA)),
):
    creado = db.execute(
        text("""
            INSERT INTO ventanas_tiempo (
                hora_inicio,
                hora_fin,
                tolerancia_minutos,
                penalizacion_por_minuto,
                es_ocasional
            )
            VALUES (
                CAST(:hora_inicio AS TIME),
                CAST(:hora_fin AS TIME),
                :tolerancia_minutos,
                CAST(:penalizacion AS DECIMAL(10,2)),
                :es_ocasional
            )
            RETURNING id_ventana
        """),
        {
            "hora_inicio": datos.hora_inicio,
            "hora_fin": datos.hora_fin,
            "tolerancia_minutos": datos.tolerancia_minutos,
            "penalizacion": datos.penalizacion_por_minuto,
            "es_ocasional": datos.es_ocasional,
        },
    ).scalar_one()

    db.commit()

    return _leer_ventana(db, creado)


@router.put(
    "/ventanas-tiempo/{id_ventana}",
    response_model=VentanaTiempoResponse,
)
def actualizar_ventana_tiempo(
    id_ventana: int,
    datos: VentanaTiempoUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CLIENTES, ESCRITURA)),
):
    if not _existe_ventana(db, id_ventana):
        raise HTTPException(
            status_code=404,
            detail="La ventana de tiempo no existe",
        )

    db.execute(
        text("""
            UPDATE ventanas_tiempo
            SET
                hora_inicio = CAST(:hora_inicio AS TIME),
                hora_fin = CAST(:hora_fin AS TIME),
                tolerancia_minutos = :tolerancia_minutos,
                penalizacion_por_minuto =
                    CAST(:penalizacion AS DECIMAL(10,2))
            WHERE id_ventana = :id_ventana
        """),
        {
            "id_ventana": id_ventana,
            "hora_inicio": datos.hora_inicio,
            "hora_fin": datos.hora_fin,
            "tolerancia_minutos": datos.tolerancia_minutos,
            "penalizacion": datos.penalizacion_por_minuto,
        },
    )

    db.commit()

    return _leer_ventana(db, id_ventana)


@router.get(
    "/ventanas-tiempo/{id_ventana}",
    response_model=VentanaTiempoResponse,
)
def obtener_ventana_tiempo(
    id_ventana: int,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CLIENTES, LECTURA)),
):
    fila = db.execute(
        text(f"""
            SELECT {COLUMNAS_VENTANA}
            FROM ventanas_tiempo vt
            WHERE vt.id_ventana = :id_ventana
        """),
        {"id_ventana": id_ventana},
    ).mappings().first()

    if not fila:
        raise HTTPException(
            status_code=404,
            detail="La ventana de tiempo no existe",
        )

    return dict(fila)


@router.delete("/ventanas-tiempo/{id_ventana}")
def eliminar_ventana_tiempo(
    id_ventana: int,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(CLIENTES, ESCRITURA)),
):
    """Borra la ventana.

    pedidos.id_ventana_tiempo es ON DELETE RESTRICT en el DDL: si hay
    pedidos usando la ventana no se borra y se informa cuántos son, en
    lugar de dejar un error de integridad genérico.
    """
    ventana = db.execute(
        text("""
            SELECT id_ventana,
                (
                    SELECT COUNT(*)
                    FROM pedidos p
                    WHERE p.id_ventana_tiempo = ventanas_tiempo.id_ventana
                ) AS pedidos_asociados
            FROM ventanas_tiempo
            WHERE id_ventana = :id_ventana
        """),
        {"id_ventana": id_ventana},
    ).mappings().first()

    if not ventana:
        raise HTTPException(
            status_code=404,
            detail="La ventana de tiempo no existe",
        )

    if ventana["pedidos_asociados"] > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"La ventana está en uso por "
                f"{ventana['pedidos_asociados']} pedido(s) y no se "
                f"puede borrar"
            ),
        )

    db.execute(
        text("""
            DELETE FROM ventanas_tiempo
            WHERE id_ventana = :id_ventana
        """),
        {"id_ventana": id_ventana},
    )

    db.commit()

    return {
        "mensaje": "Ventana de tiempo eliminada",
        "id_ventana": id_ventana,
    }


def _existe_ventana(db: Session, id_ventana: int) -> bool:
    return db.execute(
        text("""
            SELECT 1 FROM ventanas_tiempo
            WHERE id_ventana = :id_ventana
        """),
        {"id_ventana": id_ventana},
    ).first() is not None


def _leer_ventana(db: Session, id_ventana: int) -> dict:
    fila = db.execute(
        text(f"""
            SELECT {COLUMNAS_VENTANA}
            FROM ventanas_tiempo vt
            WHERE vt.id_ventana = :id_ventana
        """),
        {"id_ventana": id_ventana},
    ).mappings().first()

    return dict(fila)


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