"""Parámetros de cálculo del proyecto (RN-002, RN-004, RN-005, RN-009).

Todos los valores provienen de la documentación del proyecto
(docs/01 Inicio/09. Reglas de negocio V_1_0_0.md). No se inventan.

RN-024 exige versionar los parámetros críticos; aquí viven como
constantes con la regla de negocio de la que provienen documentadas.
"""

# ---------------------------------------------------------------------------
# RN-009 - Costo de ciclo de vida (TCO)
# TCO = combustible + mantenimiento + depreciación + seguros + conductor
# ---------------------------------------------------------------------------

# Diésel: S/ 17.50 por galón (RN-009)
PRECIO_DIESEL_POR_GALON = 17.50

# GNV: S/ 12.50 por metro cúbico (RN-009)
PRECIO_GNV_POR_M3 = 12.50

# Un galón de diésel equivale a 3.785411784 litros (conversión física)
LITROS_POR_GALON = 3.785411784

# Mantenimiento: S/ 1.20 por kilómetro recorrido (RN-009)
COSTO_MANTENIMIENTO_POR_KM = 1.20

# Depreciación: 20% anual sobre el costo de adquisición (RN-009)
TASA_DEPRECIACION_ANUAL = 0.20

# Sueldo del conductor: S/ 1,500 mensuales (RN-009)
SUELDO_CONDUCTOR_MENSUAL = 1500.00

DIAS_OPERATIVOS_MES = 30

# ---------------------------------------------------------------------------
# RN-005 - Ventana de tiempo y penalización por tardanza
# penalidad = minutos_tardanza * S/ 0.50 por minuto
# ---------------------------------------------------------------------------
PENALIZACION_POR_MINUTO = 0.50

# Incumplimiento mayor a 30 minutos genera alerta (RN-005)
UMBRAL_ALERTA_TARDANZA_MIN = 30

# ---------------------------------------------------------------------------
# RN-007 - Prioridad de pedidos en la función objetivo
# express 3x, estandar 1x, economico 0.5x
# ---------------------------------------------------------------------------
PESO_PRIORIDAD = {
    'EXPRESS': 3.0,
    'ESTANDAR': 1.0,
    'ECONOMICO': 0.5,
}

# ---------------------------------------------------------------------------
# RN-008 - Perecibilidad
# Los perecederos deben entregarse dentro de las primeras 4 horas
# y no pueden compartir vehículo con productos químicos.
# ---------------------------------------------------------------------------
HORAS_MAX_PERECEDERO = 4

TIPOS_INCOMPATIBLES = {
    'PERECEDERO': {'QUIMICO'},
    'QUIMICO': {'PERECEDERO'},
}

# ---------------------------------------------------------------------------
# RN-004 - Jornada máxima y descanso obligatorio (Ley N° 30224)
# Máximo 8 horas por jornada, máximo 4 continuas sin descanso de 1 hora.
# ---------------------------------------------------------------------------
HORAS_MAX_JORNADA = 8.0

HORAS_MAX_CONTINUAS = 4.0

DESCANSO_OBLIGATORIO_HORAS = 1.0

# ---------------------------------------------------------------------------
# RN-012 - Horario operativo
# La operación se restringe a 05:00 - 22:00
# ---------------------------------------------------------------------------
HORA_OPERATIVA_INICIO = 5

HORA_OPERATIVA_FIN = 22

# ---------------------------------------------------------------------------
# RN-015 - Neblina invernal (junio - setiembre), 06:00 - 08:00
# Incrementa el tiempo de los tramos afectados en 15%
# ---------------------------------------------------------------------------
MESES_NEBLINA = {6, 7, 8, 9}

HORA_NEBLINA_INICIO = 6

HORA_NEBLINA_FIN = 8

PENALIZACION_NEBLINA = 0.15

# ---------------------------------------------------------------------------
# RNF-001 / RNF-009 - Rendimiento y precisión
# ---------------------------------------------------------------------------
MAX_PEDIDOS = 150

MAX_VEHICULOS = 15

TIEMPO_MAX_OPTIMIZACION_SEG = 45

TIEMPO_MAX_REOPTIMIZACION_SEG = 30

# Redondeo a 2 decimales (RN-002)
REDONDEO = 2

# ---------------------------------------------------------------------------
# RN-018 - Equivalencia ambiental
# 1 árbol absorbe 22 kg CO2 por año. El DDL define este valor como
# default de compensacion_carbono.factor_captura_arbol_kg, por lo que
# ambos coinciden a proposito.
# ---------------------------------------------------------------------------
KG_CO2_POR_ARBOL_ANIO = 22.0

# Proyectos de reforestación citados en la documentación (RN-018)
PROYECTOS_REFORESTACION = [
    'Lomas de Lima (Lachay, Villa María)',
    'Programa Árboles para Lima - Parque Zonal Huáscar',
]

# ---------------------------------------------------------------------------
# Velocidades de referencia
# Lima: se usa 25 km/h en hora pico (7-9 y 17-20) y 35 km/h en resto.
# ---------------------------------------------------------------------------
VELOCIDAD_HORA_PICO_KMH = 25.0

VELOCIDAD_NORMAL_KMH = 35.0

# Tramos con congestión reportada aplican este factor sobre el tiempo
FACTOR_CONGESTION = {
    'VERDE': 1.0,
    'AMARILLO': 1.35,
    'ROJO': 1.8,
}


def precio_combustible(tipo_combustible, es_gasolina=False):
    """Precio por unidad de combustible.

    El proyecto usa diésel (S/ 17.50/galón) y GNV (S/ 12.50/m³).
    Gasolina y eléctrico no tienen precio documentado: para los gases
    se conserva el coste del diésel, y el eléctrico no se cobra
    combustible (recorrido en 0 litros).
    """
    if tipo_combustible == 'GNV':
        return PRECIO_GNV_POR_M3, 'm3'

    if tipo_combustible == 'ELECTRICO':
        return 0.0, 'ninguno'

    return PRECIO_DIESEL_POR_GALON, 'galon'