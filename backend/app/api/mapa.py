"""API del local de la empresa y del mapa por conductor.

Dos cosas que comparten un router porque van juntas:

  - el local: el punto desde el que salen los envíos y al que
      vuelven los vehículos de noche. Se coloca en el mapa.

  - el mapa por conductor: cuando se mira a un conductor hay que
    ver SU ruta, no las de todos. Y cada ruta necesita su propia
    identificación, porque con varias en pantalla los colores se
    repiten y no se sabe de quién es cuál.
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.dependencies import (
    es_conductor,
    get_db,
    id_conductor_de,
    require_permiso,
)
from app.core.permisos import ESCRITURA, LECTURA, RUTAS

from app.services import datos_optimizacion as D

local_router = APIRouter(
    prefix="/local",
    tags=["Local de la empresa"],
)


# ---------------------------------------------------------------------------
# El local
# ---------------------------------------------------------------------------


class LocalUpdate(BaseModel):
    """El local se coloca en el mapa: aquí sólo llegan las
    coordenadas ya elegidas por el usuario y su dirección."""

    direccion: str
    latitud: float
    longitud: float

    @field_validator("direccion")
    @classmethod
    def validar_direccion(cls, valor):
        valor = valor.strip()

        if len(valor) < 5:
            raise ValueError("Escriba la dirección del local")

        return valor

    @field_validator("latitud")
    @classmethod
    def validar_latitud(cls, valor):
        if not -13.0 <= valor <= -11.0:
            raise ValueError("La latitud está fuera del área de Lima")

        return valor

    @field_validator("longitud")
    @classmethod
    def validar_longitud(cls, valor):
        if not -78.0 <= valor <= -76.0:
            raise ValueError("La longitud está fuera del área de Lima")

        return valor


@local_router.get("")
def obtener_local(
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(RUTAS, LECTURA)),
):
    """Dónde está el local.

    `origen` dice de dónde salió el dato:

      - 'registrado': está colocado en el mapa.
      - 'respaldo':    no hay ninguno y se usa el valor de
                       emergencia. Se avisa porque planear desde un
                       punto inventado, en silencio, es peor que
                       planear desde un punto aproximado y visible.
    """
    local = D.punto_inicio_operativa(db)

    return {
        **local,
        "hora_retorno_local": _hora_retorno_local(),
    }


def _hora_retorno_local():
    from app.core import parametros as P

    return f"{P.HORA_RETORNO_LOCAL:02d}:00"


@local_router.put("")
def guardar_local(
    datos: LocalUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(RUTAS, ESCRITURA)),
):
    """Coloca el icono del local donde el usuario lo puso en el mapa."""
    fila = D.actualizar_local(
        db, datos.direccion, datos.latitud, datos.longitud
    )

    return {
        **fila,
        "latitud": float(fila["latitud"]),
        "longitud": float(fila["longitud"]),
        "mensaje": (
            "Local actualizado. Las rutas nuevas saldrán de aquí y "
            "los vehículos volverán aquí de noche."
        ),
    }


# ---------------------------------------------------------------------------
# Mapa por conductor
# ---------------------------------------------------------------------------

mapa_router = APIRouter(
    prefix="/mapa",
    tags=["Mapa de rutas"],
)

# Colores por conductor. Se cyclea para que dos conductores no
# compartan color dentro de una misma vista, que es lo que pasaba
# antes al pintar todas las rutas con la misma paleta.
COLOR_POR_CONDUCTOR = [
    "#059669",  # verde
    "#d97706",  # ámbar
    "#7c3aed",  # violeta
    "#0891b2",  # cian
    "#be123c",  # rojo
    "#4d7c0f",  # oliva
    "#9333ea",  # morado
    "#ea580c",  # naranja
]


def color_de_conductor(indice: int) -> str:
    return COLOR_POR_CONDUCTOR[indice % len(COLOR_POR_CONDUCTOR)]


@mapa_router.get("/rutas")
def mapa_rutas(
    fecha: date | None = None,
    id_conductor: int | None = None,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(RUTAS, LECTURA)),
):
    """Rutas para dibujar en el mapa.

    Cada ruta viene con un identificador propio y su color, para que
    con varias en pantalla se sepa de quién es cuál: antes todas
    salían con la misma paleta y a los dos conductores se les
    reconocía el mismo color.

    Un CONDUCTOR ve sólo sus rutas, y no por pedirlo: el filtro lo
    pone el servidor a partir de su usuario, igual que en el resto de
    la API. Si el conductor pide el filtro de otro, se le devuelve
    un 403 en vez de leaks.
    """
    propio = id_conductor_de(usuario, db)

    if es_conductor(usuario):
        if id_conductor is not None and int(id_conductor) != propio:
            raise HTTPException(
                status_code=403,
                detail="Sólo puede consultar sus propias rutas",
            )

        id_conductor = propio

    condiciones = ["r.estado IN ('PLANIFICADA','EN_CURSO','REOPTIMIZADA')"]

    if fecha:
        condiciones.append("r.fecha = :fecha")

    if id_conductor is not None:
        condiciones.append("""
            EXISTS (
                SELECT 1 FROM asignaciones a
                WHERE a.id_ruta = r.id_ruta
                  AND a.id_conductor = :id_conductor
            )
        """)

    filas = db.execute(
        text(f"""
            SELECT
                r.id_ruta,
                r.fecha,
                r.estado,
                r.distancia_km,
                r.duracion_minutos,
                a.id_conductor,
                a.id_vehiculo,
                co.nombre AS conductor_nombre,
                co.apellido AS conductor_apellido,
                v.placa
            FROM rutas r
            LEFT JOIN asignaciones a ON a.id_ruta = r.id_ruta
            LEFT JOIN conductores co
                ON co.id_conductor = a.id_conductor
            LEFT JOIN vehiculos v
                ON v.id_vehiculo = a.id_vehiculo
            WHERE {' AND '.join(condiciones)}
            ORDER BY r.fecha DESC, r.id_ruta
        """),
        {
            "fecha": fecha,
            "id_conductor": id_conductor,
        },
    ).mappings().all()

    # El color se asigna por el orden de aparición del conductor,
    # de modo que en una misma pantalla dos conductores distintos
    # nunca salen del mismo color.
    color_por_conductor = {}

    rutas = []

    for f in filas:
        if f["id_conductor"] is not None:
            clave = f["id_conductor"]

            if clave not in color_por_conductor:
                color_por_conductor[clave] = color_de_conductor(
                    len(color_por_conductor)
                )

            color = color_por_conductor[clave]
            identificador = (
                f"R-{clave}"
                if f["id_conductor"] is not None else f"R-{f['id_ruta']}"
            )
        else:
            color = "#64748b"
            identificador = f"R-{f['id_ruta']}"

        # La secuencia de paradas es lo que se dibuja. Se entrega
        # como puntos listos para pintar: el frontend no tiene que
        # reconstruirlos.
        paradas = db.execute(
            text("""
                SELECT orden, latitud, longitud, tipo_parada
                FROM paradas_ruta
                WHERE id_ruta = :id
                ORDER BY orden
            """),
            {"id": f["id_ruta"]},
        ).mappings().all()

        pedidos = db.execute(
            text("""
                SELECT rp.orden_visita, rp.id_pedido,
                       rp.estado_entrega, p.latitud, p.longitud,
                       p.direccion_entrega
                FROM ruta_pedidos rp
                INNER JOIN pedidos p
                    ON p.id_pedido = rp.id_pedido
                WHERE rp.id_ruta = :id
                ORDER BY rp.orden_visita
            """),
            {"id": f["id_ruta"]},
        ).mappings().all()

        rutas.append({
            "id_ruta": f["id_ruta"],
            "identificador": identificador,
            "color": color,
            "fecha": f["fecha"],
            "estado": f["estado"],
            "distancia_km": float(f["distancia_km"] or 0),
            "duracion_minutos": float(f["duracion_minutos"] or 0),
            "id_conductor": f["id_conductor"],
            "id_vehiculo": f["id_vehiculo"],
            "conductor": (
                f"{f['conductor_nombre']} {f['conductor_apellido']}".strip()
                if f["conductor_nombre"] else None
            ),
            "placa": f["placa"],
            "paradas": [dict(p) for p in paradas],
            "pedidos": [dict(p) for p in pedidos],
        })

    local = D.punto_inicio_operativa(db)

    return {
        "rutas": rutas,
        "local": local,
        "total": len(rutas),
        "solo_conductor": id_conductor is not None,
    }