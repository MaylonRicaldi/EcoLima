"""API de tráfico, incidentes y evaluación de reoptimización (HU-08).

RN-017 dispara la reoptimización cuando:
  a) ingreso un nuevo pedido express,
  b) se cancela más del 10% de los pedidos de una ruta,
  c) un incidente reporta bloqueo de más de 15 minutos,
  d) avería vehicular.
La reoptimización debe completarse en <= 30 s (RNF-001).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_db,
    id_conductor_de,
    require_permiso,
)
from app.core.permisos import (
    ESCRITURA,
    INCIDENTES,
    LECTURA,
    TRAFICO,
)
from app.schemas.incidente import (
    IncidenteCreate,
    IncidenteEstadoUpdate,
    IncidenteResponse,
    ReoptimizacionEvaluacion,
    TraficoCreate,
    TraficoResponse,
)


trafico_router = APIRouter(
    prefix="/trafico",
    tags=["Tráfico"],
)

incidentes_router = APIRouter(
    prefix="/incidentes",
    tags=["Incidentes"],
)


# ---------------------------------------------------------------------------
# Tráfico
# ---------------------------------------------------------------------------

@trafico_router.get(
    "",
    response_model=list[TraficoResponse],
)
def listar_trafico(
    nivel: str | None = None,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(TRAFICO, LECTURA)),
):
    filas = db.execute(
        text("""
            SELECT
                t.id_trafico, t.fecha_hora, t.segmento,
                t.latitud, t.longitud, t.nivel_congestion,
                t.velocidad_kmh, t.fuente
            FROM trafico t
            WHERE (:nivel IS NULL OR t.nivel_congestion = :nivel)
            ORDER BY t.fecha_hora DESC, t.id_trafico DESC
        """),
        {"nivel": nivel},
    ).mappings().all()

    return [dict(f) for f in filas]


@trafico_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=TraficoResponse,
)
def registrar_trafico(
    datos: TraficoCreate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(TRAFICO, ESCRITURA)),
):
    """Carga manual de tráfico (RES-09: Waze/SIMAT pueden no tener cobertura)."""
    fila = db.execute(
        text("""
            INSERT INTO trafico (
                segmento, latitud, longitud,
                nivel_congestion, velocidad_kmh, fuente
            )
            VALUES (
                :segmento, :latitud, :longitud,
                :nivel, :velocidad, :fuente
            )
            RETURNING id_trafico
        """),
        {
            "segmento": datos.segmento,
            "latitud": datos.latitud,
            "longitud": datos.longitud,
            "nivel": datos.nivel_congestion,
            "velocidad": datos.velocidad_kmh,
            "fuente": datos.fuente,
        },
    ).scalar()

    db.commit()

    return dict(
        db.execute(
            text("SELECT * FROM trafico WHERE id_trafico = :id"),
            {"id": fila},
        ).mappings().first()
    )


# ---------------------------------------------------------------------------
# Incidentes
# ---------------------------------------------------------------------------

@incidentes_router.get(
    "",
    response_model=list[IncidenteResponse],
)
def listar_incidentes(
    estado: str | None = None,
    tipo: str | None = None,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(INCIDENTES, LECTURA)),
):
    filas = db.execute(
        text("""
            SELECT
                i.id_incidente, i.tipo, i.descripcion,
                i.latitud, i.longitud, i.fecha_hora,
                i.nivel, i.fuente, i.estado
            FROM incidentes i
            WHERE (:estado IS NULL OR i.estado = :estado)
              AND (:tipo   IS NULL OR i.tipo   = :tipo)
            ORDER BY i.fecha_hora DESC, i.id_incidente DESC
        """),
        {"estado": estado, "tipo": tipo},
    ).mappings().all()

    return [dict(f) for f in filas]


@incidentes_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=IncidenteResponse,
)
def registrar_incidente(
    datos: IncidenteCreate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(INCIDENTES, ESCRITURA)),
):
    """El CONDUCTOR también puede reportar incidentes (RES-10)."""
    fila = db.execute(
        text("""
            INSERT INTO incidentes (
                tipo, descripcion, latitud, longitud,
                ubicacion, nivel, fuente, estado
            )
            VALUES (
                :tipo, :descripcion, :latitud, :longitud,
                ST_SetSRID(
                    ST_MakePoint(:longitud, :latitud),
                    4326
                )::geography,
                :nivel, :fuente, 'ACTIVO'
            )
            RETURNING id_incidente
        """),
        {
            "tipo": datos.tipo,
            "descripcion": datos.descripcion,
            "latitud": datos.latitud,
            "longitud": datos.longitud,
            "nivel": datos.nivel,
            "fuente": datos.fuente or "MANUAL",
        },
    ).scalar()

    db.commit()

    return dict(
        db.execute(
            text("SELECT * FROM incidentes WHERE id_incidente = :id"),
            {"id": fila},
        ).mappings().first()
    )


@incidentes_router.patch(
    "/{id_incidente}/estado",
    response_model=IncidenteResponse,
)
def cambiar_estado_incidente(
    id_incidente: int,
    datos: IncidenteEstadoUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(INCIDENTES, ESCRITURA)),
):
    fila = db.execute(
        text("""
            UPDATE incidentes
            SET estado = :estado
            WHERE id_incidente = :id
            RETURNING id_incidente
        """),
        {"id": id_incidente, "estado": datos.estado},
    ).scalar()

    if not fila:
        raise HTTPException(
            status_code=404,
            detail="El incidente no existe",
        )

    db.commit()

    return dict(
        db.execute(
            text("SELECT * FROM incidentes WHERE id_incidente = :id"),
            {"id": id_incidente},
        ).mappings().first()
    )


# ---------------------------------------------------------------------------
# Evaluación de reoptimización (RN-017)
# ---------------------------------------------------------------------------

evaluacion_router = APIRouter(
    prefix="/rutas",
    tags=["Reoptimización"],
)


@evaluacion_router.get(
    "/{id_ruta}/evaluar-reoptimizacion",
    response_model=ReoptimizacionEvaluacion,
)
def evaluar_reoptimizacion(
    id_ruta: int,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(TRAFICO, LECTURA)),
):
    """Indica si la ruta cumple algún criterio de RN-017."""
    from app.services import calculos as C

    motivos = []

    ruta = db.execute(
        text("""
            SELECT r.id_ruta, r.estado, r.fecha
            FROM rutas r
            WHERE r.id_ruta = :id_ruta
        """),
        {"id_ruta": id_ruta},
    ).mappings().first()

    if not ruta:
        raise HTTPException(
            status_code=404,
            detail="La ruta no existe",
        )

    paradas = db.execute(
        text("""
            SELECT latitud, longitud, tipo_parada
            FROM paradas_ruta
            WHERE id_ruta = :id_ruta
        """),
        {"id_ruta": id_ruta},
    ).mappings().all()

    entregas = [p for p in paradas if p["tipo_parada"] == "ENTREGA"]

    # (c) incidente activo cerca del recorrido
    incidentes = db.execute(
        text("""
            SELECT
                id_incidente, tipo, descripcion,
                latitud, longitud, nivel
            FROM incidentes
            WHERE estado = 'ACTIVO'
        """)
    ).mappings().all()

    encontrados = []

    for inc in incidentes:
        for p in entregas:
            d = C.haversine_km(
                float(p["latitud"]), float(p["longitud"]),
                float(inc["latitud"]), float(inc["longitud"]),
            )

            if d <= 2.0:
                encontrados.append({
                    "id_incidente": inc["id_incidente"],
                    "tipo": inc["tipo"],
                    "descripcion": inc["descripcion"],
                    "nivel": inc["nivel"],
                    "distancia_km": round(d, 2),
                })
                break

    if encontrados:
        motivos.append(
            "Incidente activo a menos de 2 km del recorrido (RN-017c)"
        )

    # congestion rojo en el recorrido
    trafico = db.execute(
        text("""
            SELECT latitud, longitud, nivel_congestion, segmento
            FROM trafico
            WHERE fecha_hora = (SELECT MAX(fecha_hora) FROM trafico)
        """)
    ).mappings().all()

    congestionados = []

    for t in trafico:
        for p in entregas:
            d = C.haversine_km(
                float(p["latitud"]), float(p["longitud"]),
                float(t["latitud"]), float(t["longitud"]),
            )

            if d <= 2.0:
                congestionados.append({
                    "segmento": t["segmento"],
                    "nivel": t["nivel_congestion"],
                    "distancia_km": round(d, 2),
                })
                break

    if any(c["nivel"] == "ROJO" for c in congestionados):
        motivos.append(
            "Tramo con congestión ROJO sobre el recorrido (RN-012)"
        )

    # (b) cancelacion > 10% de los pedidos de la ruta
    total = db.execute(
        text("""
            SELECT count(*) FROM ruta_pedidos WHERE id_ruta = :id_ruta
        """),
        {"id_ruta": id_ruta},
    ).scalar() or 0

    cancelados = db.execute(
        text("""
            SELECT count(*)
            FROM ruta_pedidos rp
            INNER JOIN pedidos p
                ON p.id_pedido = rp.id_pedido
            WHERE rp.id_ruta = :id_ruta
              AND p.estado = 'CANCELADO'
        """),
        {"id_ruta": id_ruta},
    ).scalar() or 0

    if total and (cancelados / total) > 0.10:
        motivos.append(
            f"Cancelación de {cancelados}/{total} pedidos "
            "supera el 10% (RN-017b)"
        )

    # (a) pedido express pendiente sin planificar
    express_pendiente = db.execute(
        text("""
            SELECT count(*)
            FROM pedidos p
            WHERE p.prioridad = 'EXPRESS'
              AND p.estado = 'PENDIENTE'
              AND NOT EXISTS (
                  SELECT 1 FROM ruta_pedidos rp
                  WHERE rp.id_pedido = p.id_pedido
              )
        """)
    ).scalar() or 0

    if express_pendiente:
        motivos.append(
            f"{express_pendiente} pedido(s) EXPRESS sin planificar (RN-017a)"
        )

    return {
        "id_ruta": id_ruta,
        "requiere_reoptimizacion": bool(motivos),
        "motivos": motivos,
        "incidentes_en_ruta": encontrados,
        "tramos_congestionados": congestionados,
    }


@evaluacion_router.get(
    "/pendientes-reoptimizacion",
)
def rutas_pendientes_reoptimizacion(
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(TRAFICO, LECTURA)),
):
    """Rutas activas candidatas a reoptimización (RN-017)."""
    filas = db.execute(
        text("""
            SELECT
                r.id_ruta,
                r.fecha,
                r.estado,
                r.distancia_km,
                count(rp.id_pedido) AS pedidos,
                count(*) FILTER (
                    WHERE rp.estado_entrega = 'ENTREGADO'
                ) AS entregados
            FROM rutas r
            LEFT JOIN ruta_pedidos rp
                ON rp.id_ruta = r.id_ruta
            WHERE r.estado IN ('PLANIFICADA','EN_CURSO','REOPTIMIZADA')
            GROUP BY r.id_ruta
            ORDER BY r.fecha DESC, r.id_ruta DESC
        """)
    ).mappings().all()

    return [dict(f) for f in filas]