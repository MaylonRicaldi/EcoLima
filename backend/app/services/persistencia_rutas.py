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

        # Inicio
        origen = ruta.conductor
        lat_i = origen.latitud if origen else problema.base['latitud']
        lon_i = origen.longitud if origen else problema.base['longitud']

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
                        "hora": _hora_absoluta_a_timestamp(minuto, fecha),
                        "descanso": int(P.DESCANSO_OBLIGATORIO_HORAS * 60),
                    },
                )
                minuto += int(P.DESCANSO_OBLIGATORIO_HORAS * 60)

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
                        :hora, :servicio, :espera, 'ENTREGA'
                    )
                """),
                {
                    "id_ruta": id_ruta,
                    "orden": orden,
                    "lat": cliente.latitud,
                    "lon": cliente.longitud,
                    "hora": _hora_absoluta_a_timestamp(
                        minuto + int(cliente.tiempo_espera), fecha
                    ),
                    "servicio": int(C.minutos_de_servicio()),
                    "espera": int(cliente.tiempo_espera),
                },
            )

            tramo = C.minutos_de_conduccion(
                problema._dist[
                    ruta.secuencia[pos - 1].indice
                ][cliente.indice] if pos > 0 else C.distancia_via_km(
                    lat_i, lon_i, cliente.latitud, cliente.longitud
                ),
                P.VELOCIDAD_NORMAL_KMH,
                1.0,
            )
            minuto += int(tramo) + int(cliente.tiempo_espera)

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
                        minuto + int(cliente.tiempo_espera), fecha
                    ),
                    "espera": int(cliente.tiempo_espera),
                    "penalizacion": cliente.penalizacion,
                },
            )

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