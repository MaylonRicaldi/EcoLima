"""API de rutas, asignaciones y optimización (HU-06).

Relación: PEDIDOS -> RUTA -> ASIGNACIÓN -> VEHÍCULO + CONDUCTOR.
"""
import time as _time
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_db,
    id_conductor_de,
    require_permiso,
)
from app.core.permisos import (
    ASIGNACIONES,
    ESCRITURA,
    LECTURA,
    RUTAS,
)
from app.schemas.ruta import (
    AsignacionCreate,
    AsignacionEstadoUpdate,
    EntregaEstadoUpdate,
    OptimizacionRespuesta,
    OptimizarRequest,
    ReoptimizarRequest,
    RutaEstadoUpdate,
    RutaResumen,
)
from app.services import datos_optimizacion as D
from app.services import optimizador as OPT
from app.services import persistencia_rutas as PR


router = APIRouter(
    prefix="/rutas",
    tags=["Rutas"],
)


COLUMNS_RUTA = """
    r.id_ruta,
    r.fecha,
    r.hora_inicio,
    r.hora_fin,
    r.distancia_km,
    r.duracion_minutos,
    r.distancia_base_km,
    r.duracion_base_minutos,
    r.combustible_litros,
    r.costo_total,
    r.co2_kg,
    r.co2_evitable_kg,
    r.cumplimiento_ventanas_pct,
    r.estado,
    r.algoritmo_utilizado
"""


@router.post(
    "/optimizar",
    response_model=OptimizacionRespuesta,
)
def optimizar_rutas(
    datos: OptimizarRequest,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(RUTAS, ESCRITURA)),
):
    """Ejecuta el optimizador sobre los pedidos pendientes (HU-06)."""
    fecha = datos.fecha or date.today()

    pedidos = D.pedidos_pendientes(db)
    vehiculos = D.flota_activa(db)
    conductores = D.conductores_disponibles(db)
    base = D.punto_inicio_operativa(db)

    advertencias = []

    if not pedidos:
        raise HTTPException(
            status_code=400,
            detail="No hay pedidos pendientes para optimizar",
        )

    if not vehiculos:
        raise HTTPException(
            status_code=400,
            detail="No hay vehículos activos disponibles",
        )

    # RN-003: sólo se planifican con vehículos elegibles hoy.
    dia_semana = fecha.isoweekday()
    prohibidos = OPT.MTC_NO_CIRCULA.get(dia_semana, set())

    elegibles = []
    bloqueadas = []

    for v in vehiculos:
        digito = v.get('placa')

        digitos = ''.join(c for c in (digito or '') if c.isdigit())
        ultimo = int(digitos[-1]) if digitos else None

        if ultimo is None or ultimo not in prohibidos:
            elegibles.append(v)
        else:
            bloqueadas.append(v['placa'])

    if bloqueadas:
        advertencias.append(
            "Vehículos excluidos por restricción vehicular MTC "
            f"del día {dia_semana} (RN-003): {', '.join(bloqueadas)}"
        )

    if not elegibles:
        raise HTTPException(
            status_code=400,
            detail=(
                "Ningún vehículo activo es elegible hoy por "
                f"restricción vehicular MTC (RN-003). "
                f"Placas excluidas: {', '.join(bloqueadas)}"
            ),
        )

    if not conductores:
        advertencias.append(
            "No hay conductores disponibles con licencia vigente."
        )

    trafico = D.trafico_actual(db)
    incidentes = D.incidentes_activos(db)

    if trafico:
        advertencias.append(
            f"Se aplicó tráfico registrado en {len(trafico)} tramos."
        )

    if incidentes:
        advertencias.append(
            f"Hay {len(incidentes)} incidentes activos registrados."
        )

    t0 = _time.perf_counter()

    problema = OPT.ProblemaVRPTW(
        pedidos, elegibles, conductores, base, fecha,
        trafico=trafico, incidentes=incidentes,
    )

    rutas = problema.optimizar(
        semilla=datos.semilla,
        iteraciones=datos.iteraciones,
    )

    rutas = problema.asignar_conductores(rutas)

    # Verificación de factibilidad antes de persistir (RN-006)
    planificados = []
    no_planificados = []

    for ruta in rutas:
        if not ruta.secuencia:
            continue

        if (
            ruta.vehiculo.carga_kg > ruta.vehiculo.capacidad_kg
            or ruta.vehiculo.carga_m3 > ruta.vehiculo.capacidad_m3
        ):
            for c in ruta.secuencia:
                no_planificados.append({
                    "id_pedido": c.id_pedido,
                    "motivo": "Excede la capacidad del vehículo (RN-006)",
                })
            continue

        planificados.append(ruta)

    creadas, _ = PR.persistir_optimizacion(
        db, problema, planificados, fecha,
        usuario["id_usuario"], datos.algoritmo,
        _time.perf_counter() - t0,
    )

    segundos = round(_time.perf_counter() - t0, 3)

    for item in creadas:
        pedidos_ids = set(item.pop("pedidos"))

        for cliente in problema.clientes:
            if cliente.id_pedido not in pedidos_ids:
                no_planificados.append({
                    "id_pedido": cliente.id_pedido,
                    "motivo": (
                        "Ningun vehiculo con capacidad suficiente "
                        "disponible (RN-006)"
                    ),
                })

    return {
        "rutas_creadas": [RutaResumen(**r) for r in creadas],
        "pedidos_planificados": sum(
            len(r.secuencia) for r in planificados
        ),
        "pedidos_no_planificados": no_planificados,
        "vehiculos_elegibles": len(elegibles),
        "conductores_disponibles": len(conductores),
        "segundos_resueltos": segundos,
        "advertencias": advertencias,
    }


@router.get(
    "",
    response_model=list[RutaResumen],
)
def listar_rutas(
    estado: str | None = None,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(RUTAS, LECTURA)),
):
    filtros = "WHERE (:estado IS NULL OR r.estado = :estado)"
    params = {"estado": estado}

    # CONDUCTOR: solo ve las rutas asignadas a su persona
    cond_id = id_conductor_de(usuario, db)

    if cond_id is not None:
        filtros += (
            " AND EXISTS ("
            "   SELECT 1 FROM asignaciones a"
            "   WHERE a.id_ruta = r.id_ruta"
            "     AND a.id_conductor = :cond_id"
            " )"
        )
        params["cond_id"] = cond_id

    filas = db.execute(
        text(f"""
            SELECT {COLUMNS_RUTA}
            FROM rutas r
            {filtros}
            ORDER BY r.fecha DESC, r.id_ruta DESC
        """),
        params,
    ).mappings().all()

    return [dict(f) for f in filas]


@router.get("/{id_ruta}")
def obtener_ruta(
    id_ruta: int,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(RUTAS, LECTURA)),
):
    """Detalle completo: paradas, pedidos, asignación e indicador."""
    cond_id = id_conductor_de(usuario, db)

    ruta = db.execute(
        text(f"""
            SELECT {COLUMNS_RUTA}
            FROM rutas r
            WHERE r.id_ruta = :id_ruta
              AND (
                :cond_id IS NULL OR EXISTS (
                    SELECT 1 FROM asignaciones a
                    WHERE a.id_ruta = r.id_ruta
                      AND a.id_conductor = :cond_id
                )
              )
        """),
        {"id_ruta": id_ruta, "cond_id": cond_id},
    ).mappings().first()

    if not ruta:
        raise HTTPException(
            status_code=404,
            detail="La ruta no existe o no tiene acceso",
        )

    paradas = db.execute(
        text("""
            SELECT
                p.id_parada,
                p.orden,
                p.latitud,
                p.longitud,
                p.hora_llegada_estimada,
                p.hora_llegada_real,
                p.tiempo_servicio,
                p.tiempo_espera,
                p.tipo_parada
            FROM paradas_ruta p
            WHERE p.id_ruta = :id_ruta
            ORDER BY p.orden
        """),
        {"id_ruta": id_ruta},
    ).mappings().all()

    pedidos = db.execute(
        text("""
            SELECT
                rp.orden_visita,
                rp.hora_llegada_estimada,
                rp.hora_llegada_real,
                rp.tiempo_espera,
                rp.penalizacion,
                rp.estado_entrega,
                pe.id_pedido,
                pe.direccion_entrega,
                pe.latitud,
                pe.longitud,
                pe.peso_kg,
                pe.volumen_m3,
                pe.prioridad,
                pe.tipo_producto,
                pe.estado AS estado_pedido,
                cl.nombre AS cliente_nombre
            FROM ruta_pedidos rp
            INNER JOIN pedidos pe
                ON pe.id_pedido = rp.id_pedido
            INNER JOIN clientes cl
                ON cl.id_cliente = pe.id_cliente
            WHERE rp.id_ruta = :id_ruta
            ORDER BY rp.orden_visita
        """),
        {"id_ruta": id_ruta},
    ).mappings().all()

    asignacion = db.execute(
        text("""
            SELECT
                a.id_asignacion,
                a.hora_salida,
                a.hora_retorno,
                a.horas_conduccion,
                a.horas_descanso,
                a.descanso_requerido,
                a.estado,
                v.id_vehiculo,
                v.placa,
                t.nombre AS tipo_vehiculo,
                co.id_conductor,
                co.nombre AS conductor_nombre,
                co.apellido AS conductor_apellido
            FROM asignaciones a
            INNER JOIN vehiculos v
                ON v.id_vehiculo = a.id_vehiculo
            INNER JOIN tipos_vehiculo t
                ON t.id_tipo = v.id_tipo_vehiculo
            INNER JOIN conductores co
                ON co.id_conductor = a.id_conductor
            WHERE a.id_ruta = :id_ruta
        """),
        {"id_ruta": id_ruta},
    ).mappings().first()

    indicador = db.execute(
        text("""
            SELECT *
            FROM indicadores_ruta
            WHERE id_ruta = :id_ruta
        """),
        {"id_ruta": id_ruta},
    ).mappings().first()

    resultado = dict(ruta)
    resultado["paradas"] = [dict(p) for p in paradas]
    resultado["pedidos"] = [dict(p) for p in pedidos]
    resultado["asignacion"] = dict(asignacion) if asignacion else None
    resultado["indicador"] = dict(indicador) if indicador else None

    return resultado


@router.patch(
    "/{id_ruta}/estado",
    response_model=RutaResumen,
)
def cambiar_estado_ruta(
    id_ruta: int,
    datos: RutaEstadoUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(RUTAS, ESCRITURA)),
):
    fila = db.execute(
        text("""
            UPDATE rutas
            SET estado = :estado
            WHERE id_ruta = :id_ruta
            RETURNING id_ruta
        """),
        {"id_ruta": id_ruta, "estado": datos.estado},
    ).scalar()

    if not fila:
        raise HTTPException(
            status_code=404,
            detail="La ruta no existe",
        )

    db.commit()

    r = db.execute(
        text(f"""
            SELECT {COLUMNS_RUTA}
            FROM rutas r
            WHERE r.id_ruta = :id_ruta
        """),
        {"id_ruta": id_ruta},
    ).mappings().first()

    return dict(r)


@router.post(
    "/{id_ruta}/reoptimizar",
    response_model=OptimizacionRespuesta,
)
def reoptimizar_ruta(
    id_ruta: int,
    datos: ReoptimizarRequest,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(RUTAS, ESCRITURA)),
):
    """Reoptimiza una ruta existente (HU-08).

    Trabaja sobre la ruta indicada: libera sus pedidos y vuelve a
    planificar junto con los demás pendientes del mismo día.
    """
    fecha = db.execute(
        text("SELECT fecha FROM rutas WHERE id_ruta = :id_ruta"),
        {"id_ruta": id_ruta},
    ).scalar()

    if fecha is None:
        raise HTTPException(
            status_code=404,
            detail="La ruta no existe",
        )

    estado = db.execute(
        text("SELECT estado FROM rutas WHERE id_ruta = :id_ruta"),
        {"id_ruta": id_ruta},
    ).scalar()

    if estado in ('COMPLETADA', 'CANCELADA'):
        raise HTTPException(
            status_code=400,
            detail=(
                f"No se puede reoptimizar una ruta {estado.lower()}"
            ),
        )

    # Liberar los pedidos de la ruta para volver a planificar
    pedidos_ids = db.execute(
        text("SELECT id_pedido FROM ruta_pedidos WHERE id_ruta = :id_ruta"),
        {"id_ruta": id_ruta},
    ).scalars().all()

    for pid in pedidos_ids:
        db.execute(
            text("UPDATE pedidos SET estado = 'PENDIENTE' WHERE id_pedido = :id"),
            {"id": pid},
        )

    db.execute(
        text("UPDATE rutas SET estado = 'REOPTIMIZADA' WHERE id_ruta = :id_ruta"),
        {"id_ruta": id_ruta},
    )

    D.eliminar_planificacion_anterior(db, id_ruta)
    db.commit()

    return optimizar_rutas(
        OptimizarRequest(
            algoritmo="SA",
            iteraciones=datos.iteraciones,
            semilla=datos.semilla,
            fecha=fecha,
        ),
        db,
        usuario,
    )


# ---------------------------------------------------------------------------
# Asignaciones: relación RUTA -> VEHÍCULO + CONDUCTOR
# ---------------------------------------------------------------------------

asignaciones_router = APIRouter(
    prefix="/asignaciones",
    tags=["Asignaciones"],
)


@asignaciones_router.get("")
def listar_asignaciones(
    estado: str | None = None,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(ASIGNACIONES, LECTURA)),
):
    cond_id = id_conductor_de(usuario, db)

    filas = db.execute(
        text("""
            SELECT
                a.id_asignacion,
                a.id_ruta,
                a.fecha_asignacion,
                a.hora_salida,
                a.hora_retorno,
                a.horas_conduccion,
                a.horas_descanso,
                a.descanso_requerido,
                a.estado,
                v.id_vehiculo,
                v.placa,
                co.id_conductor,
                co.nombre AS conductor_nombre,
                co.apellido AS conductor_apellido,
                r.fecha AS ruta_fecha,
                r.distancia_km,
                r.co2_kg
            FROM asignaciones a
            INNER JOIN vehiculos v
                ON v.id_vehiculo = a.id_vehiculo
            INNER JOIN conductores co
                ON co.id_conductor = a.id_conductor
            INNER JOIN rutas r
                ON r.id_ruta = a.id_ruta
            WHERE (:estado IS NULL OR a.estado = :estado)
              AND (:cond_id IS NULL OR a.id_conductor = :cond_id)
            ORDER BY a.fecha_asignacion DESC
        """),
        {"estado": estado, "cond_id": cond_id},
    ).mappings().all()

    return [dict(f) for f in filas]


@asignaciones_router.post("", status_code=status.HTTP_201_CREATED)
def crear_asignacion(
    datos: AsignacionCreate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(ASIGNACIONES, ESCRITURA)),
):
    existe = db.execute(
        text("SELECT id_ruta FROM rutas WHERE id_ruta = :id"),
        {"id": datos.id_ruta},
    ).scalar()

    if not existe:
        raise HTTPException(
            status_code=404,
            detail="La ruta no existe",
        )

    vehiculo = db.execute(
        text("""
            SELECT id_vehiculo FROM vehiculos
            WHERE id_vehiculo = :id AND estado = 'ACTIVO'
        """),
        {"id": datos.id_vehiculo},
    ).scalar()

    if not vehiculo:
        raise HTTPException(
            status_code=400,
            detail="El vehículo no existe o no está activo",
        )

    # RN-003
    import datetime as _dt

    dia = db.execute(
        text("SELECT fecha FROM rutas WHERE id_ruta = :id"),
        {"id": datos.id_ruta},
    ).scalar()
    dia_semana = dia.isoweekday()

    placa = db.execute(
        text("SELECT placa FROM vehiculos WHERE id_vehiculo = :id"),
        {"id": datos.id_vehiculo},
    ).scalar()
    digitos = ''.join(c for c in placa if c.isdigit())

    if digitos and int(digitos[-1]) in OPT.MTC_NO_CIRCULA.get(dia_semana, set()):
        raise HTTPException(
            status_code=400,
            detail=(
                "Vehiculo no elegible por restriccion vehicular "
                "MTC hoy (RN-003)"
            ),
        )

    conductor = db.execute(
        text("""
            SELECT c.id_conductor
            FROM conductores c
            WHERE c.id_conductor = :id
              AND EXISTS (
                SELECT 1 FROM licencias l
                WHERE l.id_conductor = c.id_conductor
                  AND l.estado = 'VIGENTE'
              )
        """),
        {"id": datos.id_conductor},
    ).scalar()

    if not conductor:
        raise HTTPException(
            status_code=400,
            detail="El conductor no existe o no tiene licencia vigente",
        )

    # id_ruta es UNIQUE en asignaciones: una ruta, una asignacion
    ya_asignada = db.execute(
        text("SELECT id_asignacion FROM asignaciones WHERE id_ruta = :id"),
        {"id": datos.id_ruta},
    ).scalar()

    if ya_asignada:
        raise HTTPException(
            status_code=400,
            detail="La ruta ya tiene una asignación registrada",
        )

    creado = db.execute(
        text("""
            INSERT INTO asignaciones (
                id_ruta, id_vehiculo, id_conductor,
                hora_salida, estado
            )
            VALUES (
                :id_ruta, :id_vehiculo, :id_conductor,
                :hora_salida, 'ASIGNADA'
            )
            RETURNING id_asignacion
        """),
        {
            "id_ruta": datos.id_ruta,
            "id_vehiculo": datos.id_vehiculo,
            "id_conductor": datos.id_conductor,
            "hora_salida": datos.hora_salida,
        },
    ).scalar()

    db.commit()

    fila = db.execute(
        text("SELECT * FROM asignaciones WHERE id_asignacion = :id"),
        {"id": creado},
    ).mappings().first()

    return dict(fila)


@asignaciones_router.patch(
    "/{id_asignacion}/estado"
)
def cambiar_estado_asignacion(
    id_asignacion: int,
    datos: AsignacionEstadoUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(ASIGNACIONES, ESCRITURA)),
):
    fila = db.execute(
        text("""
            UPDATE asignaciones
            SET estado = :estado,
                hora_retorno = CASE
                    WHEN :estado = 'COMPLETADA'
                    THEN CURRENT_TIMESTAMP
                    ELSE hora_retorno
                END
            WHERE id_asignacion = :id
            RETURNING id_asignacion
        """),
        {"id": id_asignacion, "estado": datos.estado},
    ).scalar()

    if not fila:
        raise HTTPException(
            status_code=404,
            detail="La asignación no existe",
        )

    # Al completar, el conductor vuelve a estar disponible
    if datos.estado == 'COMPLETADA':
        db.execute(
            text("""
                UPDATE conductores
                SET estado = 'DISPONIBLE'
                WHERE id_conductor = (
                    SELECT id_conductor
                    FROM asignaciones
                    WHERE id_asignacion = :id
                )
            """),
            {"id": id_asignacion},
        )

    db.commit()

    return dict(
        db.execute(
            text("SELECT * FROM asignaciones WHERE id_asignacion = :id"),
            {"id": id_asignacion},
        ).mappings().first()
    )


# ---------------------------------------------------------------------------
# Entregas de una ruta
# ---------------------------------------------------------------------------

@router.patch(
    "/{id_ruta}/pedidos/{id_pedido}/estado"
)
def actualizar_entrega(
    id_ruta: int,
    id_pedido: int,
    datos: EntregaEstadoUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(RUTAS, ESCRITURA)),
):
    """Actualiza el estado de entrega de un pedido dentro de la ruta."""
    rel = db.execute(
        text("""
            SELECT id_pedido FROM ruta_pedidos
            WHERE id_ruta = :id_ruta AND id_pedido = :id_pedido
        """),
        {"id_ruta": id_ruta, "id_pedido": id_pedido},
    ).scalar()

    if not rel:
        raise HTTPException(
            status_code=404,
            detail="El pedido no pertenece a esta ruta",
        )

    db.execute(
        text("""
            UPDATE ruta_pedidos
            SET estado_entrega = :estado,
                hora_llegada_real = COALESCE(:hora, CURRENT_TIMESTAMP)
            WHERE id_ruta = :id_ruta AND id_pedido = :id_pedido
        """),
        {
            "id_ruta": id_ruta,
            "id_pedido": id_pedido,
            "estado": datos.estado_entrega,
            "hora": datos.hora_llegada_real,
        },
    )

    # Sincroniza el estado del pedido
    nuevo_estado = {
        'ENTREGADO': 'ENTREGADO',
        'FALLIDO': 'FALLIDO',
        'REPROGRAMADO': 'PENDIENTE',
    }.get(datos.estado_entrega)

    if nuevo_estado:
        db.execute(
            text("UPDATE pedidos SET estado = :estado WHERE id_pedido = :id"),
            {"estado": nuevo_estado, "id": id_pedido},
        )

    db.commit()

    return dict(
        db.execute(
            text("""
                SELECT * FROM ruta_pedidos
                WHERE id_ruta = :id_ruta AND id_pedido = :id_pedido
            """),
            {"id_ruta": id_ruta, "id_pedido": id_pedido},
        ).mappings().first()
    )