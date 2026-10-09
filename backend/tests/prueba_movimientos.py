"""Comprueba que deshacer un movimiento devuelve la ruta intacta.

El recocido simulado depende de esto: si al rechazar un movimiento la
ruta no vuelve exactamente como estaba, el resultado depende del
azar y el optimizador devuelve rutas invalidas.
"""
import datetime
import random
import sys

sys.path.insert(0, ".")
sys.path.insert(0, "tests")

from cliente_http import Resultado

from app.services import optimizador as OPT


class Fila(dict):
    """Fila subscriptable, como las que devuelve la base de datos."""


def problema(n=8):
    puntos = [
        (-12.015, -77.005),
        (-12.045, -77.020),
        (-12.030, -76.995),
        (-12.060, -76.980),
        (-12.012, -76.940),
        (-12.025, -77.030),
        (-12.050, -76.960),
        (-12.008, -77.050),
    ][:n]

    pedidos = []

    for i, (lat, lon) in enumerate(puntos):
        pedidos.append(Fila(
            id_pedido=i + 1,
            id_cliente=1,
            direccion_entrega=f"Parada {i + 1}",
            latitud=lat,
            longitud=lon,
            peso_kg=50,
            volumen_m3=0.4,
            prioridad="ESTANDAR",
            tipo_producto="NO_PERECEDERO",
            tolerancia_minutos=0,
            penalizacion_por_minuto=None,
            hora_inicio="05:00",
            hora_fin="22:00",
        ))

    vehiculo = Fila(
        id_vehiculo=1,
        placa="ABC-257",
        capacidad_kg=5000,
        capacidad_m3=20,
        consumo_km_l=12,
        factor_co2_kg_km=0.9,
        tipo_combustible="GNV",
        costo_adquisicion=90000,
        costo_soat_anual=1500,
        costo_seguro_anual=3500,
        depreciacion_anual=8000,
        estado="ACTIVO",
        tipo_nombre="CAMIONETA",
    )

    conductor = Fila(
        id_conductor=1,
        id_usuario=1,
        nombre="Lucia",
        apellido="Quispe",
        hora_disponibilidad_inicio="05:00",
        hora_disponibilidad_fin="22:00",
        horas_max_conduccion=8,
        horas_conduccion_acumuladas=0,
        ubicacion_inicio=None,
        estado="DISPONIBLE",
        categorias_licencia=["A-IIB"],
    )

    return OPT.ProblemaVRPTW(
        pedidos=pedidos,
        vehiculos=[vehiculo],
        conductores=[conductor],
        base={"latitud": -12.015, "longitud": -77.005},
        fecha=datetime.date(2026, 10, 12),
    )


def main():
    r = Resultado("Los movimientos se deshacen sin deformar la ruta")

    p = problema()

    # Las rutas de prueba llegan ya ordenadas por ventana de tiempo,
    # que es como las deja el sistema. El recocido tiene que poder
    # desatarse de ese orden para buscar uno mejor.
    def ruta_lista():
        ruta = OPT.Ruta(p.vehiculos[0], p.conductores[0])
        ruta.secuencia = list(p.clientes)
        ruta.recalcular_carga()
        p.evaluar_ruta(ruta)
        ruta.puede_ordenar_por_ventana = False

        return ruta

    r.check(
        "el problema tiene varias paradas reordenables",
        len(p.clientes) >= 3,
        f"{len(p.clientes)} paradas",
    )

    # Distintos ordenes tienen que dar costes distintos. Si todos
    # dieran lo mismo, el optimizador no estaría distinguiendo entre
    # ellos y la reoptimización no serviría para nada.
    base = ruta_lista()

    permutado = OPT.Ruta(p.vehiculos[0], p.conductores[0])
    permutado.secuencia = list(reversed(p.clientes))
    permutado.recalcular_carga()
    permutado.puede_ordenar_por_ventana = False

    p.evaluar_ruta(permutado)

    r.check(
        "reordenar las paradas cambia el coste",
        abs(
            p.costo_ruta(permutado) - p.costo_ruta(base)
        ) > 0.01,
        f"orden base {p.costo_ruta(base):.2f} vs "
        f"invertido {p.costo_ruta(permutado):.2f}",
    )

    r.check(
        "y cambia la distancia recorrida",
        abs(
            permutado.distancia_km - base.distancia_km
        ) > 0.01,
        f"{base.distancia_km:.2f} km vs {permutado.distancia_km:.2f} km",
    )

    # Y la reoptimización tiene que encontrar algo mejor que el orden
    # en que se le da, partiendo de un orden malo a propósito.
    optimo, motivo = p.reoptimizar_secuencia(
        p.vehiculos[0], p.conductores[0],
        [c.id_pedido for c in reversed(p.clientes)],
        iteraciones=500,
    )

    r.check(
        "la reoptimización devuelve un resultado",
        optimo is not None and motivo is None,
        motivo or f"{len(optimo.secuencia)} paradas",
    )

    if optimo is not None:
        peor = ruta_lista()

        optimo_copia = OPT.Ruta(p.vehiculos[0], p.conductores[0])
        optimo_copia.secuencia = list(optimo.secuencia)
        optimo_copia.recalcular_carga()
        optimo_copia.puede_ordenar_por_ventana = False

        p.evaluar_ruta(optimo_copia)

        r.check(
            "la reoptimización mejora el orden que recibe",
            p.costo_ruta(optimo_copia) <= p.costo_ruta(peor),
            f"partiendo de {p.costo_ruta(peor):.2f} "
            f"llega a {p.costo_ruta(optimo_copia):.2f}",
        )

        r.check(
            "sin cambiar de vehículo ni de conductor",
            optimo_copia.vehiculo is p.vehiculos[0]
            and optimo_copia.conductor is p.conductores[0],
        )

        r.check(
            "conserva todos los pedidos",
            sorted(
                c.id_pedido for c in optimo_copia.secuencia
            ) == sorted(c.id_pedido for c in p.clientes),
        )

    rng = random.Random(7)

    fallos = 0
    probados = 0

    for intento in range(3000):
        ruta = OPT.Ruta(p.vehiculos[0], p.conductores[0])
        ruta.secuencia = list(p.clientes)
        ruta.recalcular_carga()

        antes_ids = [c.id_pedido for c in ruta.secuencia]

        movimiento = p._vecino_interno(ruta, rng)

        if movimiento is None:
            continue

        probados += 1

        _, (cual, _) = movimiento

        # El movimiento ya está aplicado sobre la ruta. Deshacerlo
        # tiene que devolver la secuencia exacta que había antes.
        p._rehacer([ruta], movimiento)

        despues_ids = [c.id_pedido for c in ruta.secuencia]

        if despues_ids != antes_ids:
            fallos += 1

            if fallos <= 3:
                print(f"    fallo en {cual[0]}:")
                print(f"      antes   {antes_ids}")
                print(f"      despues {despues_ids}")

            continue

        # La carga del vehículo también tiene que volver
        carga_kg = sum(c.peso for c in ruta.secuencia)

        if abs(ruta.vehiculo.carga_kg - carga_kg) > 0.01:
            fallos += 1

            if fallos <= 6:
                print(
                    f"    carga descuadrada: vehiculo "
                    f"{ruta.vehiculo.carga_kg:.1f} vs "
                    f"suma {carga_kg:.1f}"
                )

    r.check(
        "deshacer un movimiento devuelve la secuencia exacta",
        fallos == 0,
        f"{probados} movimientos probados, {fallos} con fallo",
    )

    # Un ciclo completo de mover y deshacer, repetido
    ruta = OPT.Ruta(p.vehiculos[0], p.conductores[0])
    ruta.secuencia = list(p.clientes)
    ruta.recalcular_carga()

    antes = [c.id_pedido for c in ruta.secuencia]

    for _ in range(200):
        mov = p._vecino_interno(ruta, rng)

        if mov is not None:
            p._rehacer([ruta], mov)

    r.check(
        "200 ciclos de mover y deshacer dejan la ruta intacta",
        [c.id_pedido for c in ruta.secuencia] == antes,
        f"{antes}",
    )

    # Un movimiento aceptado sí tiene que cambiar la secuencia: si
    # tampoco lo hiciera, el optimizador no estaría buscando nada.
    ruta.secuencia = list(p.clientes)
    ruta.recalcular_carga()

    cambios = 0

    for _ in range(300):
        antes_ciclo = [c.id_pedido for c in ruta.secuencia]

        mov = p._vecino_interno(ruta, rng)

        if mov is None:
            continue

        if [c.id_pedido for c in ruta.secuencia] != antes_ciclo:
            cambios += 1

        p._rehacer([ruta], mov)

    r.check(
        "los movimientos aceptados cambian la secuencia",
        cambios > 200,
        f"{cambios} de 300 movimientos reordenaron algo",
    )

    # La ruta sigue siendo válida para el optimizador
    p.evaluar_ruta(ruta)

    r.check(
        "la ruta se sigue evaluando bien",
        ruta.distancia_km > 0 and ruta.minutos > 0,
        f"{ruta.distancia_km:.2f} km, {ruta.minutos:.0f} min",
    )

    print()
    print(f"{r.resumen()}")

    return r.ok


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
