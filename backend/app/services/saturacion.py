"""Saturación de la operación: capacidad y tráfico.

Responde a dos preguntas que el usuario se hace al registrar un
pedido:

  1. ¿La flota y los conductores dan abasto para esta ventana?
  2. Si no dan abasto, ¿qué otra ventana del catálogo sí la daría?

No impone nada: informa y propone. El pedido se guarda con la
ventana que eligió el usuario, no con la sugerida. Eso se decidió
de forma explícita en lugar de moverle la ventana al pedido por su
cuenta.

Los dos tipos de saturación que se miran:

  - capacidad. Los conductores ya están en ruta, sus horas de
    conducción están consumidas, o los vehículos están llenos.
  - tráfico.   Hay tramos rojos registrados cerca de las rutas de
    ese día, aunque la flota esté libre.

Detectar solo el tráfico daría una falsa sensación de capacidad: se
ve un congestionamiento y el sistema dice que no cabe, cuando el
problema real es que no hay conductores libres.
"""
from datetime import date, datetime, time

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core import parametros as P
from app.services import calculos as C

# A partir de estos km un obstáculo o un tramo rojo se considera que
# afecta de verdad a la operación.
RADIO_INFLUENCIA_KM = 2.0

# Una ventana necesita estos minutos libres de flota y conductores
# para considerarse con hueco. Por debajo, avisar.
MINUTOS_LIBRES_MINIMOS = 30


def _a_hora(valor):
    """Normaliza un time a (hora, minuto)."""
    if valor is None:
        return None

    return (valor.hour, valor.minute)


def _horas_entre(ini, fin):
    """Minutos que duran dos horas del mismo día."""
    a, b = _a_hora(ini), _a_hora(fin)

    if a is None or b is None:
        return 0

    return max(0, (b[0] * 60 + b[1]) - (a[0] * 60 + a[1]))


def _dentro_de_ventana(disponible_ini, disponible_fin, ini, fin):
    """Cuántos minutos del turno del conductor caen en la ventana."""
    total = _horas_entre(ini, fin)

    if total <= 0:
        return 0

    inicio = max(_a_hora(disponible_ini) or (0, 0), _a_hora(ini))
    fin_ventana = _a_hora(fin)
    fin_turno = min(_a_hora(disponible_fin) or (23, 59), fin_ventana)

    if fin_turno <= inicio:
        return 0

    return min(total, (fin_turno[0] * 60 + fin_turno[1])
               - (inicio[0] * 60 + inicio[1]))


def evaluar_saturacion(
    db, fecha, hora_inicio, hora_fin, peso_kg=0.0, volumen_m3=0.0,
):
    """Calcula si la operación da abasto para esa ventana.

    Devuelve el diccionario que se envía al frontend.
    """
    motivos = []

    # ---------------- capacidad: conductores ----------------

    conductores = db.execute(
        text("""
            SELECT
                c.id_conductor,
                c.nombre,
                c.apellido,
                c.estado,
                c.hora_disponibilidad_inicio,
                c.hora_disponibilidad_fin,
                c.horas_max_conduccion,
                c.horas_conduccion_acumuladas,
                EXISTS (
                    SELECT 1 FROM asignaciones a
                    INNER JOIN rutas r ON r.id_ruta = a.id_ruta
                    WHERE a.id_conductor = c.id_conductor
                      AND r.estado IN ('PLANIFICADA','EN_CURSO',
                                       'REOPTIMIZADA')
                ) AS en_ruta,
                EXISTS (
                    SELECT 1 FROM licencias l
                    WHERE l.id_conductor = c.id_conductor
                      AND l.estado = 'VIGENTE'
                      AND l.fecha_vencimiento >= :fecha
                ) AS tiene_licencia
            FROM conductores c
            WHERE c.estado IN ('DISPONIBLE','DESCANSO')
        """),
        {"fecha": fecha},
    ).mappings().all()

    disponibles = [c for c in conductores if not c["en_ruta"]]

    con_licencia = [c for c in disponibles if c["tiene_licencia"]]

    en_ventana = [
        c for c in con_licencia
        if _dentro_de_ventana(
            c["hora_disponibilidad_inicio"],
            c["hora_disponibilidad_fin"],
            hora_inicio,
            hora_fin,
        ) > 0
    ]

    # RN-004: un conductor no puede pasar de su jornada
    con_jornada = [
        c for c in en_ventana
        if (
            float(c["horas_max_conduccion"])
            - float(c["horas_conduccion_acumuladas"])
        ) > 0
    ]

    horas_libres = sum(
        float(c["horas_max_conduccion"])
        - float(c["horas_conduccion_acumuladas"])
        for c in con_jornada
    )

    # ---------------- capacidad: vehículos ----------------

    vehiculos = db.execute(
        text("""
            SELECT
                v.id_vehiculo,
                v.placa,
                v.capacidad_kg,
                v.capacidad_m3,
                v.estado,
                EXISTS (
                    SELECT 1 FROM asignaciones a
                    INNER JOIN rutas r ON r.id_ruta = a.id_ruta
                    WHERE a.id_vehiculo = v.id_vehiculo
                      AND r.estado IN ('PLANIFICADA','EN_CURSO',
                                       'REOPTIMIZADA')
                ) AS en_ruta
            FROM vehiculos v
            WHERE v.estado = 'ACTIVO'
        """)
    ).mappings().all()

    vehiculos_libres = [v for v in vehiculos if not v["en_ruta"]]

    carga_kg_libre = sum(
        float(v["capacidad_kg"]) for v in vehiculos_libres
    )
    carga_m3_libre = sum(
        float(v["capacidad_m3"]) for v in vehiculos_libres
    )

    carga_ya_usada = db.execute(
        text("""
            SELECT
                COALESCE(sum(p.peso_kg), 0) AS kg,
                COALESCE(sum(p.volumen_m3), 0) AS m3
            FROM ruta_pedidos rp
            INNER JOIN rutas r ON r.id_ruta = rp.id_ruta
            INNER JOIN pedidos p ON p.id_pedido = rp.id_pedido
            WHERE r.estado IN ('PLANIFICADA','EN_CURSO','REOPTIMIZADA')
        """)
    ).mappings().first()

    carga_kg_libre -= float(carga_ya_usada["kg"] or 0)
    carga_m3_libre -= float(carga_ya_usada["m3"] or 0)

    # ---------------- tráfico ----------------

    trafico = db.execute(
        text("""
            SELECT segmento, latitud, longitud, nivel_congestion
            FROM trafico
            WHERE fecha_hora >= :desde
        """),
        {"desde": datetime.combine(
            fecha, time(0, 0)
        )},
    ).mappings().all()

    paradas = db.execute(
        text("""
            SELECT DISTINCT p.latitud, p.longitud
            FROM paradas_ruta pr
            INNER JOIN rutas r ON r.id_ruta = pr.id_ruta
            INNER JOIN ruta_pedidos rp ON rp.id_ruta = r.id_ruta
            INNER JOIN pedidos p ON p.id_pedido = rp.id_pedido
            WHERE r.fecha = :fecha
        """),
        {"fecha": fecha},
    ).mappings().all()

    congestionados = 0
    afectados = 0
    niveles = {"VERDE": 0, "AMARILLO": 0, "ROJO": 0}

    for t in trafico:
        if t["nivel_congestion"] in niveles:
            niveles[t["nivel_congestion"]] += 1

        if t["nivel_congestion"] == "VERDE":
            continue

        congestionados += 1

        cerca = False

        for p in paradas:
            d = C.haversine_km(
                float(t["latitud"]), float(t["longitud"]),
                float(p["latitud"]), float(p["longitud"]),
            )

            if d <= RADIO_INFLUENCIA_KM:
                cerca = True
                break

        if cerca:
            afectados += 1

    # ---------------- veredicto ----------------

    minutos_ventana = _horas_entre(hora_inicio, hora_fin)

    problemas_capacidad = 0

    if not con_jornada:
        problemas_capacidad += 1

        motivos.append(
            "No hay conductores con licencia vigente y jornada "
            f"libre en esa franja ({hora_inicio.strftime('%H:%M')}"
            f"-{hora_fin.strftime('%H:%M')})"
        )

    if not vehiculos_libres:
        problemas_capacidad += 1

        motivos.append(
            "Todos los vehículos activos ya están asignados a rutas"
        )

    if peso_kg and carga_kg_libre < peso_kg:
        problemas_capacidad += 1

        motivos.append(
            f"Quedan {carga_kg_libre:.0f} kg libres de carga y el "
            f"pedido pide {peso_kg:.0f} kg"
        )

    if volumen_m3 and carga_m3_libre < volumen_m3:
        problemas_capacidad += 1

        motivos.append(
            f"Quedan {carga_m3_libre:.1f} m³ libres y el pedido pide "
            f"{volumen_m3:.1f} m³"
        )

    problemas_trafico = 0

    if congestionados:
        problemas_trafico += 1

        motivos.append(
            f"Hay {congestionados} tramo(s) con congestión "
            f"registrada ese día"
        )

    if afectados:
        problemas_trafico += 1

        motivos.append(
            f"{afectados} de esos tramos están sobre el recorrido de "
            f"las rutas de ese día: la operación va a tardar más"
        )

    if not con_jornada:
        # Sin un solo conductor con jornada libre en esa franja, la
        # operación no puede atender esa ventana. No es un ajuste:
        # no cabe.
        estado = "SATURADO"

    else:
        # Con conductores, pero menos de la mitad de la ventana
        # cubierta, es un ajuste: se puede, va justo.
        minutos_cubiertos = sum(
            _dentro_de_ventana(
                c["hora_disponibilidad_inicio"],
                c["hora_disponibilidad_fin"],
                hora_inicio,
                hora_fin,
            )
            for c in con_jornada
        )

        if minutos_ventana and minutos_cubiertos < minutos_ventana * 0.5:
            problemas_capacidad = max(problemas_capacidad, 1)

            motivos.append(
                f"Los conductores libres cubren sólo "
                f"{minutos_cubiertos} de los {minutos_ventana} "
                f"minutos de la ventana"
            )

        if problemas_capacidad and problemas_trafico:
            estado = "SATURADO"
        elif problemas_capacidad or problemas_trafico:
            estado = "AJUSTADO"
        else:
            estado = "HOLGADO"

    # ---------------- ventana sugerida ----------------

    sugerida = None

    if problemas_capacidad:
        sugerida = buscar_ventana_con_hueco(
            db, fecha, hora_inicio, hora_fin, peso_kg, volumen_m3,
        )

    congestion_maxima = None

    if niveles["ROJO"]:
        congestion_maxima = "ROJO"
    elif niveles["AMARILLO"]:
        congestion_maxima = "AMARILLO"

    return {
        "fecha": fecha,
        "hora_inicio": hora_inicio,
        "hora_fin": hora_fin,
        "estado": estado,
        "conductores_disponibles": len(con_jornada),
        "conductores_en_ruta": sum(1 for c in conductores if c["en_ruta"]),
        "horas_libres_totales": round(horas_libres, 2),
        "carga_kg_libre": round(carga_kg_libre, 2),
        "carga_m3_libre": round(carga_m3_libre, 2),
        "tramos_congestionados": congestionados,
        "tramos_en_ruta_afectados": afectados,
        "congestion_maxima": congestion_maxima,
        "motivos": motivos,
        "ventana_sugerida": sugerida,
    }


def buscar_ventana_con_hueco(
    db, fecha, hora_inicio, hora_fin, peso_kg, volumen_m3,
):
    """Busca en el catálogo la ventana más parecida que sí tenga hueco.

    Solo se miran las ventanas del catálogo: las que se crearon para
    un caso puntual no se ofrecen para otros pedidos.

    Se prefij siempre la ventana más cercana en el tiempo, no la más
    grande: un pedido que entra a las 8 tolera mejor 07:00-09:00
    que 14:00-22:00 aunque la segunda tenga más horas libres.
    """
    # Conductores con licencia y turno: se leen una vez y se filtran
    # en memoria por ventana. Consultar la base por cada candidata
    # sería una petición por ventana del catálogo.
    conductores = db.execute(
        text("""
            SELECT
                c.hora_disponibilidad_inicio,
                c.hora_disponibilidad_fin,
                c.horas_max_conduccion,
                c.horas_conduccion_acumuladas
            FROM conductores c
            WHERE c.estado IN ('DISPONIBLE','DESCANSO')
              AND EXISTS (
                SELECT 1 FROM asignaciones a
                INNER JOIN rutas r ON r.id_ruta = a.id_ruta
                WHERE a.id_conductor = c.id_conductor
                  AND r.estado IN ('PLANIFICADA','EN_CURSO',
                                   'REOPTIMIZADA')
              ) = FALSE
              AND EXISTS (
                SELECT 1 FROM licencias l
                WHERE l.id_conductor = c.id_conductor
                  AND l.estado = 'VIGENTE'
                  AND l.fecha_vencimiento >= :fecha
              )
        """),
        {"fecha": fecha},
    ).mappings().all()

    carga = db.execute(
        text("""
            SELECT
                COALESCE(sum(v.capacidad_kg), 0) AS kg,
                COALESCE(sum(v.capacidad_m3), 0) AS m3
            FROM vehiculos v
            WHERE v.estado = 'ACTIVO'
              AND EXISTS (
                SELECT 1 FROM asignaciones a
                INNER JOIN rutas r ON r.id_ruta = a.id_ruta
                WHERE a.id_vehiculo = v.id_vehiculo
                  AND r.estado IN ('PLANIFICADA','EN_CURSO',
                                   'REOPTIMIZADA')
              ) = FALSE
        """)
    ).mappings().first()

    kg_libres = float(carga["kg"] or 0)
    m3_libres = float(carga["m3"] or 0)

    if peso_kg and kg_libres < peso_kg:
        return None

    if volumen_m3 and m3_libres < volumen_m3:
        return None

    candidatas = db.execute(
        text("""
            SELECT
                id_ventana,
                hora_inicio,
                hora_fin,
                tolerancia_minutos,
                penalizacion_por_minuto,
                es_ocasional
            FROM ventanas_tiempo
            WHERE es_ocasional = FALSE
              AND hora_fin > hora_inicio
        """)
    ).mappings().all()

    mejor = None
    mejor_puntaje = None

    for v in candidatas:
        if (
            v["hora_inicio"] == hora_inicio
            and v["hora_fin"] == hora_fin
        ):
            continue

        horas = _horas_entre(v["hora_inicio"], v["hora_fin"])

        if horas <= 0:
            continue

        libres = 0

        for c in conductores:
            minutos = _dentro_de_ventana(
                c["hora_disponibilidad_inicio"],
                c["hora_disponibilidad_fin"],
                v["hora_inicio"],
                v["hora_fin"],
            )

            horas_restantes = (
                float(c["horas_max_conduccion"])
                - float(c["horas_conduccion_acumuladas"])
            )

            if minutos > 0 and horas_restantes > 0:
                libres += min(horas, minutos)

        if libres < MINUTOS_LIBRES_MINIMOS:
            continue

        # Puntaje: a qué distancia está del pedido el inicio de la
        # ventana, menos una rebaja por las horas libres que tenga.
        # Gana la más cercana con hueco, no la más grande.
        distancia = abs(
            (v["hora_inicio"].hour * 60 + v["hora_inicio"].minute)
            - (hora_inicio.hour * 60 + hora_inicio.minute)
        )

        puntaje = distancia - (libres / 60.0) * 30

        if mejor_puntaje is None or puntaje < mejor_puntaje:
            mejor_puntaje = puntaje
            mejor = v

    if mejor is None:
        return None

    return {
        "id_ventana": mejor["id_ventana"],
        "hora_inicio": mejor["hora_inicio"],
        "hora_fin": mejor["hora_fin"],
        "tolerancia_minutos": mejor["tolerancia_minutos"],
        "penalizacion_por_minuto": float(mejor["penalizacion_por_minuto"]),
        "motivo": "Es la ventana del catálogo más cercana a la suya "
                  "que todavía tiene conductores con jornada libre",
    }