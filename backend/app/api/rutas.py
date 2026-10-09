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
    require_entrega_de_ruta,
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
    ReoptimizacionRespuesta,
    RutaEstadoUpdate,
    RutaResumen,
)
from app.services import datos_optimizacion as D
from app.services import optimizador as OPT
from app.services import persistencia_rutas as PR
from app.services import roads as R


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
            "Vehículos excluidos por la restricción vehicular "
            f"del día {dia_semana}: {', '.join(bloqueadas)}"
        )

    if not elegibles:
        raise HTTPException(
            status_code=400,
            detail=(
                "Ningún vehículo activo puede circular hoy por la "
                "restricción vehicular que le corresponde por su "
                f"placa. Excluidas: {', '.join(bloqueadas)}"
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

        # Una ruta sin conductor no es operativa: la relación
        # RUTA -> ASIGNACION -> VEHICULO + CONDUCTOR debe existir
        # siempre (HU-06). Esos pedidos vuelven a PENDIENTE.
        if ruta.conductor is None:
            for c in ruta.secuencia:
                no_planificados.append({
                    "id_pedido": c.id_pedido,
                    "motivo": (
                        "No hay conductores disponibles con licencia "
                        "vigente para asignar"
                    ),
                })
            continue

        planificados.append(ruta)

    creadas, _ = PR.persistir_optimizacion(
        db, problema, planificados, fecha,
        usuario["id_usuario"], datos.algoritmo,
        _time.perf_counter() - t0,
    )

    segundos = round(_time.perf_counter() - t0, 3)

    # Si el motor de rutas no respondió, las distancias salieron de la
    # estimación por factor de rodeo. Se dice con todas las letras para
    # que nadie tome esos kilómetros como exactos.
    if not problema._usar_calles_reales:
        advertencias.append(
            "No se pudo consultar el motor de rutas: las distancias "
            "son una estimación por factor de rodeo, no el trazado "
            "real de las calles"
        )

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
        "calles_reales": problema._usar_calles_reales,
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

    # Trazado real por calzada para dibujar la ruta siguiendo las
    # calles. Si el motor de rutas no responde, se devuelve la línea
    # recta entre paradas y `trazado_real` vale False, para que la
    # interfaz lo diga en vez de fingir que sí.
    paradas_visitadas = [
        p for p in paradas if p["tipo_parada"] != "DESCANSO"
    ]

    trazado = R.trazado_ruta([dict(p) for p in paradas_visitadas])

    resultado["trazado"] = trazado
    resultado["trazado_real"] = R.disponible()

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


@router.post("/{id_ruta}/reoptimizar")
def reoptimizar_ruta(
    id_ruta: int,
    datos: ReoptimizarRequest,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(RUTAS, ESCRITURA)),
):
    """Corrige el recorrido de una ruta existente (HU-08).

    Qué cambia y qué no:

      - cambia el ORDEN de visita de las paradas, a la luz del
        tráfico del momento, las ventanas de tiempo, los perecederos
        y el resto de factores de la consigna
      - NO cambia el vehículo
      - NO cambia el conductor
      - NO se coge ni se suelta ningún pedido

    Es decir: es la misma unidad con la misma carga, reordenada. La
    ruta tampoco se destruye ni se sustituye por otra: se actualiza
    la misma, y queda en estado REOPTIMIZADA.
    """
    t0 = _time.perf_counter()

    fila = db.execute(
        text("SELECT fecha, estado FROM rutas WHERE id_ruta = :id_ruta"),
        {"id_ruta": id_ruta},
    ).mappings().first()

    if not fila:
        raise HTTPException(
            status_code=404,
            detail="La ruta no existe",
        )

    if fila['estado'] in ('COMPLETADA', 'CANCELADA'):
        raise HTTPException(
            status_code=400,
            detail=(
                f"No se puede corregir el recorrido de una ruta "
                f"{fila['estado'].lower()}: ya está cerrada y solo "
                f"queda como registro."
            ),
        )

    fecha = fila['fecha']

    # El vehículo y el conductor que ya tiene. No se buscan otros.
    vehiculo = D.vehiculo_de_ruta(db, id_ruta)
    conductor = D.conductor_de_ruta(db, id_ruta)

    if vehiculo is None or conductor is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "La ruta todavía no tiene vehículo y conductor "
                "asignados. La reoptimización conserva los que ya "
                "tiene, así que primero hay que asignarlos."
            ),
        )

    pedidos = D.pedidos_de_ruta(db, id_ruta)

    if not pedidos:
        raise HTTPException(
            status_code=400,
            detail="La ruta no tiene pedidos que reoptimizar",
        )

    orden_anterior = [p['id_pedido'] for p in pedidos]

    # Los pedidos ya entregados o fallados no se tocan: son el
    # registro de lo que ya se hizo. Corregir el recorrido solo
    # rearrange lo que queda por entregar.
    cerrados = D.entregas_cerradas_de_ruta(db, id_ruta)

    pendientes = [
        p for p in pedidos
        if p['id_pedido'] not in cerrados
    ]

    if not pendientes:
        raise HTTPException(
            status_code=409,
            detail=(
                "Esta ruta ya no tiene pedidos por entregar: están "
                "todos entregados o fallidos. Una ruta cerrada no se "
                "vuelve a optimizar."
            ),
        )

    advertencias = []

    if cerrados:
        advertencias.append(
            f"{len(cerrados)} entrega(s) ya cerrada(s) se conservan "
            f"como registro y no se tocan"
        )

    if vehiculo['estado'] != 'ACTIVO':
        advertencias.append(
            f"El vehículo {vehiculo['placa']} está "
            f"{vehiculo['estado'].lower()}. La reoptimización no "
            f"cambia de vehículo, así que se reordena igualmente."
        )

    if not (conductor['categorias_licencia'] or []):
        advertencias.append(
            f"{conductor['nombre']} {conductor['apellido']} no tiene "
            f"licencia vigente. La reoptimización no cambia de "
            f"conductor."
        )

    problema = OPT.ProblemaVRPTW(
        pedidos=pendientes,
        vehiculos=[vehiculo],
        conductores=[conductor],
        base=D.punto_inicio_operativa(db),
        fecha=fecha,
        trafico=D.trafico_actual(db),
        incidentes=D.incidentes_activos(db),
    )

    if not problema._usar_calles_reales:
        advertencias.append(
            "No se pudo consultar el motor de rutas: el recorrido se "
            "calculó con una estimación por factor de rodeo"
        )

    vehiculo_obj = problema.vehiculos[0]
    conductor_obj = problema.conductores[0]

    orden_a_optimizar = [p['id_pedido'] for p in pendientes]

    ruta_nueva, motivo = problema.reoptimizar_secuencia(
        vehiculo_obj,
        conductor_obj,
        orden_a_optimizar,
        semilla=datos.semilla,
        iteraciones=datos.iteraciones,
    )

    if motivo:
        raise HTTPException(status_code=409, detail=motivo)

    resumen = PR.persistir_reoptimizacion(
        db, id_ruta, problema, ruta_nueva, fecha,
        entregas_cerradas=cerrados,
    )

    orden_nuevo = resumen['orden_pedidos']

    if datos.motivo:
        advertencias.append(f"Motivo registrado: {datos.motivo}")

    return ReoptimizacionRespuesta(
        id_ruta=id_ruta,
        vehiculo=vehiculo['placa'],
        id_vehiculo=vehiculo['id_vehiculo'],
        conductor=(
            f"{conductor['nombre']} {conductor['apellido']}".strip()
        ),
        id_conductor=conductor['id_conductor'],
        pedidos=orden_nuevo,
        orden_anterior=orden_anterior,
        orden_nuevo=orden_nuevo,
        orden_cambio=orden_nuevo != orden_anterior,
        distancia_km=resumen['distancia_km'],
        duracion_minutos=resumen['duracion_minutos'],
        costo_total=resumen['costo_total'],
        co2_kg=resumen['co2_kg'],
        cumplimiento_ventanas_pct=resumen['cumplimiento_ventanas_pct'],
        cambio=resumen['cambio'],
        segundos_resueltos=round(_time.perf_counter() - t0, 3),
        calles_reales=problema._usar_calles_reales,
        advertencias=advertencias,
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

def _cerrar_ruta(db, id_ruta):
    """Cierra la ruta y libera al conductor.

    Se llama cuando todos los pedidos están entregados o fallados.
    A partir de ahí la ruta es un registro histórico: no se puede
    reoptimizar ni volver a planificar.

    El conductor vuelve a DISPONIBLE y sus horas de conducción del
    día se reinician, porque ya terminó su jornada. Sin esto el
    conductor se queda marcado como en ruta para siempre y el
    sistema no le vuelve a asignar nada.
    """
    db.execute(
        text("""
            UPDATE rutas SET estado = 'COMPLETADA'
            WHERE id_ruta = :id_ruta
        """),
        {"id_ruta": id_ruta},
    )

    db.execute(
        text("""
            UPDATE asignaciones SET estado = 'COMPLETADA'
            WHERE id_ruta = :id_ruta
        """),
        {"id_ruta": id_ruta},
    )

    db.execute(
        text("""
            UPDATE conductores SET
                estado = 'DISPONIBLE',
                horas_conduccion_acumuladas = 0
            WHERE id_conductor IN (
                SELECT id_conductor FROM asignaciones
                WHERE id_ruta = :id_ruta
            )
        """),
        {"id_ruta": id_ruta},
    )

    # El vehículo no cambia de estado al terminar la ruta: uno en
    # MANTENIMIENTO sigue en mantenimiento y uno de BAJA sigue dado
    # de baja. La ruta se cerró, el vehículo simplemente queda libre
    # para la siguiente.


@router.patch(
    "/{id_ruta}/pedidos/{id_pedido}/estado"
)
def actualizar_entrega(
    id_ruta: int,
    id_pedido: int,
    datos: EntregaEstadoUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(require_permiso(RUTAS, LECTURA)),
):
    """Actualiza el estado de entrega de un pedido dentro de la ruta.

    El CONDUCTOR puede marcar sus propias entregas; require_entrega_de_ruta
    verifica que la ruta esté asignada a él. ADMIN y OPERADOR pueden
    sobre cualquier ruta.
    """
    require_entrega_de_ruta(usuario, db, id_ruta)

    actual = db.execute(
        text("""
            SELECT estado_entrega FROM ruta_pedidos
            WHERE id_ruta = :id_ruta AND id_pedido = :id_pedido
        """),
        {"id_ruta": id_ruta, "id_pedido": id_pedido},
    ).scalar()

    if actual is None:
        raise HTTPException(
            status_code=404,
            detail="El pedido no pertenece a esta ruta",
        )

    # Una entrega ya cerrada es un hecho. No se puede volver atrás:
    # deshacerla dejaría el historial de la ruta diciendo algo que ya
    # no es cierto.
    #
    # La comprobación va ANTES de escribir nada, y en su propia
    # transacción: si fallara después de haber escrito, el cambio
    # quedaría a medias.
    if (
        actual in ('ENTREGADO', 'FALLIDO')
        and datos.estado_entrega != actual
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                f"El pedido ya está {actual.lower()} y no se puede "
                f"cambiar a {datos.estado_entrega.lower()}. Una "
                f"entrega cerrada queda como registro."
            ),
        )

    # Abrir una entrega pendiente cuenta como la hora en que se
    # registra. Cerrarla conserva la que registró el conductor.
    db.execute(
        text("""
            UPDATE ruta_pedidos
            SET estado_entrega = :estado,
                hora_llegada_real = CASE
                    WHEN :estado IN ('ENTREGADO', 'FALLIDO')
                        THEN COALESCE(:hora, CURRENT_TIMESTAMP)
                    ELSE NULL
                END
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

    cerrada = db.execute(
        text("""
            SELECT COUNT(*) FROM ruta_pedidos
            WHERE id_ruta = :id_ruta
              AND estado_entrega IN ('ENTREGADO', 'FALLIDO')
        """),
        {"id_ruta": id_ruta},
    ).scalar()

    total = db.execute(
        text("SELECT COUNT(*) FROM ruta_pedidos WHERE id_ruta = :id_ruta"),
        {"id_ruta": id_ruta},
    ).scalar()

    # Cuando ya no queda nada por entregar, la ruta se cierra y el
    # conductor queda libre. Si no se hace aquí, el conductor se
    # queda marcado como en ruta para siempre y no puede volver a
    # tomar otra.
    if total and cerrada >= total:
        _cerrar_ruta(db, id_ruta)
    else:
        # Mientras quede algo, la ruta está en curso
        db.execute(
            text("""
                UPDATE rutas SET estado = 'EN_CURSO'
                WHERE id_ruta = :id_ruta
                  AND estado IN ('PLANIFICADA', 'REOPTIMIZADA')
            """),
            {"id_ruta": id_ruta},
        )

        db.execute(
            text("""
                UPDATE asignaciones SET estado = 'EN_CURSO'
                WHERE id_ruta = :id_ruta AND estado = 'ASIGNADA'
            """),
            {"id_ruta": id_ruta},
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