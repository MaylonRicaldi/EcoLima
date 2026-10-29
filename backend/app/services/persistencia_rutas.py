"""Persistencia del resultado del optimizador (HU-06).

Relación fundamental del proyecto:

    PEDIDOS
       ↓
    RUTA            (ruta_pedidos)
       ↓
    ASIGNACIÓN      (asignaciones)
       ↓
    VEHÍCULO + CONDUCTOR

No existe relación directa PEDIDO -> CONDUCTOR ni PEDIDO -> VEHÍCULO.
"""
import json
from datetime import date, datetime, time, timedelta

from sqlalchemy import text

from app.core import parametros as P
from app.services import calculos as C
from app.services import datos_optimizacion as D
from app.services import optimizador as OPT


def _hora_absoluta_a_timestamp(minutos, fecha):
    """Convierte minutos desde medianoche en un TIMESTAMP del día dado."""
    base = datetime.combine(fecha, time(0, 0))

    return base + timedelta(minutes=int(minutos))


def persistir_optimizacion(
    db, problema, rutas, fecha, usuario_id, algoritmo, segundos,
):
    """Guarda rutas, paradas, asignaciones, indicadores y estados.

    Devuelve un resumen con los identificadores creados.
    """
    # La ruta secuencial sirve de referencia para el ahorro (HU-09/HU-10)
    distancia_base = _distancia_secuencial(problema)

    base_indicadores = {
        'distancia_base_km': distancia_base,
        'duracion_base_minutos': _duracion_secuencial(problema),
        'co2_base_kg': round(
            sum(
                C.calcular_co2(distancia_base, v.factor_co2_kg_km)
                for v in problema.vehiculos
            ),
            P.REDONDEO,
        ),
    }

    creadas = []
    advertencias = []

    for ruta in rutas:
        if not ruta.secuencia:
            continue

        id_ruta = db.execute(
            text("""
                INSERT INTO rutas (
                    fecha, hora_inicio, hora_fin,
                    distancia_km, duracion_minutos,
                    distancia_base_km, duracion_base_minutos,
                    combustible_litros, costo_combustible,
                    costo_mantenimiento, costo_conductor,
                    costo_depreciacion, costo_seguro, costo_total,
                    co2_kg, co2_evitable_kg,
                    cumplimiento_ventanas_pct, estado,
                    algoritmo_utilizado
                )
                VALUES (
                    :fecha, :hora_inicio, :hora_fin,
                    :distancia_km, :duracion_minutos,
                    :distancia_base_km, :duracion_base_minutos,
                    :combustible_litros, :costo_combustible,
                    :costo_mantenimiento, :costo_conductor,
                    :costo_depreciacion, :costo_seguro, :costo_total,
                    :co2_kg, :co2_evitable_kg,
                    :cumplimiento, :estado,
                    :algoritmo
                )
                RETURNING id_ruta
            """),
            {
                "fecha": fecha,
                "hora_inicio": _hora_de_ruta(ruta, fecha, True),
                "hora_fin": _hora_de_ruta(ruta, fecha, False),
                "distancia_km": ruta.distancia_km,
                "duracion_minutos": ruta.minutos,
                "distancia_base_km": round(
                    base_indicadores['distancia_base_km'], P.REDONDEO
                ),
                "duracion_base_minutos": round(
                    base_indicadores['duracion_base_minutos'], P.REDONDEO
                ),
                "combustible_litros": _combustible(ruta),
                "costo_combustible": _tco(ruta)['costo_combustible'],
                "costo_mantenimiento": _tco(ruta)['costo_mantenimiento'],
                "costo_conductor": _tco(ruta)['costo_conductor'],
                "costo_depreciacion": _tco(ruta)['costo_depreciacion'],
                "costo_seguro": _tco(ruta)['costo_seguro'],
                "costo_total": ruta.costo_total,
                "co2_kg": ruta.co2_kg,
                "co2_evitable_kg": round(
                    max(
                        0.0,
                        base_indicadores['co2_base_kg'] - ruta.co2_kg,
                    ),
                    P.REDONDEO,
                ),
                "cumplimiento": ruta.cumplimiento_pct,
                "estado": 'PLANIFICADA',
                "algoritmo": algoritmo,
            },
        ).scalar()

        # ---- paradas (ruta + orden + tipo) ----
        orden = 0

        # Las horas las pone el optimizador, no esta función.
        #
        # Antes el recorrido se iba reconstruyendo parada a parada con
        # la velocidad normal y sin tráfico, y con eso se escribían
        # las horas estimadas. El resultado era una línea de tiempo
        # distinta de la que el optimizador había usado para elegir el
        # orden, y por eso una misma parada podía aparecer con horas
        # diferentes en paradas_ruta y en ruta_pedidos, o con una
        # penalización que no se correspondía con la hora de su
        # propia fila.
        #
        # Pide las horas y usa las que venga: son las mismas con las
        # que el optimizador costeó y ordenó.
        problema.evaluar_ruta(ruta, guardar_horas=True)

        # Inicio
        origen = ruta.conductor
        # El punto de partida guardado es el que el optimizador usó de
        # verdad: el local si es el primer reparto del día, o donde
        # esté el conductor. Leer origen.latitud a pelo pondría en
        # el mapa un punto por el que el vehículo nunca pasó.
        if origen is not None and getattr(
            origen, 'sale_del_local', False
        ):
            lat_i = problema.base['latitud']
            lon_i = problema.base['longitud']
        elif origen is not None:
            lat_i = origen.latitud
            lon_i = origen.longitud
        else:
            lat_i = problema.base['latitud']
            lon_i = problema.base['longitud']

        orden += 1
        db.execute(
            text("""
                INSERT INTO paradas_ruta (
                    id_ruta, orden, latitud, longitud,
                    hora_llegada_estimada, tiempo_servicio,
                    tiempo_espera, tipo_parada
                )
                VALUES (
                    :id_ruta, :orden, :lat, :lon,
                    :hora, 0, 0, 'INICIO'
                )
            """),
            {
                "id_ruta": id_ruta,
                "orden": orden,
                "lat": lat_i,
                "lon": lon_i,
                "hora": _hora_de_ruta(ruta, fecha, True),
            },
        )

        minuto = _minuto_inicio(ruta, problema)

        for pos, cliente in enumerate(ruta.secuencia):
            if pos in ruta.posiciones_descanso:
                orden += 1
                db.execute(
                    text("""
                        INSERT INTO paradas_ruta (
                            id_ruta, orden, latitud, longitud,
                            hora_llegada_estimada,
                            tiempo_servicio, tiempo_espera, tipo_parada
                        )
                        VALUES (
                            :id_ruta, :orden, :lat, :lon,
                            :hora, 0, :descanso, 'DESCANSO'
                        )
                    """),
                    {
                        "id_ruta": id_ruta,
                        "orden": orden,
                        "lat": lat_i,
                        "lon": lon_i,
                        "hora": _hora_absoluta_a_timestamp(
                            cliente.hora_llegada
                            - int(C.minutos_de_servicio()),
                            fecha,
                        ),
                        "descanso": int(P.DESCANSO_OBLIGATORIO_HORAS * 60),
                    },
                )

            orden += 1

            # `hora_llegada` es el instante en que termina el servicio.
            # La llegada es ese mismo momento menos lo que se estuvo
            # parado: por eso se resta el tiempo de servicio.
            hora_llegada = cliente.hora_llegada - int(
                C.minutos_de_servicio()
            )

            db.execute(
                text("""
                    INSERT INTO paradas_ruta (
                        id_ruta, orden, latitud, longitud,
                        hora_llegada_estimada,
                        tiempo_servicio, tiempo_espera, tipo_parada
                    )
                    VALUES (
                        :id_ruta, :orden, :lat, :lon,
                        :hora, :servicio, :espera, 'ENTREGA'
                    )
                """),
                {
                    "id_ruta": id_ruta,
                    "orden": orden,
                    "lat": cliente.latitud,
                    "lon": cliente.longitud,
                    "hora": _hora_absoluta_a_timestamp(
                        hora_llegada, fecha
                    ),
                    "servicio": int(C.minutos_de_servicio()),
                    "espera": int(cliente.tiempo_espera),
                },
            )

            # ruta_pedidos
            db.execute(
                text("""
                    INSERT INTO ruta_pedidos (
                        id_ruta, id_pedido, orden_visita,
                        hora_llegada_estimada, tiempo_espera,
                        penalizacion, estado_entrega
                    )
                    VALUES (
                        :id_ruta, :id_pedido, :orden,
                        :hora, :espera, :penalizacion, 'PENDIENTE'
                    )
                """),
                {
                    "id_ruta": id_ruta,
                    "id_pedido": cliente.id_pedido,
                    "orden": orden,
                    "hora": _hora_absoluta_a_timestamp(
                        hora_llegada, fecha
                    ),
                    "espera": int(cliente.tiempo_espera),
                    "penalizacion": cliente.penalizacion,
                },
            )

            minuto = cliente.hora_llegada

            # el pedido pasa a ASIGNADO
            db.execute(
                text("""
                    UPDATE pedidos
                    SET estado = 'ASIGNADO'
                    WHERE id_pedido = :id_pedido
                """),
                {"id_pedido": cliente.id_pedido},
            )

        # Fin
        ultimo = ruta.secuencia[-1]
        orden += 1
        db.execute(
            text("""
                INSERT INTO paradas_ruta (
                    id_ruta, orden, latitud, longitud,
                    hora_llegada_estimada, tiempo_servicio,
                    tiempo_espera, tipo_parada
                )
                VALUES (
                    :id_ruta, :orden, :lat, :lon,
                    :hora, 0, 0, 'FIN'
                )
            """),
            {
                "id_ruta": id_ruta,
                "orden": orden,
                "lat": lat_i,
                "lon": lon_i,
                "hora": _hora_de_ruta(ruta, fecha, False),
            },
        )

        # ---- asignación (vehículo + conductor) ----
        if ruta.conductor is not None:
            db.execute(
                text("""
                    INSERT INTO asignaciones (
                        id_ruta, id_vehiculo, id_conductor,
                        horas_conduccion, horas_descanso,
                        descanso_requerido, estado
                    )
                    VALUES (
                        :id_ruta, :id_vehiculo, :id_conductor,
                        :horas, 0, :requiere, 'ASIGNADA'
                    )
                """),
                {
                    "id_ruta": id_ruta,
                    "id_vehiculo": ruta.vehiculo.id_vehiculo,
                    "id_conductor": ruta.conductor.id_conductor,
                    "horas": round(ruta.minutos / 60.0, 2),
                    "requiere": ruta.requiere_descanso,
                },
            )

            db.execute(
                text("""
                    UPDATE conductores
                    SET estado = 'EN_RUTA',
                        horas_conduccion_acumuladas =
                            horas_conduccion_acumuladas + :horas
                    WHERE id_conductor = :id_conductor
                """),
                {
                    "id_conductor": ruta.conductor.id_conductor,
                    "horas": round(ruta.minutos / 60.0, 2),
                },
            )

        # ---- indicadores por ruta (tabla indicadores_ruta) ----
        _persistir_indicadores(
            db, id_ruta, ruta, base_indicadores
        )

        creadas.append({
            "id_ruta": id_ruta,
            "distancia_km": ruta.distancia_km,
            "duracion_minutos": ruta.minutos,
            "co2_kg": ruta.co2_kg,
            "costo_total": ruta.costo_total,
            "cumplimiento_ventanas_pct": ruta.cumplimiento_pct,
            "estado": 'PLANIFICADA',
            "algoritmo_utilizado": algoritmo,
            "fecha": fecha,
            "pedidos": [c.id_pedido for c in ruta.secuencia],
        })

    db.commit()

    return creadas, advertencias


def persistir_reoptimizacion(
    db, id_ruta, problema, ruta, fecha, entregas_cerradas=None,
):
    """Reescribe el recorrido de una ruta conservando su unidad.

    A diferencia de persistir_optimizacion(), aquí no se crea una
    ruta nueva ni se toca la tabla asignaciones: el vehículo y el
    conductor que ya tenía la ruta siguen siendo los mismos. Solo se
    reemplazan las paradas, el orden de visita de los pedidos y los
    indicadores, porque eso es lo único que la reoptimización cambia.

    `entregas_cerradas` son los pedidos que ya se entregaron o
    fallaron: quedan fuera del recorrido nuevo y no se tocan. Sus
    paradas conservan el orden que tenían, para que el registro de
    lo que ya se hizo no cambie al corregir lo que falta.

    Devuelve el resumen con los valores nuevos.
    """
    entregas_cerradas = entregas_cerradas or {}

    # Las horas las pone el optimizador, igual que en la
    # planificación inicial. Antes esta función las recalculaba por su
    # cuenta, a velocidad normal y sin tráfico, y por eso lo que se
    # guardaba no cuadraba con lo que el optimizador había usado para
    # decidir el orden: una fila podía decir a la vez "llegaste a las
    # 08:29" y "te pasaste 7 minutos de la ventana".
    #
    # Se reevalúa la ruta tal cual está, sin reordenarla: sólo para
    # que cada parada Guarde la hora con la que se costeó.
    problema.evaluar_ruta(ruta, guardar_horas=True)

    distancia_base = _distancia_secuencial(problema)

    base_indicadores = {
        'distancia_base_km': distancia_base,
        'duracion_base_minutos': _duracion_secuencial(problema),
        'co2_base_kg': round(
            C.calcular_co2(distancia_base, ruta.vehiculo.factor_co2_kg_km),
            P.REDONDEO,
        ),
    }

    # El recorrido anterior se guarda para poder mostrar cuánto se
    # mejoró y para no perder la trazabilidad (RN-024).
    anterior = db.execute(
        text("""
            SELECT distancia_km, duracion_minutos, costo_total, co2_kg
            FROM rutas WHERE id_ruta = :id_ruta
        """),
        {"id_ruta": id_ruta},
    ).mappings().first()

    # Solo se borra el recorrido. La asignación no se toca.
    db.execute(
        text("DELETE FROM paradas_ruta WHERE id_ruta = :id_ruta"),
        {"id_ruta": id_ruta},
    )

    db.execute(
        text("DELETE FROM ruta_pedidos WHERE id_ruta = :id_ruta"),
        {"id_ruta": id_ruta},
    )

    db.execute(
        text("DELETE FROM indicadores_ruta WHERE id_ruta = :id_ruta"),
        {"id_ruta": id_ruta},
    )

    origen = ruta.conductor
    # El punto de partida guardado es el que el optimizador usó de
    # verdad: el local si es el primer reparto del día, o donde
    # esté el conductor. Leer origen.latitud a pelo pondría en el
    # mapa un punto por el que el vehículo nunca pasó.
    if origen is not None and getattr(
        origen, 'sale_del_local', False
    ):
        lat_i = problema.base['latitud']
        lon_i = problema.base['longitud']
    elif origen is not None:
        lat_i = origen.latitud
        lon_i = origen.longitud
    else:
        lat_i = problema.base['latitud']
        lon_i = problema.base['longitud']

    orden = 0

    # ---- parada de inicio ----
    orden += 1

    db.execute(
        text("""
            INSERT INTO paradas_ruta (
                id_ruta, orden, latitud, longitud,
                hora_llegada_estimada, tiempo_servicio,
                tiempo_espera, tipo_parada
            )
            VALUES (
                :id_ruta, :orden, :lat, :lon, :hora, 0, 0, 'INICIO'
            )
        """),
        {
            "id_ruta": id_ruta,
            "orden": orden,
            "lat": lat_i,
            "lon": lon_i,
            "hora": _hora_de_ruta(ruta, fecha, True),
        },
    )

    minuto = _minuto_inicio(ruta, problema)

    # Las entregas ya cerradas conservan su sitio en el recorrido.
    # No se recalculan ni se reordenan: son el registro de lo que ya
    # se hizo, y corregir el recorrido de lo que falta no debe
    # reescribir lo que ya ocurrió.
    for id_pedido, datos in sorted(
        entregas_cerradas.items(),
        key=lambda kv: kv[1].get('orden_visita') or 0,
    ):
        orden += 1

        db.execute(
            text("""
                INSERT INTO paradas_ruta (
                    id_ruta, orden, latitud, longitud,
                    hora_llegada_estimada, tiempo_servicio,
                    tiempo_espera, tipo_parada
                )
                VALUES (
                    :id_ruta, :orden, :lat, :lon,
                    :hora, :servicio, 0, :tipo
                )
            """),
            {
                "id_ruta": id_ruta,
                "orden": orden,
                "lat": datos['latitud'],
                "lon": datos['longitud'],
                # La hora real que registró el conductor, no una
                # estimación: este tramo ya ocurrió.
                "hora": datos.get('hora_llegada_real')
                or _hora_absoluta_a_timestamp(minuto, fecha),
                "servicio": int(C.minutos_de_servicio()),
                "tipo": datos.get('tipo_parada') or 'ENTREGA',
            },
        )

        db.execute(
            text("""
                INSERT INTO ruta_pedidos (
                    id_ruta, id_pedido, orden_visita,
                    hora_llegada_estimada, hora_llegada_real,
                    tiempo_espera, penalizacion, estado_entrega
                )
                VALUES (
                    :id_ruta, :id_pedido, :orden,
                    :hora, :hora_real, 0, 0, :estado
                )
            """),
            {
                "id_ruta": id_ruta,
                "id_pedido": id_pedido,
                "orden": orden,
                "hora": datos.get('hora_llegada_real')
                or _hora_absoluta_a_timestamp(minuto, fecha),
                "hora_real": datos.get('hora_llegada_real'),
                "estado": datos['estado_entrega'],
            },
        )

    for pos, cliente in enumerate(ruta.secuencia):
        if pos in ruta.posiciones_descanso:
            orden += 1

            db.execute(
                text("""
                    INSERT INTO paradas_ruta (
                        id_ruta, orden, latitud, longitud,
                        hora_llegada_estimada,
                        tiempo_servicio, tiempo_espera, tipo_parada
                    )
                    VALUES (
                        :id_ruta, :orden, :lat, :lon,
                        :hora, 0, :descanso, 'DESCANSO'
                    )
                """),
                {
                    "id_ruta": id_ruta,
                    "orden": orden,
                    "lat": lat_i,
                    "lon": lon_i,
                    "hora": _hora_absoluta_a_timestamp(
                        cliente.hora_llegada - int(C.minutos_de_servicio()),
                        fecha,
                    ),
                    "descanso": int(P.DESCANSO_OBLIGATORIO_HORAS * 60),
                },
            )

        orden += 1

        # `hora_llegada` es el instante en que termina el servicio; la
        # llegada es ese momento menos el tiempo de servicio. Es la
        # misma cuenta que en la planificación inicial, y por las
        # mismas razones: la hora la puso el optimizador, no un
        # segundo cálculo hecho aquí.
        hora_llegada = cliente.hora_llegada - int(C.minutos_de_servicio())

        db.execute(
            text("""
                INSERT INTO paradas_ruta (
                    id_ruta, orden, latitud, longitud,
                    hora_llegada_estimada,
                    tiempo_servicio, tiempo_espera, tipo_parada
                )
                VALUES (
                    :id_ruta, :orden, :lat, :lon,
                    :hora, :servicio, :espera, 'ENTREGA'
                )
            """),
            {
                "id_ruta": id_ruta,
                "orden": orden,
                "lat": cliente.latitud,
                "lon": cliente.longitud,
                "hora": _hora_absoluta_a_timestamp(hora_llegada, fecha),
                "servicio": int(C.minutos_de_servicio()),
                "espera": int(cliente.tiempo_espera),
            },
        )

        db.execute(
            text("""
                INSERT INTO ruta_pedidos (
                    id_ruta, id_pedido, orden_visita,
                    hora_llegada_estimada, tiempo_espera,
                    penalizacion, estado_entrega
                )
                VALUES (
                    :id_ruta, :id_pedido, :orden,
                    :hora, :espera, :penalizacion, 'PENDIENTE'
                )
            """),
            {
                "id_ruta": id_ruta,
                "id_pedido": cliente.id_pedido,
                "orden": orden,
                # La penalización y la hora vienen del mismo cálculo.
                # Antes iban por caminos separados y una fila podía
                # decir a la vez "llegaste a las 08:29" y "te pasaste
                # 7 minutos de la ventana", que son cosas distintas
                # sobre la misma entrega.
                "hora": _hora_absoluta_a_timestamp(hora_llegada, fecha),
                "espera": int(cliente.tiempo_espera),
                "penalizacion": cliente.penalizacion,
            },
        )

        minuto = cliente.hora_llegada
    # ---- parada de fin ----
    orden += 1

    db.execute(
        text("""
            INSERT INTO paradas_ruta (
                id_ruta, orden, latitud, longitud,
                hora_llegada_estimada, tiempo_servicio,
                tiempo_espera, tipo_parada
            )
            VALUES (
                :id_ruta, :orden, :lat, :lon, :hora, 0, 0, 'FIN'
            )
        """),
        {
            "id_ruta": id_ruta,
            "orden": orden,
            "lat": lat_i,
            "lon": lon_i,
            "hora": _hora_de_ruta(ruta, fecha, False),
        },
    )

    # ---- cabecera de la ruta, con los valores nuevos ----
    tco = _tco(ruta)

    db.execute(
        text("""
            UPDATE rutas SET
                hora_inicio = :hora_inicio,
                hora_fin = :hora_fin,
                distancia_km = :distancia_km,
                duracion_minutos = :duracion,
                distancia_base_km = :distancia_base,
                duracion_base_minutos = :duracion_base,
                combustible_litros = :combustible,
                costo_combustible = :costo_combustible,
                costo_mantenimiento = :costo_mantenimiento,
                costo_conductor = :costo_conductor,
                costo_depreciacion = :costo_depreciacion,
                costo_seguro = :costo_seguro,
                costo_total = :costo_total,
                co2_kg = :co2,
                co2_evitable_kg = :co2_evitable,
                cumplimiento_ventanas_pct = :cumplimiento,
                estado = 'REOPTIMIZADA'
            WHERE id_ruta = :id_ruta
        """),
        {
            "id_ruta": id_ruta,
            "hora_inicio": _hora_de_ruta(ruta, fecha, True),
            "hora_fin": _hora_de_ruta(ruta, fecha, False),
            "distancia_km": ruta.distancia_km,
            "duracion": ruta.minutos,
            "distancia_base": round(
                base_indicadores['distancia_base_km'], P.REDONDEO
            ),
            "duracion_base": round(
                base_indicadores['duracion_base_minutos'], P.REDONDEO
            ),
            "combustible": tco['combustible_litros'],
            "costo_combustible": tco['costo_combustible'],
            "costo_mantenimiento": tco['costo_mantenimiento'],
            "costo_conductor": tco['costo_conductor'],
            "costo_depreciacion": tco['costo_depreciacion'],
            "costo_seguro": tco['costo_seguro'],
            "costo_total": ruta.costo_total,
            "co2": ruta.co2_kg,
            "co2_evitable": round(
                max(0.0, base_indicadores['co2_base_kg'] - ruta.co2_kg),
                P.REDONDEO,
            ),
            "cumplimiento": ruta.cumplimiento_pct,
        },
    )

    # ---- horas de conducción del conductor, que cambian al acortar ----
    if ruta.conductor is not None:
        db.execute(
            text("""
                UPDATE asignaciones SET
                    horas_conduccion = :horas,
                    descanso_requerido = :requiere
                WHERE id_ruta = :id_ruta
            """),
            {
                "id_ruta": id_ruta,
                "horas": round(ruta.minutos / 60.0, 2),
                "requiere": ruta.requiere_descanso,
            },
        )

    _persistir_indicadores(db, id_ruta, ruta, base_indicadores)

    db.commit()

    orden_pedidos = [c.id_pedido for c in ruta.secuencia]

    def diferencia(valor_nuevo, clave):
        """Cuánto mejoró (o empeoró) cada indicador."""
        if not anterior:
            return None

        viejo = float(anterior[clave] or 0)

        return round(float(valor_nuevo) - viejo, P.REDONDEO)

    return {
        "id_ruta": id_ruta,
        "distancia_km": ruta.distancia_km,
        "duracion_minutos": ruta.minutos,
        "costo_total": ruta.costo_total,
        "co2_kg": ruta.co2_kg,
        "cumplimiento_ventanas_pct": ruta.cumplimiento_pct,
        "orden_pedidos": orden_pedidos,
        "cambio": {
            "distancia_km": diferencia(ruta.distancia_km, "distancia_km"),
            "duracion_minutos": diferencia(
                ruta.minutos, "duracion_minutos"
            ),
            "costo_total": diferencia(ruta.costo_total, "costo_total"),
            "co2_kg": diferencia(ruta.co2_kg, "co2_kg"),
        },
    }


def _persistir_indicadores(db, id_ruta, ruta, base):
    """HU-09: guarda el indicador de la ruta con ahorro respecto a la base."""
    tco = _tco(ruta)

    distancia_base = base['distancia_base_km'] or ruta.distancia_km
    co2_base = base['co2_base_kg'] or ruta.co2_kg

    # ratio de consumo de referencia: el mismo vehículo por km
    consumo_base = (
        distancia_base / ruta.vehiculo.consumo_km_l
        if ruta.vehiculo.consumo_km_l > 0 else 0.0
    )

    ahorro_combustible = round(
        max(0.0, consumo_base - tco['combustible_litros']), P.REDONDEO
    )
    ahorro_economico = round(
        max(
            0.0,
            C.calcular_tco(
                distancia_base, ruta.vehiculo.datos
            )['costo_total'] - ruta.costo_total,
        ),
        P.REDONDEO,
    )
    co2_ahorrado = round(max(0.0, co2_base - ruta.co2_kg), P.REDONDEO)

    reduccion_co2 = round(
        100.0 * co2_ahorrado / co2_base, P.REDONDEO
    ) if co2_base > 0 else 0.0

    reduccion_distancia = round(
        100.0 * max(0.0, distancia_base - ruta.distancia_km)
        / distancia_base,
        P.REDONDEO,
    ) if distancia_base > 0 else 0.0

    db.execute(
        text("""
            INSERT INTO indicadores_ruta (
                id_ruta, distancia_km, combustible_l, co2_kg,
                costo_total, ahorro_combustible_l, ahorro_economico,
                co2_ahorrado_kg, cumplimiento_ventanas_pct,
                reduccion_co2_pct, reduccion_distancia_pct
            )
            VALUES (
                :id_ruta, :distancia, :combustible, :co2,
                :costo, :ahorro_comb, :ahorro_eco,
                :co2_ahorrado, :cumplimiento,
                :red_co2, :red_dist
            )
        """),
        {
            "id_ruta": id_ruta,
            "distancia": ruta.distancia_km,
            "combustible": tco['combustible_litros'],
            "co2": ruta.co2_kg,
            "costo": ruta.costo_total,
            "ahorro_comb": ahorro_combustible,
            "ahorro_eco": ahorro_economico,
            "co2_ahorrado": co2_ahorrado,
            "cumplimiento": ruta.cumplimiento_pct,
            "red_co2": reduccion_co2,
            "red_dist": reduccion_distancia,
        },
    )


def _tco(ruta):
    return C.calcular_tco(
        ruta.distancia_km, ruta.vehiculo.datos
    )


def _combustible(ruta):
    return _tco(ruta)['combustible_litros']


def _hora_de_ruta(ruta, fecha, inicio):
    minuto = _minuto_inicio(ruta, None) if inicio else (
        _minuto_inicio(ruta, None) + int(ruta.minutos)
    )

    return _hora_absoluta_a_timestamp(minuto, fecha)


def _minuto_inicio(ruta, problema):
    if ruta.conductor is not None:
        return ruta.conductor.disponibilidad_inicio

    return P.HORA_OPERATIVA_INICIO * 60


def _distancia_secuencial(problema):
    """Recorrido secuencial naive: una sola ruta que visita todo en orden.

    Es la referencia contra la que se mide el ahorro (HU-09/HU-10).
    """
    if not problema.clientes:
        return 0.0

    clientes = sorted(problema.clientes, key=lambda c: c.id_pedido)

    total = C.distancia_via_km(
        problema.base['latitud'], problema.base['longitud'],
        clientes[0].latitud, clientes[0].longitud,
    )

    for i in range(1, len(clientes)):
        total += C.distancia_via_km(
            clientes[i - 1].latitud, clientes[i - 1].longitud,
            clientes[i].latitud, clientes[i].longitud,
        )

    ultimo = clientes[-1]
    total += C.distancia_via_km(
        ultimo.latitud, ultimo.longitud,
        problema.base['latitud'], problema.base['longitud'],
    )

    return round(total, P.REDONDEO)


def _duracion_secuencial(problema):
    if not problema.clientes:
        return 0.0

    distancia = _distancia_secuencial(problema)
    minutos = C.minutos_de_conduccion(
        distancia, P.VELOCIDAD_NORMAL_KMH, 1.0
    )

    minutos += len(problema.clientes) * C.minutos_de_servicio()

    return round(minutos, P.REDONDEO)