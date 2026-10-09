"""Distancias y trazados reales por calzada (motor OSRM).

El sistema antes estimaba el recorrido de calle multiplicando la
distancia en línea recta por un factor fijo. Medido contra OSRM sobre
seis tramos del área de operación, ese factor.erraba entre 3% y 17%
(error medio 8.8%), porque un multiplicador constante no puede
seguir los giros, los puentes ni las calles en U.

Este módulo consulta OSRM, que calcula el camino real sobre un grafo
de calles. Devuelve:

  - la distancia por calzada, en km
  - la duración real del tramo, en minutos
  - la geometría del camino, para dibujarla sobre el mapa

Dos servicios del motor:

  /table/v1/driving   matriz completa de distancias y tiempos en una
                      sola petición. Es lo que usa el optimizador.
  /route/v1/driving   un tramo con su geometría. Es lo que usa el mapa.

Diseño importante: si el motor no responde, el sistema NO se rompe.
Cae a la estimación anterior y sigue funcionando. Eso importa porque
la presentación del proyecto no puede depender de un servicio de
internet.

Rendimiento: el servidor público responde en ~0.45 s la matriz y
~0.40 s cada tramo. Una matriz de 150 paradas son 22.500 pares, así
que consultarlos uno a uno sería de 2.5 horas. Por eso:

  - la matriz se pide de una sola vez, troceada si hace falta
  - todo se guarda en caché, de modo que repetir la optimización con
    los mismos pedidos no vuelve a preguntar nada
"""
import json
import threading
import urllib.error
import urllib.request

from app.services import calculos as C

OSRM_BASE = "http://router.project-osrm.org"

# El servidor público no acepta demasiadas coordenadas de una vez.
MAX_COORDENADAS_POR_LOTE = 80

TIEMPO_LIMITE = 25  # segundos


# ---------------------------------------------------------------------------
# Estado del servicio
# ---------------------------------------------------------------------------

_candado = threading.Lock()

# Si el motor falla varias veces seguidas se deja de preguntar y se
# usa la estimación, para no ralentizar cada optimización con un
# tiempo de espera.
_fallos_consecutivos = 0
_FALLOS_ANTES_DE_RENDIRSE = 3

_matrices: dict = {}
_tramos: dict = {}

_disponible = True


def disponible() -> bool:
    """True si el motor se está usando."""
    with _candero():
        return _disponible


def estadisticas():
    """Para diagnóstico y para mostrarlo en la interfaz."""
    with _candero():
        return {
            'disponible': _disponible,
            'fallos_consecutivos': _fallos_consecutivos,
            'matrices_en_cache': len(_matrices),
            'tramos_en_cache': len(_tramos),
        }


def limpiar_cache():
    with _candero():
        _matrices.clear()
        _tramos.clear()


def _candero():
    return _candado


def _anotar_fallo():
    global _fallos_consecutivos, _disponible

    with _candero():
        _fallos_consecutivos += 1

        if _fallos_consecutivos >= _FALLOS_ANTES_DE_RENDIRSE:
            _disponible = False


def _anotar_exito():
    global _fallos_consecutivos

    with _candero():
        _fallos_consecutivos = 0


def _consultar(ruta):
    url = OSRM_BASE + ruta

    peticion = urllib.request.Request(
        url,
        headers={'User-Agent': 'EcoLogisticaLima/1.0'},
    )

    with urllib.request.urlopen(peticion, timeout=TIEMPO_LIMITE) as r:
        return json.loads(r.read())


# ---------------------------------------------------------------------------
# Matriz de distancias
# ---------------------------------------------------------------------------

def _clave(coords):
    """Clave de caché: coordenadas redondeadas a 5 decimales.

    Cinco decimales son unos 1 metros, suficiente para no mezclar
    paradas distintas pero tolerante al redondeo del motor.
    """
    return tuple((round(lat, 5), round(lon, 5)) for lat, lon in coords)


def _trocear(coords):
    """Divide la lista de coordenadas en lotes que OSRM acepte."""
    for inicio in range(0, len(coords), MAX_COORDENADAS_POR_LOTE):
        yield coords[inicio:inicio + MAX_COORDENADAS_POR_LOTE]


def _pedir_bloque(coords):
    """Matriz de un bloque de coordenadas (km y minutos)."""
    camino = ";".join(f"{lon},{lat}" for lat, lon in coords)

    datos = _consultar(
        f"/table/v1/driving/{camino}"
        f"?annotations=distance,duration"
    )

    distancias = datos.get("distances")
    duraciones = datos.get("durations")

    n = len(coords)

    km = [[0.0] * n for _ in range(n)]
    minutos = [[0.0] * n for _ in range(n)]

    for i in range(n):
        for j in range(n):
            metros = None
            if distancias and i < len(distancias):
                fila = distancias[i]
                if j < len(fila):
                    metros = fila[j]

            segundos = None
            if duraciones and i < len(duraciones):
                fila = duraciones[i]
                if j < len(fila):
                    segundos = fila[j]

            # OSRM devuelve null cuando no hay camino posible
            if metros is None:
                continue

            km[i][j] = metros / 1000.0
            minutos[i][j] = (segundos or 0) / 60.0

    return km, minutos


def matriz_distancias(coords):
    """Matriz de distancias por calzada y de tiempos reales.

    coords: lista de (latitud, longitud).

    Devuelve (matriz_km, matriz_minutos). Si el motor no está
    disponible devuelve None y quien llama usa la estimación.
    """
    coords = list(coords)

    n = len(coords)

    if n < 2:
        return None, None

    clave = _clave(coords)

    with _candero():
        if clave in _matrices:
            return _matrices[clave]

    if not disponible():
        return None, None

    km = [[0.0] * n for _ in range(n)]
    minutos = [[0.0] * n for _ in range(n)]

    try:
        bloques = list(_trocear(coords))

        for numero, bloque in enumerate(bloques):
            km_bloque, min_bloque = _pedir_bloque(bloque)

            base = numero * MAX_COORDENADAS_POR_LOTE

            for i in range(len(bloque)):
                for j in range(len(bloque)):
                    km[base + i][base + j] = km_bloque[i][j]
                    minutos[base + i][base + j] = min_bloque[i][j]

        _anotar_exito()

    except (urllib.error.URLError, OSError, ValueError, KeyError) as err:
        _anotar_fallo()

        print(f"[roads] motor no disponible: {err}")

        return None, None

    # OSRM devuelve null cuando no existe camino entre dos puntos.
    # Dejarlo en 0 haría creer al optimizador que ambas paradas
    # están en el mismo sitio, así que esas celdas caen a la
    # estimación y se cuentan para poder avisar.
    nulos = 0

    for i in range(n):
        for j in range(n):
            if i != j and km[i][j] <= 0:
                nulos += 1
                km[i][j] = C.distancia_via_km(
                    coords[i][0], coords[i][1],
                    coords[j][0], coords[j][1],
                )
                minutos[i][j] = 0.0

    if nulos:
        print(
            f"[roads] {nulos} pares sin camino en el grafo de calles; "
            f"se uso la estimacion para ellos"
        )

    resultado = (km, minutos)

    with _candero():
        _matrices[clave] = resultado

    return resultado


# ---------------------------------------------------------------------------
# Geometría de un tramo
# ---------------------------------------------------------------------------

def geometria_tramo(lat1, lon1, lat2, lon2):
    """Geometría de un tramo, como lista de [latitud, longitud].

    Devuelve None si el motor no está disponible.
    """
    clave = (
        round(lat1, 5), round(lon1, 5),
        round(lat2, 5), round(lon2, 5),
    )

    with _candero():
        if clave in _tramos:
            return _tramos[clave]

    if not disponible():
        return None

    try:
        datos = _consultar(
            f"/route/v1/driving/{lon1},{lat1};{lon2},{lat2}"
            f"?overview=full&geometries=geojson"
        )

        rutas = datos.get("routes") or []

        if not rutas:
            return None

        coordenadas = rutas[0]["geometry"]["coordinates"]

        # OSRM devuelve [lon, lat]; Leaflet espera [lat, lon]
        puntos = [
            [c[1], c[0]] for c in coordenadas if len(c) >= 2
        ]

        _anotar_exito()

    except (urllib.error.URLError, OSError, ValueError, KeyError) as err:
        _anotar_fallo()

        print(f"[roads] geometria no disponible: {err}")

        return None

    with _candero():
        _tramos[clave] = puntos

    return puntos


def trazado_ruta(paradas):
    """Geometría completa de una ruta, concatenando sus tramos.

    paradas: lista de dicts con 'latitud' y 'longitud', ya en orden
    de visita.

    Si un tramo falla, se une ese tramo en línea recta para que la
    ruta se vea completa aunque el motor falle en un punto.
    """
    puntos = [
        (float(p['latitud']), float(p['longitud'])) for p in paradas
    ]

    if len(puntos) < 2:
        return [list(p) for p in puntos]

    completa = []

    for i in range(len(puntos) - 1):
        lat1, lon1 = puntos[i]
        lat2, lon2 = puntos[i + 1]

        tramo = geometria_tramo(lat1, lon1, lat2, lon2)

        if tramo:
            # Se omite el primer punto del tramo: ya es el ultimo
            # del anterior y duplicarlo rompe los nodos de Leaflet.
            completa.extend(tramo[1:] if completa else tramo)
        else:
            completa.append([lat1, lon1])
            completa.append([lat2, lon2])

    if completa and completa[-1] != [puntos[-1][0], puntos[-1][1]]:
        completa.append([puntos[-1][0], puntos[-1][1]])

    return completa


def distancia_real_km(lat1, lon1, lat2, lon2):
    """Distancia por calzada de un solo tramo, en km.

    Cae a la estimación si el motor no responde.
    """
    km, _ = matriz_distancias([(lat1, lon1), (lat2, lon2)])

    if km is None:
        return C.distancia_via_km(lat1, lon1, lat2, lon2)

    valor = km[0][1]

    if valor <= 0:
        return C.distancia_via_km(lat1, lon1, lat2, lon2)

    return valor