"""¿Conviene hacer esta orden antes de la que viene?

El caso: un conductor ya está repartiendo y se le encarga otro envío.
La regla del negocio es sencilla de decir y nada trivial de aplicar:

  - Por defecto se termina la entrega que ya está en marcha. No se le
    cambia el recorrido al conductor a mitad de camino.

  - Pero si la orden nueva está más cerca, entonces sí conviene
    adelantarla.

  - Y por encima de la distancia manda el tiempo: si el pedido que
    está más lejos se le está yendo la ventana de entrega, ese va
    primero aunque esté más lejos. Perder un pedido por llegar tarde
    cuesta más que rodar un poco más.

Este módulo NO cambia nada: sólo dice qué convendría hacer y por
qué. Aplicarlo es cosa del usuario, que confirma. La razón es la
misma que en el resto del sistema: nadie reordena el trabajo de un
conductor a sus espaldas.
"""
import sys

from sqlalchemy import text

from app.core import parametros as P
from app.services import calculos as C
from app.services import roads as R


# Motivos posibles. Se devuelven como código y con su texto, para que
# el frontend pueda explicarlos sin inventar su propia versión.
MOTIVO_MAS_CERCA = 'MAS_CERCA'
MOTIVO_URGENTE_ACTUAL = 'URGENTE_ACTUAL'
MOTIVO_URGENTE_NUEVO = 'URGENTE_NUEVO'
MOTIVO_MAS_LEJOS = 'MAS_LEJOS'


def _minutos_de_viaje(lat1, lon1, lat2, lon2):
    """Minutos hasta el destino, por la calle si se puede.

    Cae a la velocidad de referencia si el motor de rutas no
    responde: es una estimación para decidir el orden, no una promesa
    de horario, así que un valor aproximado sirve igual.
    """
    km, minutos = R.matriz_distancias([(lat1, lon1), (lat2, lon2)])

    if km is not None and minutos is not None and minutos[0][1] > 0:
        return float(km[0][1]), float(minutos[0][1])

    km_estimado = C.distancia_via_km(lat1, lon1, lat2, lon2)

    return (
        km_estimado,
        C.minutos_de_conduccion(km_estimado, C.velocidad_referencia(10), 1.0),
    )


def _posicion_actual(db, id_ruta):
    """Dónde está el vehículo ahora mismo.

    En orden de preferencia:

      1. La última entrega ya cerrada: es donde está de verdad.
      2. La parada INICIO: si aún no entregó nada, salió de ahí.
      3. El local: por si la ruta no tiene ninguna de las dos.

    Se usa la última entrega cerrada y no la INICIO a propósito: si
    el conductor ya va por la calle, medir desde el local mandaría a
    calcular un viaje que ya no va a hacer.
    """
    ultima = db.execute(
        text("""
            SELECT pe.latitud, pe.longitud
            FROM ruta_pedidos rp
            INNER JOIN pedidos pe ON pe.id_pedido = rp.id_pedido
            WHERE rp.id_ruta = :id_ruta
              AND rp.estado_entrega IN ('ENTREGADO', 'FALLIDO')
            ORDER BY rp.hora_llegada_real DESC NULLS LAST,
                     rp.orden_visita DESC
            LIMIT 1
        """),
        {"id_ruta": id_ruta},
    ).mappings().first()

    if ultima:
        return (
            float(ultima["latitud"]),
            float(ultima["longitud"]),
            'última entrega',
        )

    inicio = db.execute(
        text("""
            SELECT latitud, longitud
            FROM paradas_ruta
            WHERE id_ruta = :id_ruta AND tipo_parada = 'INICIO'
            ORDER BY orden LIMIT 1
        """),
        {"id_ruta": id_ruta},
    ).mappings().first()

    if inicio:
        return (
            float(inicio["latitud"]),
            float(inicio["longitud"]),
            'salida de la ruta',
        )

    from app.services import datos_optimizacion as D

    local = D.punto_inicio_operativa(db)

    return (local['latitud'], local['longitud'], 'local de la empresa')


def _siguiente_pendiente(db, id_ruta):
    """La primera entrega todavía por hacer de la ruta."""
    return db.execute(
        text("""
            SELECT rp.id_pedido, rp.orden_visita,
                   rp.hora_llegada_estimada,
                   pe.direccion_entrega, pe.latitud, pe.longitud,
                   vt.hora_fin, vt.tolerancia_minutos,
                   vt.penalizacion_por_minuto
            FROM ruta_pedidos rp
            INNER JOIN pedidos pe ON pe.id_pedido = rp.id_pedido
            INNER JOIN ventanas_tiempo vt
                ON vt.id_ventana = pe.id_ventana_tiempo
            WHERE rp.id_ruta = :id_ruta
              AND rp.estado_entrega = 'PENDIENTE'
            ORDER BY rp.orden_visita
            LIMIT 1
        """),
        {"id_ruta": id_ruta},
    ).mappings().first()


def _minutos_del_dia(hora):
    """Una hora de `ventanas_tiempo` en minutos desde medianoche.

    PostgreSQL devuelve TIME como `datetime.time`, no como entero. Se
    convierte con el mismo helper que usa el optimizador en vez de
    hacer un `int()` aquí a pelo: si el tipo cambia algún día, esta
    sería la única función que se caería.
    """
    h, m = C.a_hora(hora)

    return h * 60 + m


def _urgente(hora_fin, tolerancia, minutos_hasta_llegar, minutos_transcurridos):
    """¿Este pedido se le está yendo la ventana?

    La penalización empieza cuando la llegada se pasa de
    `hora_fin + tolerancia`. Antes de eso el pedido todavía no cuesta
    nada, pero ya se avisa con margen para poder corregir el recorrido
    a tiempo: de nada sirve enterarse cuando el daño está hecho.

    El margen es `MARGEN_URGENCIA_VENTANA_MINUTOS` en parametros.py,
    porque es una decisión del negocio y no del DDL.
    """
    limite = hora_fin + tolerancia

    minutos_restantes = limite - minutos_transcurridos

    return (
        minutos_restantes - minutos_hasta_llegar
        <= P.MARGEN_URGENCIA_VENTANA_MINUTOS
    )


def evaluar(db, id_ruta, id_pedido):
    """Compara la orden nueva con la entrega que viene.

    Devuelve la recomendación y los números en los que se apoya, para
    que la pantalla pueda enseñarlos en vez de pedir fe.
    """
    lat_actual, lon_actual, origen = _posicion_actual(db, id_ruta)

    actual = _siguiente_pendiente(db, id_ruta)

    nuevo = db.execute(
        text("""
            SELECT p.id_pedido, p.direccion_entrega,
                   p.latitud, p.longitud, p.prioridad,
                   vt.hora_inicio, vt.hora_fin, vt.tolerancia_minutos,
                   vt.penalizacion_por_minuto
            FROM pedidos p
            INNER JOIN ventanas_tiempo vt
                ON vt.id_ventana = p.id_ventana_tiempo
            WHERE p.id_pedido = :id_pedido
        """),
        {"id_pedido": id_pedido},
    ).mappings().first()

    if nuevo is None:
        return {
            "recomendacion": "MANTENER",
            "motivo": MOTIVO_MAS_LEJOS,
            "puede_anticipar": False,
            "detalle": "El pedido no existe.",
        }

    km_actual, min_actual = _minutos_de_viaje(
        lat_actual, lon_actual,
        float(actual["latitud"]), float(actual["longitud"]),
    ) if actual else (0.0, 0.0)

    km_nuevo, min_nuevo = _minutos_de_viaje(
        lat_actual, lon_actual,
        float(nuevo["latitud"]), float(nuevo["longitud"]),
    )

    # Los minutos de hoy que faltan hasta que empiece la ventana. Se
    # mide contra la hora actual real, no contra la estimada de la
    # ruta: la pregunta es "si salgo ahora, ¿llego a tiempo?".
    from datetime import datetime

    ahora = datetime.now()

    transcurridos = (
        ahora.hour * 60 + ahora.minute
    ) - P.HORA_OPERATIVA_INICIO * 60

    urgente_nuevo = _urgente(
        _minutos_del_dia(nuevo["hora_fin"]),
        int(nuevo["tolerancia_minutos"] or 0),
        min_nuevo,
        transcurridos,
    )

    urgente_actual = False

    if actual:
        urgente_actual = _urgente(
            _minutos_del_dia(actual["hora_fin"]),
            int(actual["tolerancia_minutos"] or 0),
            min_actual,
            transcurridos,
        )

    # La decisión. El tiempo manda sobre la distancia, en ese orden.
    if urgente_nuevo and not urgente_actual:
        recomendacion = "ANTICIPAR"
        motivo = MOTIVO_URGENTE_NUEVO

    elif urgente_actual and not urgente_nuevo:
        recomendacion = "MANTENER"
        motivo = MOTIVO_URGENTE_ACTUAL

    elif min_nuevo < min_actual:
        recomendacion = "ANTICIPAR"
        motivo = MOTIVO_MAS_CERCA

    else:
        recomendacion = "MANTENER"
        motivo = MOTIVO_MAS_LEJOS

    return {
        "recomendacion": recomendacion,
        "motivo": motivo,
        "puede_anticipar": actual is not None,
        "posicion_actual": {"latitud": lat_actual, "longitud": lon_actual},
        "desde": origen,
        "actual": _resumen(actual, km_actual, min_actual, urgente_actual)
        if actual else None,
        "nuevo": _resumen(nuevo, km_nuevo, min_nuevo, urgente_nuevo),
        "gana_por": {
            "minutos": round(min_nuevo - min_actual, 1),
            "km": round(km_nuevo - km_actual, 2),
        },
        "margen_urgencia_minutos": P.MARGEN_URGENCIA_VENTANA_MINUTOS,
    }


def _resumen(fila, km, minutos, urgente):
    """Los datos de un candidato, en la misma forma para los dos."""
    return {
        "id_pedido": fila["id_pedido"],
        "direccion": fila["direccion_entrega"],
        "latitud": float(fila["latitud"]),
        "longitud": float(fila["longitud"]),
        "km": round(km, 2),
        "minutos": round(minutos, 1),
        "hora_fin": f"{_minutos_del_dia(fila['hora_fin']) // 60:02d}:"
                    f"{_minutos_del_dia(fila['hora_fin']) % 60:02d}",
        "urgente": urgente,
        "penalizacion_por_minuto": float(
            fila["penalizacion_por_minuto"] or 0
        ),
    }


if __name__ == "__main__":
    # Comprobación rápida desde la línea de comandos:
    #   python -m app.services.orden_sugerido 12 45
    sys.exit(
        f"Uso: python -m app.services.orden_sugerido <id_ruta> "
        f"<id_pedido>"
    )
