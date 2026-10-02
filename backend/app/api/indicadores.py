"""API de indicadores, dashboard y sostenibilidad (HU-09, HU-10, HU-11).

Todas las cifras provienen de las tablas reales:
  rutas, indicadores_ruta, pedidos, vehiculos, conductores,
  asignaciones y compensacion_carbono.

No se inventan números: si no hay datos, se devuelve 0.
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_permiso
from app.core.permisos import (
    COMPENSACION,
    ESCRITURA,
    INDICADORES,
    LECTURA,
    REPORTES,
)
from app.core.parametros import KG_CO2_POR_ARBOL_ANIO
from app.services import calculos as C


router = APIRouter(
    tags=["Indicadores"],
)

sostenibilidad_router = APIRouter(
    prefix="/sostenibilidad",
    tags=["Sostenibilidad"],
)


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(INDICADORES, LECTURA)),
):
    """HU-09: indicadores agregados de la operación."""
    conteos = db.execute(
        text("""
            SELECT
                (SELECT count(*) FROM pedidos) AS pedidos,
                (SELECT count(*) FROM pedidos
                 WHERE estado = 'PENDIENTE') AS pendientes,
                (SELECT count(*) FROM pedidos
                 WHERE estado = 'ENTREGADO') AS entregados,
                (SELECT count(*) FROM pedidos
                 WHERE estado = 'CANCELADO') AS cancelados,
                (SELECT count(*) FROM vehiculos) AS vehiculos,
                (SELECT count(*) FROM vehiculos
                 WHERE estado = 'ACTIVO') AS vehiculos_activos,
                (SELECT count(*) FROM conductores) AS conductores,
                (SELECT count(*) FROM conductores
                 WHERE estado = 'DISPONIBLE') AS conductores_disponibles,
                (SELECT count(*) FROM rutas) AS rutas,
                (SELECT count(*) FROM rutas
                 WHERE estado = 'EN_CURSO') AS rutas_en_curso,
                (SELECT count(*) FROM rutas
                 WHERE estado = 'PLANIFICADA') AS rutas_planificadas,
                (SELECT count(*) FROM clientes
                 WHERE estado = 'ACTIVO') AS clientes_activos,
                (SELECT count(*) FROM incidentes
                 WHERE estado = 'ACTIVO') AS incidentes_activos
        """)
    ).mappings().first()

    operacion = db.execute(
        text("""
            SELECT
                COALESCE(SUM(distancia_km), 0) AS distancia_km,
                COALESCE(SUM(duracion_minutos), 0) AS duracion_minutos,
                COALESCE(SUM(combustible_litros), 0) AS combustible_l,
                COALESCE(SUM(costo_total), 0) AS costo_total,
                COALESCE(SUM(co2_kg), 0) AS co2_kg,
                COUNT(*) AS rutas
            FROM rutas
            WHERE estado <> 'CANCELADA'
        """)
    ).mappings().first()

    ahorro = db.execute(
        text("""
            SELECT
                COALESCE(SUM(ahorro_combustible_l), 0) AS ahorro_combustible_l,
                COALESCE(SUM(ahorro_economico), 0) AS ahorro_economico,
                COALESCE(SUM(co2_ahorrado_kg), 0) AS co2_ahorrado_kg,
                COALESCE(AVG(reduccion_co2_pct), 0) AS reduccion_co2_pct,
                COALESCE(AVG(reduccion_distancia_pct), 0)
                    AS reduccion_distancia_pct,
                COALESCE(AVG(cumplimiento_ventanas_pct), 0)
                    AS cumplimiento_ventanas_pct
            FROM indicadores_ruta
        """)
    ).mappings().first()

    # Distancia y CO2 de referencia si se planificaba todo secuencialmente
    base = db.execute(
        text("""
            SELECT
                COALESCE(SUM(distancia_base_km), 0) AS distancia_base_km,
                COALESCE(SUM(distancia_km), 0) AS distancia_optimizada_km,
                COALESCE(SUM(co2_kg + co2_evitable_kg), 0) AS co2_base_kg,
                COALESCE(SUM(co2_kg), 0) AS co2_optimizada_kg
            FROM rutas
            WHERE estado <> 'CANCELADA'
        """)
    ).mappings().first()

    co2_total = float(base["co2_optimizada_kg"])
    arboles = C.arboles_equivalentes(co2_total)

    desglose = db.execute(
        text("""
            SELECT
                estado,
                count(*) AS cantidad
            FROM pedidos
            GROUP BY estado
            ORDER BY estado
        """)
    ).mappings().all()

    combustion = db.execute(
        text("""
            SELECT
                v.tipo_combustible,
                count(*) AS vehiculos
            FROM vehiculos v
            WHERE v.tipo_combustible <> 'ELECTRICO'
            GROUP BY v.tipo_combustible
            ORDER BY v.tipo_combustible
        """)
    ).mappings().all()

    return {
        "conteos": dict(conteos),
        "operacion": {
            "distancia_km": round(float(operacion["distancia_km"]), 2),
            "duracion_minutos": round(
                float(operacion["duracion_minutos"]), 2
            ),
            "combustible_l": round(
                float(operacion["combustible_l"]), 2
            ),
            "costo_total": round(float(operacion["costo_total"]), 2),
            "co2_kg": round(co2_total, 2),
            "rutas": operacion["rutas"],
        },
        "ahorro": {
            "combustible_l": round(
                float(ahorro["ahorro_combustible_l"]), 2
            ),
            "economico": round(float(ahorro["ahorro_economico"]), 2),
            "co2_kg": round(float(ahorro["co2_ahorrado_kg"]), 2),
            "reduccion_co2_pct": round(
                float(ahorro["reduccion_co2_pct"]), 2
            ),
            "reduccion_distancia_pct": round(
                float(ahorro["reduccion_distancia_pct"]), 2
            ),
        },
        "ventanas": {
            "cumplimiento_pct": round(
                float(ahorro["cumplimiento_ventanas_pct"]), 2
            ),
        },
        "comparativo_sequencial": {
            "distancia_base_km": round(
                float(base["distancia_base_km"]), 2
            ),
            "distancia_optimizada_km": round(
                float(base["distancia_optimizada_km"]), 2
            ),
            "co2_base_kg": round(float(base["co2_base_kg"]), 2),
            "co2_optimizada_kg": round(co2_total, 2),
        },
        "sostenibilidad": {
            "kg_co2_por_arbol_anio": KG_CO2_POR_ARBOL_ANIO,
            "arboles_equivalentes": arboles,
            "mensaje": (
                f"Has emitido {round(co2_total, 2)} kg de CO2. "
                f"Equivale a plantar {arboles} arboles en el "
                "Parque Zonal Huáscar."
            ),
        },
        "pedidos_por_estado": [
            {"estado": r["estado"], "cantidad": r["cantidad"]}
            for r in desglose
        ],
        "flota_por_combustible": [
            {
                "tipo_combustible": r["tipo_combustible"],
                "vehiculos": r["vehiculos"],
            }
            for r in combustion
        ],
    }


@router.get("/indicadores")
def listar_indicadores(
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(INDICADORES, LECTURA)),
):
    filas = db.execute(
        text("""
            SELECT
                i.*,
                r.fecha,
                r.estado AS estado_ruta
            FROM indicadores_ruta i
            INNER JOIN rutas r ON r.id_ruta = i.id_ruta
            ORDER BY r.fecha DESC, i.id_ruta DESC
        """)
    ).mappings().all()

    return [dict(f) for f in filas]


# ---------------------------------------------------------------------------
# HU-11 - Plan de compensación de carbono
# ---------------------------------------------------------------------------

COMPENSACION_SCHEMA = """
    SELECT
        cc.id_compensacion,
        cc.co2_total_kg,
        cc.co2_a_compensar_kg,
        cc.factor_captura_arbol_kg,
        cc.arboles_necesarios,
        cc.proyecto_reforestacion,
        cc.ubicacion,
        cc.costo_estimado,
        cc.fecha_calculo
    FROM compensacion_carbono cc
"""


@sostenibilidad_router.get("/compensacion")
def listar_compensaciones(
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(COMPENSACION, LECTURA)),
):
    filas = db.execute(
        text(COMPENSACION_SCHEMA + " ORDER BY cc.id_compensacion DESC")
    ).mappings().all()

    return [dict(f) for f in filas]


@sostenibilidad_router.post("/compensacion")
def calcular_compensacion(
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(COMPENSACION, ESCRITURA)),
):
    """HU-11: genera el plan de compensación con las emisiones reales.

    RN-018: arboles = CO2_total_kg / 22 kg CO2 por arbol por ano.
    El factor y arboles_necesarios los calcula el DDL (columna
    generada), por lo que no se recalculan aqui.
    """
    emissions = db.execute(
        text("""
            SELECT COALESCE(SUM(co2_kg), 0) AS co2_total
            FROM rutas
            WHERE estado <> 'CANCELADA'
        """)
    ).scalar()

    co2_total = float(emissions)

    fila = db.execute(
        text("""
            INSERT INTO compensacion_carbono (
                co2_total_kg, co2_a_compensar_kg,
                factor_captura_arbol_kg,
                proyecto_reforestacion, ubicacion
            )
            VALUES (
                :co2_total, :co2_total, :factor,
                :proyecto, :ubicacion
            )
            RETURNING id_compensacion
        """),
        {
            "co2_total": co2_total,
            "factor": KG_CO2_POR_ARBOL_ANIO,
            "proyecto": "Programa Arboles para Lima - Parque Zonal Huascar",
            "ubicacion": "Parque Zonal Huascar, Lima Este",
        },
    ).scalar()

    db.commit()

    return dict(
        db.execute(
            text(COMPENSACION_SCHEMA + " WHERE cc.id_compensacion = :id"),
            {"id": fila},
        ).mappings().first()
    )


@sostenibilidad_router.get("/impacto")
def impacto_ambiental(
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(COMPENSACION, LECTURA)),
):
    """Resumen de huella de carbono con equivalencia ambiental (RN-018)."""
    datos = db.execute(
        text("""
            SELECT
                COALESCE(SUM(co2_kg), 0) AS emitido,
                COALESCE(SUM(co2_evitable_kg), 0) AS evitable
            FROM rutas
            WHERE estado <> 'CANCELADA'
        """)
    ).mappings().first()

    emitido = float(datos["emitido"])
    evitable = float(datos["evitable"])

    return {
        "co2_emitido_kg": round(emitido, 2),
        "co2_evitable_kg": round(evitable, 2),
        "arboles_para_compensar": C.arboles_equivalentes(emitido),
        "arboles_por_ahorro": C.arboles_equivalentes(evitable),
        "factor_kg_por_arbol_anio": KG_CO2_POR_ARBOL_ANIO,
        "equivalencia": (
            f"Compensar {round(emitido, 2)} kg de CO2 requiere "
            f"{C.arboles_equivalentes(emitido)} arboles en el "
            "Parque Zonal Huáscar."
        ),
    }


# ---------------------------------------------------------------------------
# HU-10 - Reportes de sostenibilidad
# ---------------------------------------------------------------------------

reportes_router = APIRouter(
    prefix="/reportes",
    tags=["Reportes"],
)


@reportes_router.get("")
def listar_reportes(
    tipo: str | None = None,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(REPORTES, LECTURA)),
):
    filas = db.execute(
        text("""
            SELECT
                rp.id_reporte,
                rp.id_ruta,
                rp.usuario_generador,
                rp.tipo,
                rp.fecha_generacion,
                rp.ruta_archivo,
                u.nombre AS usuario_nombre
            FROM reportes rp
            INNER JOIN usuarios u
                ON u.id_usuario = rp.usuario_generador
            WHERE (:tipo IS NULL OR rp.tipo = :tipo)
            ORDER BY rp.fecha_generacion DESC
        """),
        {"tipo": tipo},
    ).mappings().all()

    return [dict(f) for f in filas]


@reportes_router.post("")
def generar_reporte(
    tipo: str,
    id_ruta: int | None,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(REPORTES, ESCRITURA)),
):
    """HU-10: consolida el reporte de sostenibilidad de una ruta.

    El DDL exige tipo IN ('SOSTENIBILIDAD','TCO','COMPENSACION','AUDITORIA').
    """
    if tipo not in (
        "SOSTENIBILIDAD", "TCO", "COMPENSACION", "AUDITORIA",
    ):
        raise HTTPException(
            status_code=422,
            detail="El tipo debe ser SOSTENIBILIDAD, TCO, COMPENSACION o AUDITORIA",
        )

    if id_ruta is not None:
        existe = db.execute(
            text("SELECT id_ruta FROM rutas WHERE id_ruta = :id"),
            {"id": id_ruta},
        ).scalar()

        if not existe:
            raise HTTPException(
                status_code=404,
                detail="La ruta no existe",
            )

    # Nombre del archivo conforme al tipo de reporte
    nombre = (
        f"reporte_{tipo.lower()}_"
        f"{id_ruta if id_ruta else 'consolidado'}_"
        f"{date.today().isoformat()}.csv"
    )

    fila = db.execute(
        text("""
            INSERT INTO reportes (
                id_ruta, usuario_generador, tipo, ruta_archivo
            )
            VALUES (:id_ruta, :usuario, :tipo, :archivo)
            RETURNING id_reporte
        """),
        {
            "id_ruta": id_ruta,
            "usuario": usuario["id_usuario"],
            "tipo": tipo,
            "archivo": nombre,
        },
    ).scalar()

    db.commit()

    return dict(
        db.execute(
            text("SELECT * FROM reportes WHERE id_reporte = :id"),
            {"id": fila},
        ).mappings().first()
    )


@reportes_router.get("/sostenibilidad")
def datos_reporte_sostenibilidad(
    id_ruta: int,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(REPORTES, LECTURA)),
):
    """HU-10: datos del reporte de sostenibilidad (ISO 14083).

    Incluye huella de carbono por ruta, costo de ciclo de vida y
    cumplimiento de ventanas de tiempo.
    """
    ruta = db.execute(
        text("""
            SELECT
                r.id_ruta,
                r.fecha,
                r.distancia_km,
                r.distancia_base_km,
                r.duracion_minutos,
                r.combustible_litros,
                r.costo_combustible,
                r.costo_mantenimiento,
                r.costo_depreciacion,
                r.costo_seguro,
                r.costo_conductor,
                r.costo_total,
                r.co2_kg,
                r.co2_evitable_kg,
                r.cumplimiento_ventanas_pct,
                r.estado,
                r.algoritmo_utilizado,
                v.placa,
                v.tipo_combustible,
                v.factor_co2_kg_km,
                co.nombre AS conductor_nombre,
                co.apellido AS conductor_apellido
            FROM rutas r
            LEFT JOIN asignaciones a ON a.id_ruta = r.id_ruta
            LEFT JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
            LEFT JOIN conductores co ON co.id_conductor = a.id_conductor
            WHERE r.id_ruta = :id
        """),
        {"id": id_ruta},
    ).mappings().first()

    if not ruta:
        raise HTTPException(
            status_code=404,
            detail="La ruta no existe",
        )

    indicador = db.execute(
        text("SELECT * FROM indicadores_ruta WHERE id_ruta = :id"),
        {"id": id_ruta},
    ).mappings().first()

    resultado = dict(ruta)
    resultado["indicador"] = dict(indicador) if indicador else None
    resultado["arboles_equivalentes"] = C.arboles_equivalentes(
        float(ruta["co2_kg"] or 0)
    )
    resultado["kg_co2_por_arbol_anio"] = KG_CO2_POR_ARBOL_ANIO

    return resultado


@reportes_router.get("/consolidado")
def reporte_consolidado(
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(REPORTES, LECTURA)),
):
    """HU-10: consolidado de todas las rutas."""
    filas = db.execute(
        text("""
            SELECT
                r.id_ruta,
                r.fecha,
                r.estado,
                r.distancia_km,
                r.combustible_litros,
                r.costo_total,
                r.co2_kg,
                r.cumplimiento_ventanas_pct,
                i.co2_ahorrado_kg,
                i.reduccion_co2_pct,
                i.reduccion_distancia_pct,
                v.placa,
                co.nombre || ' ' || co.apellido AS conductor
            FROM rutas r
            LEFT JOIN indicadores_ruta i ON i.id_ruta = r.id_ruta
            LEFT JOIN asignaciones a ON a.id_ruta = r.id_ruta
            LEFT JOIN vehiculos v ON v.id_vehiculo = a.id_vehiculo
            LEFT JOIN conductores co ON co.id_conductor = a.id_conductor
            WHERE r.estado <> 'CANCELADA'
            ORDER BY r.fecha DESC, r.id_ruta DESC
        """)
    ).mappings().all()

    totales = db.execute(
        text("""
            SELECT
                COALESCE(SUM(distancia_km), 0) AS distancia,
                COALESCE(SUM(combustible_litros), 0) AS combustible,
                COALESCE(SUM(costo_total), 0) AS costo,
                COALESCE(SUM(co2_kg), 0) AS co2,
                COALESCE(SUM(co2_evitable_kg), 0) AS co2_ahorrado
            FROM rutas
            WHERE estado <> 'CANCELADA'
        """)
    ).mappings().first()

    co2_total = float(totales["co2"] or 0)

    return {
        "rutas": [dict(f) for f in filas],
        "totales": {
            "distancia_km": round(float(totales["distancia"]), 2),
            "combustible_l": round(float(totales["combustible"]), 2),
            "costo_total": round(float(totales["costo"]), 2),
            "co2_kg": round(co2_total, 2),
            "co2_ahorrado_kg": round(
                float(totales["co2_ahorrado"] or 0), 2
            ),
            "arboles_equivalentes": C.arboles_equivalentes(co2_total),
        },
    }