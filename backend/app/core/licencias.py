"""Habilitación de conductores por tipo de vehículo.

La base no relaciona la licencia con el vehículo: `licencias` guarda
la categoría y `vehiculos` guarda el tipo, en tablas distintas y sin
tabla puente. Aquí se resuelve el cruce con la clasificación del
Ministerio de Transportes y Comunicaciones, que separa los brevetes
en dos clases que NUNCA se cruzan:

  CLASE A - autos, camionetas, camiones y buses
    A-I      Autos particulares (sedán, hatchback, SUV, pick-up).
             No habilita transporte público ni comercial.
    A-IIA    Lo mismo que A-I más transporte público de pasajeros
             (taxis, ambulancias, turístico).
    A-IIB    Lo anterior más combis, microbuses y camiones
             pequeños.
    A-IIIa   Buses interprovinciales, colectivos urbanos y
             articulados.
    A-IIIb   Carga pesada: camiones grandes, volquetes, trailers.
    A-IIIc   La máxima: todo lo anterior.

  CLASE B - motos y mototaxis
    B-I      Vehículos no motorizados o de muy baja cilindrada
             (motos eléctricas limitadas).
    B-IIA    Bicimotos y motos adaptadas para transporte de
             mercancías.
    B-IIB    Motos lineales de dos ruedas, particulares o de
             delivery. Es la que necesita este proyecto.
    B-IIC    Mototaxis y trimotos de tres ruedas.

Punto clave: dentro de una clase, la categoría superior habilita a
las inferiores. ENTRE clases no hay equivalencia. Un brevete A-I es
de auto, no de moto: manejar una moto con él es una infracción
sancionada con multa por conducir un vehículo para el que no se está
habilitado.

Además la licencia debe estar VIGENTE y no vencida; eso lo filtra el
backend al leer los conductores.

Los tipos salen de la tabla `tipos_vehiculo`. Si se agrega un tipo
nuevo, el código lo marca como pendiente de definir en vez de
suponer que cualquiera puede manejarlo.
"""

# Clase a la que pertenece cada categoría.
CLASE = {
    'A-I': 'A',
    'A-IIA': 'A',
    'A-IIB': 'A',
    'A-IIIA': 'A',
    'A-IIIB': 'A',
    'A-IIIC': 'A',
    'B-I': 'B',
    'B-IIA': 'B',
    'B-IIB': 'B',
    'B-IIC': 'B',
}

# Orden dentro de cada clase, de menor a mayor habilitación.
ORDEN = {
    'A-I': 1,
    'A-IIA': 2,
    'A-IIB': 3,
    'A-IIIA': 4,
    'A-IIIB': 5,
    'A-IIIC': 6,
    'B-I': 1,
    'B-IIA': 2,
    'B-IIB': 3,
    'B-IIC': 4,
}

# Etiquetas para la interfaz y los mensajes.
DESCRIPCION = {
    'A-I': 'A-I · autos particulares',
    'A-IIA': 'A-IIa · autos y transporte público de pasajeros',
    'A-IIB': 'A-IIb · combis, microbuses y camiones pequeños',
    'A-IIIA': 'A-IIIa · buses interprovinciales y articulados',
    'A-IIIB': 'A-IIIb · carga pesada, trailers y plataformas',
    'A-IIIC': 'A-IIIc · máxima categoría de la clase A',
    'B-I': 'B-I · vehículos no motorizados o baja cilindrada',
    'B-IIA': 'B-IIa · bicimotos y motos de reparto adaptadas',
    'B-IIB': 'B-IIb · motos lineales de dos ruedas (delivery)',
    'B-IIC': 'B-IIc · mototaxis y trimotos de tres ruedas',
}

# Tipo de vehículo -> clase de licencia que lo habilita.
#
# La base guarda el tipo en `tipos_vehiculo` y no tiene peso bruto,
# así que no se puede separar el furgón liviano del pesado: ambos
# quedan en clase A, que es lo que corresponde a este tipo de flota.
CLASE_REQUERIDA = {
    'MOTO': 'B',
    'CAMIONETA': 'A',
    'FURGON': 'A',
}

# Categoría mínima, sólo para redactar el mensaje al conductor.
CATEGORIA_MINIMA = {
    'MOTO': 'B-IIB',
    'CAMIONETA': 'A-I',
    'FURGON': 'A-I',
}

# Tipo de vehículo cuyo requisito no está definido en el catálogo.
SIN_REQUISITO = 'SIN DEFINIR'


def _tipo(tipo_vehiculo):
    if not tipo_vehiculo:
        return None

    return str(tipo_vehiculo).strip().upper()


def _categorias_de(clase):
    """Categorías que pertenecen a una clase, de menor a mayor."""
    return sorted(
        (c for c, cl in CLASE.items() if cl == clase),
        key=lambda c: ORDEN[c],
    )


def es_valida(categoria):
    return categoria in CLASE


def nombre_oficial(categoria):
    """Categoría como la escribe el MTC: 'A-IIb', 'B-IIb'.

    En la base se guarda en mayúsculas ('A-IIB') para que el CHECK sea
    simple, pero el mensaje que lee el usuario debe llevar la forma
    oficial, que es la que aparece en el desplegable del formulario.
    """
    texto = DESCRIPCION.get(categoria, categoria)

    return texto.split('·')[0].strip()


def clase_de(categoria):
    return CLASE.get(categoria)


def habilita_categoria(tipo_vehiculo, categoria_licencia):
    """True si esa categoría concreta habilita ese tipo de vehículo.

    Sólo compara dentro de la misma clase: una categoría de clase A
    nunca habilita un vehículo que exige clase B.
    """
    tipo = _tipo(tipo_vehiculo)

    if tipo is None or categoria_licencia not in CLASE:
        return False

    requerida = CLASE_REQUERIDA.get(tipo)

    if requerida is None:
        return False

    if CLASE[categoria_licencia] != requerida:
        return False

    return ORDEN[categoria_licencia] >= ORDEN[CATEGORIA_MINIMA[tipo]]


def habilitado(categoria_licencia, tipo_vehiculo):
    """True si la licencia habilita a manejar ese tipo de vehículo."""
    return habilita_categoria(tipo_vehiculo, categoria_licencia)


def habilita_alguno(categorias_licencia, tipo_vehiculo):
    """True si al menos una de las licencias habilita el vehículo."""
    return any(
        habilitado(categoria, tipo_vehiculo)
        for categoria in (categorias_licencia or [])
    )


def motivo_bloqueo(categoria_licencia, tipo_vehiculo):
    """Explicación en lenguaje llano de por qué no puede manejar.

    Es el mismo texto que muestra la pantalla de conductores.
    """
    tipo = _tipo(tipo_vehiculo)

    if categoria_licencia not in CLASE:
        return 'No tiene licencia registrada'

    if tipo is None:
        return 'El vehículo no tiene tipo asignado'

    if tipo not in CLASE_REQUERIDA:
        return (
            f'No hay requisito de licencia definido para el tipo '
            f'de vehículo {tipo}'
        )

    requerida = CLASE_REQUERIDA[tipo]

    if habilita_categoria(tipo, categoria_licencia):
        return ''

    minima = CATEGORIA_MINIMA[tipo]

    # Un brevete de la otra clase: es el caso que más importa dejar
    # claro, porque se podría pensar que "todo brevete sirve".
    if CLASE[categoria_licencia] != requerida:
        tiene = nombre_oficial(categoria_licencia)
        necesita = nombre_oficial(minima)

        para_que = (
            "autos y camiones"
            if CLASE[categoria_licencia] == 'A'
            else "motos y mototaxis"
        )

        return (
            f'Una licencia {tiene} no sirve para un {tipo}: los '
            f'brevetes de esa clase habilitan para {para_que} y un '
            f'{tipo} necesita {necesita}'
        )

    if ORDEN[categoria_licencia] > ORDEN[minima]:
        return (
            f'No habilita para manejar un {tipo}: se necesita '
            f'{nombre_oficial(minima)} o una categoría menor'
        )

    return (
        f'Necesita licencia {nombre_oficial(minima)} para manejar '
        f'un {tipo} y tiene {nombre_oficial(categoria_licencia)}'
    )


def mejor_categoria(licencias):
    """De varias licencias, la de mayor habilitación dentro de su clase.

    Un conductor puede tener más de una licencia vigente. Para
    limitarlo a un tipo de vehículo basta con la más alta de la clase
    que corresponda a ese vehículo.
    """
    validas = [c for c in (licencias or []) if c in CLASE]

    if not validas:
        return None

    return max(validas, key=lambda c: ORDEN[c])


def mejor_categoria_para(licencias, tipo_vehiculo):
    """Como mejor_categoria, pero sólo de la clase que exige el vehículo."""
    tipo = _tipo(tipo_vehiculo)

    if tipo is None:
        return mejor_categoria(licencias)

    requerida = CLASE_REQUERIDA.get(tipo)

    if requerida is None:
        return mejor_categoria(licencias)

    validas = [
        c for c in (licencias or [])
        if c in CLASE and CLASE[c] == requerida
    ]

    if not validas:
        return None

    return max(validas, key=lambda c: ORDEN[c])