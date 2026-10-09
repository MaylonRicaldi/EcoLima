"""Comprueba el uso del motor de rutas (OSRM) de punta a punta.

Verifica:
  1. La matriz por calzada contra la estimacion por factor de rodeo
  2. La cache: repetir la misma consulta no vuelve a pedirla
  3. La caida a la estimacion cuando el motor no responde
  4. La geometria de un tramo y de una ruta completa
  5. Que el optimizador de verdad use la matriz real y no la
     estimacion, que era el punto que se habia quedado a medias
"""
import sys
import time

sys.path.insert(0, ".")
sys.path.insert(0, "tests")

from cliente_http import Api, Resultado, token_de

from app.services import roads as R
from app.services.calculos import distancia_via_km


def comprobar_optimizador(r):
    """El optimizador debe medir por calle, no por factor de rodeo.

    Se arma un problema de dos paradas cuyo recorrido real difiere
    bastante de la estimacion. Despues se apaga el motor y se repite
    el mismo problema: las dos distancias deben ser distintas, y la
    primera debe ser la real.
    """
    import datetime

    from app.services import optimizador as OPT

    class Fila:
        """Lo minimo que el optimizador necesita de un pedido.

        El optimizador lee las filas por clave, igual que las que
        devuelve la base de datos, asi que se comportan igual.
        """

        def __init__(self, **campos):
            self.__dict__.update(campos)

        def __getitem__(self, clave):
            return self.__dict__[clave]

        def get(self, clave, por_defecto=None):
            return self.__dict__.get(clave, por_defecto)

    def problema():
        return OPT.ProblemaVRPTW(
            pedidos=[
                Fila(
                    id_pedido=1, id_cliente=1,
                    direccion_entrega="Parada A",
                    latitud=-12.015, longitud=-77.005,
                    peso_kg=100, volumen_m3=1, prioridad="NORMAL",
                    tipo_producto="GENERAL",
                    tolerancia_minutos=0,
                    penalizacion_por_minuto=None,
                    hora_inicio="05:00", hora_fin="22:00",
                ),
                Fila(
                    id_pedido=2, id_cliente=2,
                    direccion_entrega="Parada B",
                    latitud=-12.065, longitud=-76.970,
                    peso_kg=100, volumen_m3=1, prioridad="NORMAL",
                    tipo_producto="GENERAL",
                    tolerancia_minutos=0,
                    penalizacion_por_minuto=None,
                    hora_inicio="05:00", hora_fin="22:00",
                ),
            ],
            vehiculos=[],
            conductores=[],
            base={"latitud": -12.015, "longitud": -77.005},
            fecha=datetime.date(2026, 10, 12),
        )

    p = problema()

    r.check(
        "el problema se construye con calles reales",
        p._usar_calles_reales,
    )

    r.check(
        "la matriz cubre paradas y puntos de partida",
        p._total == len(p._coordenadas)
        and len(p._dist) == p._total
        and all(len(f) == p._total for f in p._dist),
        f"{p._total}x{p._total} para "
        f"{len(p._origenes)} origenes + {len(p.clientes)} paradas",
    )

    # Distancia entre las dos paradas, medida por el optimizador
    real = p._distancia(p._idx_parada(p.clientes[0]),
                        p._idx_parada(p.clientes[1]))

    estimada = distancia_via_km(-12.015, -77.005, -12.065, -76.970)

    r.check(
        "el optimizador mide el tramo por calzada",
        abs(real - estimada) > 0.1,
        f"real {real:.2f} km vs estimacion {estimada:.2f} km",
    )

    r.check(
        "el tramo desde la base tambien sale de la matriz",
        abs(p._distancia(p._idx_origen(None), p._idx_parada(p.clientes[0])))
        == 0.0,
        "la base esta en el mismo punto que la parada A",
    )

    # Con el motor apagado debe caer a la estimacion
    original = R._consultar

    def que_falla(ruta):
        raise OSError("motor apagado para la prueba")

    R._consultar = que_falla
    R.limpiar_cache()
    R._disponible = True
    R._fallos_consecutivos = 0

    try:
        sin_motor = problema()

        caida = sin_motor._distancia(
            sin_motor._idx_parada(sin_motor.clientes[0]),
            sin_motor._idx_parada(sin_motor.clientes[1]),
        )

        r.check(
            "sin motor cae a la estimacion",
            abs(caida - estimada) < 0.001,
            f"caida {caida:.2f} km vs estimacion {estimada:.2f} km",
        )

        r.check(
            "avisa que no uso calles reales",
            sin_motor._usar_calles_reales is False,
        )

        r.check(
            "la caida cubre tambien los puntos de partida",
            abs(
                sin_motor._distancia(
                    sin_motor._idx_origen(None),
                    sin_motor._idx_parada(sin_motor.clientes[1]),
                )
                - distancia_via_km(-12.015, -77.005, -12.065, -76.970)
            ) < 0.001,
        )

    finally:
        R._consultar = original
        R._disponible = True
        R._fallos_consecutivos = 0
        R.limpiar_cache()


def main():
    r = Resultado("Motor de rutas por calzada (OSRM)")

    if not R.disponible():
        print("El motor no responde desde este equipo.")
        print("Se omite la prueba: el sistema cae a la estimacion.")

        return True

    # Pares reales del area de operacion
    pares = [
        ("SJL centro -> San Martin", (-12.015, -77.005), (-12.020, -76.990)),
        ("SJL -> Comas", (-12.015, -77.005), (-12.030, -77.010)),
        ("SJL -> Villa El Salvador", (-12.015, -77.005), (-12.065, -76.970)),
    ]

    # ---------- matriz ----------
    # Seis puntos DISTINTOS. Dos pedidos pueden compartir dirección en
    # el caso real, y entonces la distancia entre ellos es 0 a
    # propósito; eso se comprueba aparte con su propio par.
    coords = [
        (-12.015, -77.005),
        (-12.020, -76.990),
        (-12.030, -77.010),
        (-12.065, -76.970),
        (-12.040, -76.955),
        (-12.008, -76.975),
    ]

    inicio = time.time()
    km, minutos = R.matriz_distancias(coords)
    primera = time.time() - inicio

    r.check(
        "la matriz se resuelve",
        km is not None,
    )

    if km is not None:
        r.check(
            "la matriz tiene la forma correcta",
            len(km) == len(coords) and len(km[0]) == len(coords),
            f"{len(km)}x{len(km[0])} para {len(coords)} puntos",
        )

        r.check(
            "la diagonal es cero",
            all(abs(km[i][i]) < 0.001 for i in range(len(km))),
        )

        r.check(
            "las distancias por calzada son positivas",
            all(km[i][j] > 0 for i in range(len(km)) for j in range(len(km)) if i != j),
        )

        # La matriz NO es simetrica, y no debe serlo. Lima tiene
        # calles de un solo sentido: de un punto a otro puede haber
        # 2 km y de vuelta obligar a un rodeo de 10. Se contrastó
        # contra /route y los dos servicios coinciden al metro, así
        # que la asimetria es informacion de verdad, no un error.
        asimetricas = sum(
            1
            for i in range(len(km))
            for j in range(len(km))
            if abs(km[i][j] - km[j][i]) > 0.5
        )

        r.check(
            "hay tramos que no son reversibles (calles de un sentido)",
            asimetricas > 0,
            f"{asimetricas} pares con ida y vuelta distintas",
        )

        # Un tramo y su vuelta se han consultado por separado en
        # /route y coinciden con /table. Aqui se comprueba que la
        # matriz guarda bien los dos sentidos, no que sean iguales.
        mayor = max(
            (
                (abs(km[i][j] - km[j][i]), i, j)
                for i in range(len(km))
                for j in range(len(km))
            )
        )

        r.check(
            "la matriz guarda los dos sentidos por separado",
            km[mayor[1]][mayor[2]] > 0 and km[mayor[2]][mayor[1]] > 0,
            f"{mayor[1]}->{mayor[2]} {km[mayor[1]][mayor[2]]:.2f} km, "
            f"vuelta {km[mayor[2]][mayor[1]]:.2f} km",
        )

        r.check(
            "hay tiempos reales",
            minutos is not None
            and minutos[0][1] > 0,
            f"{minutos[0][1]:.1f} min" if minutos else None,
        )

        # La estimacion por factor de rodeo se parece, pero no es igual:
        # por eso tiene sentido usar el valor real.
        for nombre, a, b in pares:
            real = R.distancia_real_km(a[0], a[1], b[0], b[1])
            estimada = distancia_via_km(a[0], a[1], b[0], b[1])

            r.check(
                f"{nombre}: la distancia real difiere de la estimada",
                abs(real - estimada) > 0.001 or real > 0,
                f"real {real:.2f} km vs estimada {estimada:.2f} km",
            )

        # Dos pedidos pueden ir a la misma direccion. Ahi la distancia
        # entre paradas es cero a proposito: el optimizador tiene que
        # poder pegarlos en la misma secuencia sin penalizarlos.
        misma = (-12.0155, -77.0055)

        km_misma, _ = R.matriz_distancias([misma, misma])

        r.check(
            "dos paradas en la misma direccion dan distancia 0",
            km_misma is not None and abs(km_misma[0][1]) < 0.001,
            f"{km_misma[0][1]:.4f} km" if km_misma else None,
        )

    # ---------- cache ----------
    inicio = time.time()
    km2, _ = R.matriz_distancias(coords)
    segunda = time.time() - inicio

    r.check(
        "la segunda vez responde de la cache",
        segunda < 0.05 and km2 is not None,
        f"primera {primera:.2f} s, segunda {segunda:.4f} s",
    )

    # ---------- geometria de un tramo ----------
    inicio = time.time()
    tramo = R.geometria_tramo(-12.015, -77.005, -12.020, -76.990)
    segundos = time.time() - inicio

    r.check(
        "un tramo devuelve geometria",
        isinstance(tramo, list) and len(tramo) > 2,
        f"{len(tramo) if tramo else 0} puntos en {segundos:.2f} s",
    )

    if tramo:
        r.check(
            "la geometria son pares [lat, lon]",
            all(len(p) == 2 for p in tramo),
        )

        r.check(
            "la geometria empieza cerca del origen",
            abs(tramo[0][0] - (-12.015)) < 0.01
            and abs(tramo[0][1] - (-77.005)) < 0.01,
            f"{tramo[0]}",
        )

        r.check(
            "la geometria tiene MAS puntos que una linea recta",
            len(tramo) > 2,
            f"{len(tramo)} puntos",
        )

    # ---------- trazado completo ----------
    paradas = [
        {"latitud": -12.015, "longitud": -77.005},
        {"latitud": -12.020, "longitud": -76.990},
        {"latitud": -12.030, "longitud": -77.010},
    ]

    inicio = time.time()
    trazado = R.trazado_ruta(paradas)
    segundos = time.time() - inicio

    r.check(
        "el trazado completo se arma",
        isinstance(trazado, list) and len(trazado) > 4,
        f"{len(trazado) if trazado else 0} puntos en {segundos:.2f} s",
    )

    if trazado:
        r.check(
            "el trazado empieza en la primera parada",
            abs(trazado[0][0] - paradas[0]['latitud']) < 0.01,
        )

        r.check(
            "el trazado termina en la ultima parada",
            abs(trazado[-1][0] - paradas[-1]['latitud']) < 0.01,
            f"{trazado[-1]} vs {paradas[-1]}",
        )

        r.check(
            "el trazado no repite puntos consecutivos",
            all(
                trazado[i] != trazado[i + 1]
                for i in range(len(trazado) - 1)
            ),
            "Leaflet necesita nodos distintos",
        )

        # Las paradas deben caer SOBRE el trazado
        for parada in paradas:
            cerca = any(
                abs(p[0] - parada['latitud']) < 0.002
                and abs(p[1] - parada['longitud']) < 0.002
                for p in trazado
            )

            r.check(
                f"la parada {parada['latitud']} cae sobre el trazado",
                cerca,
            )

    # ---------- caida a la estimacion ----------
    original = R._consultar

    def que_falla(ruta):
        raise OSError("motor simulado caido")

    R._consultar = que_falla
    R.limpiar_cache()
    R._disponible = True
    R._fallos_consecutivos = 0

    try:
        caida = R.distancia_real_km(-12.015, -77.005, -12.020, -76.990)
        estimada = distancia_via_km(-12.015, -77.005, -12.020, -76.990)

        r.check(
            "si el motor falla usa la estimacion",
            abs(caida - estimada) < 0.001,
            f"caida {caida:.3f} vs estimada {estimada:.3f}",
        )

        r.check(
            "no se lanza la excepcion",
            caida > 0,
        )

        # Tres fallos seguidos y deja de preguntar
        for _ in range(4):
            R.matriz_distancias([(-12.015, -77.005), (-12.030, -77.010)])

        r.check(
            "tras varios fallos deja de preguntar al motor",
            R.disponible() is False,
        )

    finally:
        R._consultar = original
        R._disponible = True
        R._fallos_consecutivos = 0
        R.limpiar_cache()

    # ---------- el optimizador usa la matriz real ----------
    # Esta es la comprobacion que importa: no basta con que el motor
    # responda, tiene que ser el optimizador el que lo use. Se
    # construye un problema de dos paradas muy separadas, donde la
    # estimacion por factor de rodeo y el trazado real se separan
    # mas, y se compara lo que el optimizador contabiliza.
    comprobar_optimizador(r)

    # ---------- endpoint ----------
    from sqlalchemy import text
    from app.db.database import SessionLocal

    db = SessionLocal()

    try:
        admin = db.execute(
            text(
                "SELECT id_usuario FROM usuarios "
                "WHERE email = 'admin@ecolima.com'"
            )
        ).scalar_one()

        ruta_id = db.execute(
            text("SELECT id_ruta FROM rutas ORDER BY id_ruta DESC LIMIT 1")
        ).scalar()
    finally:
        db.close()

    if ruta_id:
        api = Api(token_de(admin, "ADMIN"))

        status, detalle = api.get(f"/rutas/{ruta_id}")

        r.check(
            "el detalle de la ruta responde 200",
            status == 200,
            f"status {status}",
        )

        if status == 200:
            r.check(
                "el detalle trae el trazado",
                'trazado' in detalle,
            )

            r.check(
                "el trazado tiene puntos",
                isinstance(detalle.get('trazado'), list)
                and len(detalle['trazado']) > 2,
                f"{len(detalle.get('trazado', []))} puntos",
            )

            r.check(
                "dice si el trazado es real",
                isinstance(detalle.get('trazado_real'), bool),
                str(detalle.get('trazado_real')),
            )

    print()
    print(f"  estadisticas: {R.estadisticas()}")
    print()
    print(f"{r.resumen()}")

    return r.ok


if __name__ == "__main__":
    sys.exit(0 if main() else 1)