"""Carga de datos para el optimizador (HU-06).

Lee del PostgreSQL los pedidos pendientes, la flota activa, los
conductores disponibles y las ventanas de tiempo, aplicando las
restricciones documentadas:

  RN-003  excluye vehículos no elegibles por restricción vehicular
  RN-004  conductors con licencia vigente y jornada disponible
  RN-006  capacidad de carga (kg y m³)
"""
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core import parametros as P


def pedidos_pendientes(db, limite=P.MAX_PEDIDOS):
    """Pedidos aún no asignados a ninguna ruta (HU-06).

    ruta_pedidos tiene un índice único sobre id_pedido, por lo que un
    pedido pertenece como máximo a una ruta. Los pedidos ya planificados
    quedan excluidos de forma natural por el LEFT JOIN.
    """
    return db.execute(
        text("""
            SELECT
                p.id_pedido,
                p.id_cliente,
                p.id_ventana_tiempo,
                p.direccion_entrega,
                p.latitud,
                p.longitud,
                p.peso_kg,
                p.volumen_m3,
                p.prioridad,
                p.tipo_producto,
                vt.hora_inicio,
                vt.hora_fin,
                vt.tolerancia_minutos,
                vt.penalizacion_por_minuto
            FROM pedidos p
            INNER JOIN ventanas_tiempo vt
                ON vt.id_ventana = p.id_ventana_tiempo
            LEFT JOIN ruta_pedidos rp
                ON rp.id_pedido = p.id_pedido
            WHERE rp.id_pedido IS NULL
              AND p.estado IN ('PENDIENTE','ASIGNADO')
            ORDER BY
                CASE p.prioridad
                    WHEN 'EXPRESS' THEN 0
                    WHEN 'ESTANDAR' THEN 1
                    ELSE 2
                END,
                vt.hora_inicio,
                p.id_pedido
            LIMIT :limite
        """),
        {"limite": limite},
    ).mappings().all()


def flota_activa(db):
    """Vehículos aptos para asignar: estado ACTIVO (RN-021)."""
    return db.execute(
        text("""
            SELECT
                v.id_vehiculo,
                v.placa,
                v.capacidad_kg,
                v.capacidad_m3,
                v.consumo_km_l,
                v.factor_co2_kg_km,
                v.tipo_combustible,
                v.costo_adquisicion,
                v.costo_soat_anual,
                v.costo_seguro_anual,
                v.depreciacion_anual,
                v.estado,
                t.nombre AS tipo_nombre
            FROM vehiculos v
            INNER JOIN tipos_vehiculo t
                ON t.id_tipo = v.id_tipo_vehiculo
            WHERE v.estado = 'ACTIVO'
            ORDER BY v.capacidad_kg DESC
            LIMIT :limite
        """),
        {"limite": P.MAX_VEHICULOS},
    ).mappings().all()


def conductores_disponibles(db):
    """Conductores aptos para asignar.

    RN-004: jornada máxima de 8 h y descanso de 1 h por cada 4 h.
    Se exige licencia VIGENTE para conducir.

    `categorias_licencia` trae todas las licencias habilitantes del
    conductor, para que el optimizador pueda exigir que cubran el
    tipo de vehículo de la ruta (ver app/core/licencias.py).
    """
    return db.execute(
        text("""
            SELECT
                c.id_conductor,
                c.id_usuario,
                c.nombre,
                c.apellido,
                c.dni,
                c.anios_experiencia,
                c.hora_disponibilidad_inicio,
                c.hora_disponibilidad_fin,
                c.horas_max_conduccion,
                c.horas_conduccion_acumuladas,
                c.ubicacion_inicio,
                c.estado,
                ARRAY(
                    SELECT l.categoria
                    FROM licencias l
                    WHERE l.id_conductor = c.id_conductor
                      AND l.estado = 'VIGENTE'
                      AND l.fecha_vencimiento >= CURRENT_DATE
                ) AS categorias_licencia
            FROM conductores c
            WHERE c.estado IN ('DISPONIBLE','DESCANSO')
              AND EXISTS (
                SELECT 1
                FROM licencias l
                WHERE l.id_conductor = c.id_conductor
                  AND l.estado = 'VIGENTE'
                  AND l.fecha_vencimiento >= CURRENT_DATE
              )
            ORDER BY c.horas_conduccion_acumuladas ASC
        """)
    ).mappings().all()


def ventana_por_defecto(db):
    """Ventana operativa por defecto si el pedido no trae fenêtre válida."""
    return db.execute(
        text("""
            SELECT
                hora_inicio,
                hora_fin,
                tolerancia_minutos,
                penalizacion_por_minuto
            FROM ventanas_tiempo
            ORDER BY id_ventana
            LIMIT 1
        """)
    ).mappings().first()


def trafico_actual(db):
    """Tramos de tráfico registrados, para penalizar el tiempo (RN-012/HU-08)."""
    return db.execute(
        text("""
            SELECT
                t.latitud,
                t.longitud,
                t.nivel_congestion,
                t.segmento
            FROM trafico t
            WHERE t.fecha_hora = (
                SELECT MAX(fecha_hora) FROM trafico
            )
        """)
    ).mappings().all()


def incidentes_activos(db):
    """Incidentes activos (HU-08)."""
    return db.execute(
        text("""
            SELECT
                i.id_incidente,
                i.tipo,
                i.descripcion,
                i.latitud,
                i.longitud,
                i.nivel,
                i.fecha_hora
            FROM incidentes i
            WHERE i.estado = 'ACTIVO'
        """)
    ).mappings().all()


def punto_inicio_operativa(db):
    """El local de la empresa: de aquí salen y aquí vuelven los envíos.

    Se lee de la tabla `ubicaciones` con tipo LOCAL_OPERATIVA, que
    se coloca desde el mapa. Antes era una constante escrita en el
    código (el centro de San Juan de Lurigancho) y por eso cambiar
    de local obligaba a tocar el backend.

    Si la tabla no tuviera local, se cae al valor de respaldo y se
    marca como tal: es preferible un punto aproximado y visible que
    planificar en silencio desde un sitio inventado.
    """
    fila = db.execute(
        text("""
            SELECT direccion, latitud, longitud
            FROM ubicaciones
            WHERE tipo = 'LOCAL_OPERATIVA'
            LIMIT 1
        """)
    ).mappings().first()

    if fila:
        return {
            'latitud': float(fila['latitud']),
            'longitud': float(fila['longitud']),
            'direccion': fila['direccion'],
            'origen': 'registrado',
        }

    return {
        'latitud': P.LOCAL_RELLENO['latitud'],
        'longitud': P.LOCAL_RELLENO['longitud'],
        'direccion': P.LOCAL_RELLENO['direccion'],
        'origen': 'respaldo',
    }


def actualizar_local(db, direccion, latitud, longitud):
    """Coloca el icono del local en el mapa.

    Sólo puede haber un local, así que si ya existe se mueve en vez
    de crear un segundo: con dos locales el sistema no sabría cuál
    usar como origen, y cada ruta saldría de un sitio distinto.
    """
    db.execute(text("""
        DELETE FROM ubicaciones WHERE tipo = 'LOCAL_OPERATIVA'
    """))

    fila = db.execute(
        text("""
            INSERT INTO ubicaciones (
                direccion, referencia, latitud, longitud, geom, tipo
            )
            VALUES (
                :direccion,
                'Local de la empresa. Punto de partida y de retorno.',
                :latitud, :longitud,
                ST_SetSRID(
                    ST_MakePoint(:longitud, :latitud), 4326
                ),
                'LOCAL_OPERATIVA'
            )
            RETURNING id_ubicacion, direccion, latitud, longitud
        """),
        {
            "direccion": direccion,
            "latitud": latitud,
            "longitud": longitud,
        },
    ).mappings().first()

    db.commit()

    return dict(fila)


def primera_ruta_del_conductor(db, fecha):
    """Conductores que hoy todavía no tienen ninguna ruta asignada.

    El primer reparto del día sale del local y no de donde esté el
    conductor: el vehículo estaba en el local antes de empezar.

    Se lee de las asignaciones de ese mismo día y no del estado del
    conductor, porque el estado se vuelve a poner en DISPONIBLE al
    cerrar la última ruta y no distingue entre "no ha salido hoy" y
    "ya volvió al local": con el estado, un conductor que ya hizo
    dos repartos seguiría pareciendo que va al primer.
    """
    filas = db.execute(
        text("""
            SELECT DISTINCT a.id_conductor
            FROM asignaciones a
            INNER JOIN rutas r ON r.id_ruta = a.id_ruta
            WHERE r.fecha = :fecha
              AND r.estado <> 'CANCELADA'
        """),
        {"fecha": fecha},
    ).scalars().all()

    return set(filas)


def eliminar_planificacion_anterior(db, id_ruta):
    """Limpia paradas y asignaciones de una ruta antes de reoptimizar.

    ruta_pedidos y paradas_ruta tienen ON DELETE CASCADE, pero el
    reordenamiento se hace de forma explícita y controlada.
    """
    db.execute(
        text("DELETE FROM paradas_ruta WHERE id_ruta = :id_ruta"),
        {"id_ruta": id_ruta},
    )

    db.execute(
        text("DELETE FROM asignaciones WHERE id_ruta = :id_ruta"),
        {"id_ruta": id_ruta},
    )

    db.execute(
        text("DELETE FROM ruta_pedidos WHERE id_ruta = :id_ruta"),
        {"id_ruta": id_ruta},
    )


# ---------------------------------------------------------------------------
# Reoptimización: los datos de UNA ruta ya planificada
# ---------------------------------------------------------------------------
#
# La reoptimización no vuelve a repartir los pedidos entre toda la
# flota. Trabaja sobre una ruta que ya existe y conserva su vehículo y
# su conductor; lo único que cambia es el orden de visita. Por eso
# aquí NO se filtran los vehículos por estado ACTIVO ni los conductores
# por disponibilidad: si el vehículo está en mantenimiento o el
# conductor está en descanso, esa es la realidad de la ruta y hay que
# poder corregirle el recorrido igual.


def pedidos_de_ruta(db, id_ruta):
    """Los pedidos de una ruta, en su orden de visita actual."""
    return db.execute(
        text("""
            SELECT
                p.id_pedido,
                p.id_cliente,
                p.direccion_entrega,
                p.latitud,
                p.longitud,
                p.peso_kg,
                p.volumen_m3,
                p.prioridad,
                p.tipo_producto,
                vt.hora_inicio,
                vt.hora_fin,
                vt.tolerancia_minutos,
                vt.penalizacion_por_minuto,
                rp.orden_visita
            FROM ruta_pedidos rp
            INNER JOIN pedidos p
                ON p.id_pedido = rp.id_pedido
            INNER JOIN ventanas_tiempo vt
                ON vt.id_ventana = p.id_ventana_tiempo
            WHERE rp.id_ruta = :id_ruta
            ORDER BY rp.orden_visita
        """),
        {"id_ruta": id_ruta},
    ).mappings().all()


def vehiculo_de_ruta(db, id_ruta):
    """El vehículo que ya tiene asignada la ruta, o None."""
    return db.execute(
        text("""
            SELECT
                v.id_vehiculo,
                v.placa,
                v.capacidad_kg,
                v.capacidad_m3,
                v.consumo_km_l,
                v.factor_co2_kg_km,
                v.tipo_combustible,
                v.costo_adquisicion,
                v.costo_soat_anual,
                v.costo_seguro_anual,
                v.depreciacion_anual,
                v.estado,
                t.nombre AS tipo_nombre
            FROM asignaciones a
            INNER JOIN vehiculos v
                ON v.id_vehiculo = a.id_vehiculo
            INNER JOIN tipos_vehiculo t
                ON t.id_tipo = v.id_tipo_vehiculo
            WHERE a.id_ruta = :id_ruta
        """),
        {"id_ruta": id_ruta},
    ).mappings().first()


def entregas_cerradas_de_ruta(db, id_ruta):
    """Los pedidos de la ruta que ya se entregaron o fallaron.

    Esos pedidos no se vuelven a planificar. Un pedido entregado es
    el registro de una entrega que ya ocurrió, y un pedido fallido
    también: en los dos casos corregir el recorrido de lo que queda no
    debe reescribirlos.

    Devuelve un diccionario id_pedido -> datos de la entrega, con su
    hora real y su orden, para poder conservarlos tal cual.
    """
    filas = db.execute(
        text("""
            SELECT
                rp.id_pedido,
                rp.orden_visita,
                rp.estado_entrega,
                rp.hora_llegada_real,
                p.latitud,
                p.longitud
            FROM ruta_pedidos rp
            INNER JOIN pedidos p
                ON p.id_pedido = rp.id_pedido
            WHERE rp.id_ruta = :id_ruta
              AND rp.estado_entrega IN ('ENTREGADO', 'FALLIDO')
        """),
        {"id_ruta": id_ruta},
    ).mappings().all()

    return {f['id_pedido']: dict(f) for f in filas}


def obstaculos_activos(db):
    """Obstrucciones de la calzada que siguen vigentes.

    Los obstáculos no caducan: el cono que se puso hoy sigue ahí la
    semana que viene. Se quitan a mano, no por fecha.
    """
    return db.execute(
        text("""
            SELECT
                id_obstaculo,
                tipo,
                descripcion,
                latitud,
                longitud,
                nivel,
                resuelto
            FROM obstaculos
            WHERE resuelto = FALSE
        """)
    ).mappings().all()


def conductor_de_ruta(db, id_ruta):
    """El conductor que ya tiene asignada la ruta, o None."""
    return db.execute(
        text("""
            SELECT
                c.id_conductor,
                c.id_usuario,
                c.nombre,
                c.apellido,
                c.hora_disponibilidad_inicio,
                c.hora_disponibilidad_fin,
                c.horas_max_conduccion,
                c.horas_conduccion_acumuladas,
                c.ubicacion_inicio,
                c.estado,
                ARRAY(
                    SELECT l.categoria
                    FROM licencias l
                    WHERE l.id_conductor = c.id_conductor
                      AND l.estado = 'VIGENTE'
                      AND l.fecha_vencimiento >= CURRENT_DATE
                ) AS categorias_licencia
            FROM asignaciones a
            INNER JOIN conductores c
                ON c.id_conductor = a.id_conductor
            WHERE a.id_ruta = :id_ruta
        """),
        {"id_ruta": id_ruta},
    ).mappings().first()