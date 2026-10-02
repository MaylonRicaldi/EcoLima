"""Funciones de cálculo de distancia, tiempo, costo y emisiones.

Todas las fórmulas provienen de las reglas de negocio documentadas:
  RN-002 CO2 = distancia_km * factor_co2_kg_km
  RN-005 penalidad = minutos_tardanza * S/ 0.50
  RN-009 TCO = combustible + mantenimiento + depreciación + seguros + conductor
"""
import math
from datetime import date, datetime, time, timedelta

from app.core import parametros as P

RADIO_TIERRA_KM = 6371.0088


def haversine_km(lat1, lon1, lat2, lon2):
    """Distancia en línea recta entre dos puntos (km)."""
    f1, f2 = math.radians(lat1), math.radians(lat2)
    dlat = f2 - f1
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(f1) * math.cos(f2) * math.sin(dlon / 2) ** 2
    )

    return 2 * RADIO_TIERRA_KM * math.asin(math.sqrt(a))


# El recorrido por calzada es mayor que la distancia recta. 1.3 es el
# factor de rodeo habitual en Lima (calles en U, no radiales).
FACTOR_RODEO = 1.3


def distancia_via_km(lat1, lon1, lat2, lon2):
    """Distancia estimada por calzada (km)."""
    return haversine_km(lat1, lon1, lat2, lon2) * FACTOR_RODEO


def factor_congestion(latitud, longitud, registros):
    """Devuelve el factor de tiempo por congestión de tráfico.

    registros: lista de dicts con 'latitud', 'longitud' y 'nivel_congestion'.
    Se considera congestionado el tramo si hay un reporte dentro de 2 km.
    """
    peor = 1.0
    nivel_mayor = 0

    for r in registros or []:
        d = haversine_km(
            latitud, longitud,
            float(r['latitud']), float(r['longitud']),
        )

        if d > 2.0:
            continue

        nivel = r['nivel_congestion']

        peso = {'VERDE': 0, 'AMARILLO': 1, 'ROJO': 2}.get(nivel, 0)

        if peso > nivel_mayor:
            nivel_mayor = peso
            peor = P.FACTOR_CONGESTION.get(nivel, 1.0)

    return peor


def minutos_de_conduccion(distancia_km, velocidad_kmh, congestion=1.0):
    if velocidad_kmh <= 0:
        return 0.0

    return (distancia_km / velocidad_kmh) * 60.0 * congestion


def minutos_de_servicio():
    """Tiempo fijo de atención en cada entrega.

    No hay un valor documentado; se usa 10 min por parada (atención y
    firma de entrega) y el resto se modela en los tiempos de espera de
    la ventana de tiempo.
    """
    return 10.0


def minutos_penalidad_ventana(
    minutos_tardanza,
    penalizacion_por_minuto_db=None,
):
    """RN-005: penalidad = minutos de tardanza * costo por minuto."""
    costo_minuto = (
        penalizacion_por_minuto_db
        if penalizacion_por_minuto_db is not None
        else P.PENALIZACION_POR_MINUTO
    )

    return round(max(0.0, minutos_tardanza) * costo_minuto, P.REDONDEO)


# ---------------------------------------------------------------------------
# RN-002 - Emisiones
# ---------------------------------------------------------------------------

def calcular_co2(distancia_km, factor_co2_kg_km):
    """RN-002: CO2 (kg) = distancia_km * factor_co2_kg_km."""
    return round(
        float(distancia_km) * float(factor_co2_kg_km), P.REDONDEO
    )


# ---------------------------------------------------------------------------
# RN-009 - TCO
# ---------------------------------------------------------------------------

def calcular_costo_combustible(distancia_km, consumo_km_l, tipo_combustible):
    """combustible = (distancia / consumo) * precio.

    El consumo del vehículo es km por litro (o km por m³ para GNV).
    Para diésel el precio es por galón, así que se convierte a litros.
    """
    if consumo_km_l <= 0:
        return 0.0, 0.0

    unidad_consumida = distancia_km / consumo_km_l

    if tipo_combustible == 'ELECTRICO':
        return 0.0, 0.0

    precio, unidad_precio = P.precio_combustible(tipo_combustible)

    if tipo_combustible == 'GNV':
        return round(unidad_consumida * precio, P.REDONDEO), round(
            unidad_consumida, P.REDONDEO
        )

    # consumo en litros -> galones
    galones = unidad_consumida / P.LITROS_POR_GALON

    return round(galones * precio, P.REDONDEO), round(galones, P.REDONDEO)


def calcular_costo_depreciacion(vehiculo):
    """20% anual del costo de adquisición, prorrateado por día operativo."""
    costo = float(vehiculo.get('costo_adquisicion') or 0)

    if costo <= 0:
        return 0.0

    return round(
        costo * P.TASA_DEPRECIACION_ANUAL / P.DIAS_OPERATIVOS_MES,
        P.REDONDEO,
    )


def calcular_costos_seguros(vehiculo):
    """SOAT + seguro vehicular, prorrateado por día operativo."""
    soat = float(vehiculo.get('costo_soat_anual') or 0)
    vehicular = float(vehiculo.get('costo_seguro_anual') or 0)

    return round(
        (soat + vehicular) / P.DIAS_OPERATIVOS_MES, P.REDONDEO
    )


def calcular_costo_conductor():
    """Sueldo del conductor prorrateado por día operativo."""
    return round(
        P.SUELDO_CONDUCTOR_MENSUAL / P.DIAS_OPERATIVOS_MES, P.REDONDEO
    )


def calcular_tco(
    distancia_km,
    vehiculo,
    horas_conduccion=0.0,
):
    """RN-009: TCO = combustible + mantenimiento + depreciación
    + seguros + costo_conductor.

    Devuelve el desglose y el total.
    """
    tipo = vehiculo['tipo_combustible']
    consumo = float(vehiculo['consumo_km_l'])
    distancia_km = float(distancia_km)

    costo_combustible, galones = calcular_costo_combustible(
        distancia_km, consumo, tipo
    )

    mantenimiento = round(
        distancia_km * P.COSTO_MANTENIMIENTO_POR_KM, P.REDONDEO
    )

    depreciacion = calcular_costo_depreciacion(vehiculo)
    seguros = calcular_costos_seguros(vehiculo)
    conductor = calcular_costo_conductor()

    total = round(
        costo_combustible
        + mantenimiento
        + depreciacion
        + seguros
        + conductor,
        P.REDONDEO,
    )

    return {
        'combustible_litros': round(galones, P.REDONDEO),
        'costo_combustible': costo_combustible,
        'costo_mantenimiento': mantenimiento,
        'costo_depreciacion': depreciacion,
        'costo_seguro': seguros,
        'costo_conductor': conductor,
        'costo_total': total,
        'co2_kg': calcular_co2(distancia_km, float(vehiculo['factor_co2_kg_km'])),
    }


# ---------------------------------------------------------------------------
# RN-018 - Equivalencia ambiental
# ---------------------------------------------------------------------------

def arboles_equivalentes(co2_kg, kg_por_arbol=P.KG_CO2_POR_ARBOL_ANIO):
    """RN-018: árboles = CO2_total_kg / 22 kg CO2 por árbol por año."""
    if kg_por_arbol <= 0:
        return 0.0

    return round(co2_kg / kg_por_arbol, P.REDONDEO)


# ---------------------------------------------------------------------------
# Utilidades de tiempo
# ---------------------------------------------------------------------------

def a_hora(valor):
    """Convierte TIME de PostgreSQL (datetime.time o str) a (h, m)."""
    if valor is None:
        return None

    if isinstance(valor, time):
        return valor.hour, valor.minute

    if isinstance(valor, datetime):
        return valor.hour, valor.minute

    partes = str(valor).split(":")

    return int(partes[0]), int(partes[1])


def minutos_desde_inicio_operativa(h, m):
    return (h * 60 + m) - P.HORA_OPERATIVA_INICIO * 60


def dentro_de_horario_operativo(h, m):
    minutos = h * 60 + m
    return (
        P.HORA_OPERATIVA_INICIO * 60 <= minutos <= P.HORA_OPERATIVA_FIN * 60
    )


def es_hora_pico(h):
    return (7 <= h <= 9) or (17 <= h <= 20)


def velocidad_referencia(h):
    if es_hora_pico(h):
        return P.VELOCIDAD_HORA_PICO_KMH

    return P.VELOCIDAD_NORMAL_KMH


def es_franja_neblina(fecha, h):
    """RN-015: junio-setiembre entre 06:00 y 08:00."""
    mes = fecha.month if isinstance(fecha, date) else date.today().month

    return (
        mes in P.MESES_NEBLINA
        and P.HORA_NEBLINA_INICIO <= h < P.HORA_NEBLINA_FIN
    )


def minutos_desde_inicio(h, m):
    return h * 60 + m