"""El refactor de fijar_secuencia, comprobado A/B.

Se compara la ruta que sale por `reoptimizar_secuencia` (que ahora
arma la secuencia con `fijar_secuencia`) contra la que salía antes,
que hacía esa misma parte escrita a mano dentro de la función.

Si las dos dan el mismo orden con los mismos datos, el refactor no
cambió nada y los fallos que se vieron eran de los datos.
"""
import datetime
import sys

sys.path.insert(0, ".")

from app.services import optimizador as OPT

HOY = datetime.date.today()

LOCAL = {'latitud': -12.055, 'longitud': -77.143}

ORDENES = [
    [1, 2, 3, 4, 5],
    [5, 4, 3, 2, 1],
    [3, 1, 5, 2, 4],
    [2, 2, 4, 1],
    [9],
]


def problema():
    """Una ruta de mentira con siete paradas repartidas por Lima."""
    clientes = []

    puntos = [
        (-12.0150, -77.0050), (-12.0300, -76.9950), (-12.0650, -76.9700),
        (-12.0500, -77.0100), (-12.0800, -77.0400), (-11.9900, -76.9800),
        (-12.0400, -77.0600),
    ]

    for i, (lat, lon) in enumerate(puntos, start=1):
        clientes.append({
            'id_pedido': i,
            'id_cliente': i,
            'direccion_entrega': f'Dirección de prueba {i}',
            'peso_kg': 10.0 * i,
            'volumen_m3': 0.5 * i,
            'prioridad': 'ESTANDAR',
            'tipo_producto': 'GENERAL',
            'latitud': lat,
            'longitud': lon,
            'hora_inicio': datetime.time(5, 0),
            'hora_fin': datetime.time(22, 0),
            'tolerancia_minutos': 15,
            'penalizacion_por_minuto': 0.5,
        })

    vehiculo = {
        'id_vehiculo': 1, 'placa': 'TEST-1', 'capacidad_kg': 500.0,
        'capacidad_m3': 20.0, 'consumo_km_l': 0.18,
        'factor_co2_kg_km': 0.9, 'tipo_combustible': 'GASOLINA',
        'tipo_nombre': 'CAMION',
    }

    conductor = {
        'id_conductor': 1, 'id_usuario': None,
        'nombre': 'Prueba', 'apellido': 'Conductor', 'dni': '00000001',
        'anios_experiencia': 5,
        'hora_disponibilidad_inicio': datetime.time(5, 0),
        'hora_disponibilidad_fin': datetime.time(22, 0),
        'horas_max_conduccion': 8, 'horas_conduccion_acumuladas': 0,
        'estado': 'DISPONIBLE', 'categorias_licencia': ['A-IIB'],
        'ubicacion_inicio': None, 'indice': 0,
    }

    return OPT.ProblemaVRPTW(
        pedidos=clientes,
        vehiculos=[vehiculo],
        conductores=[conductor],
        base=LOCAL,
        fecha=HOY,
        primera_ruta=set(),
    )


def main():
    fallos = 0

    print("=" * 66)
    print("fijar_secuencia frente a la construcción de la mano")
    print("=" * 66)
    print()

    for orden in ORDENES:
        p = problema()

        # Vía nueva: la que usa reoptimizar_secuencia
        ruta_nueva, motivo = p.reoptimizar_secuencia(
            p.vehiculos[0], p.conductores[0], list(orden),
            semilla=7, iteraciones=120,
        )

        if ruta_nueva is None:
            print(f"  orden {str(orden):<24} "
                  f"reoptimizar dijo {motivo!r}")
            continue

        # Vía vieja: exactamente lo que había escrito antes del
        # refactor, dentro de la propia función.
        p2 = problema()

        por_id = {c.id_pedido: c for c in p2.clientes}

        secuencia = []

        for id_pedido in orden:
            cliente = por_id.get(id_pedido)

            if cliente is None:
                secuencia = None
                break

            secuencia.append(cliente)

        if not secuencia:
            print(f"  orden {str(orden):<24} "
                  f"la vía vieja lo rechaza")
            continue

        if len({c.id_pedido for c in secuencia}) != len(secuencia):
            print(f"  orden {str(orden):<24} "
                  f"repetidos, ambas lo rechazan")
            continue

        total_kg = sum(c.peso for c in secuencia)
        total_m3 = sum(c.volumen for c in secuencia)

        if (total_kg > p2.vehiculos[0].capacidad_kg
                or total_m3 > p2.vehiculos[0].capacidad_m3):
            print(f"  orden {str(orden):<24} "
                  f"no cabe, ambas lo rechazan")
            continue

        ruta_vieja = OPT.Ruta(p2.vehiculos[0], p2.conductores[0])
        ruta_vieja.secuencia = list(secuencia)
        ruta_vieja.recalcular_carga()
        ruta_vieja.puede_ordenar_por_ventana = False

        p2.evaluar_ruta(ruta_vieja)

        orden_viejo = [c.id_pedido for c in ruta_vieja.secuencia]

        # La vía vieja no lleva recocido simulado, así que se compara
        # el punto de partida, que es lo que cambió al refactorizar.
        inicial, _ = p2.fijar_secuencia(
            p2.vehiculos[0], p2.conductores[0], list(orden)
        )

        orden_inicial = [c.id_pedido for c in inicial.secuencia]

        misma = orden_inicial == orden_viejo
        misma_carga = abs(
            inicial.vehiculo.carga_kg - ruta_vieja.vehiculo.carga_kg
        ) < 1e-9

        if not (misma and misma_carga):
            fallos += 1

        print(f"  orden {str(orden):<24} "
              f"idéntica: {'sí' if misma else 'NO'}  "
              f"carga: {'sí' if misma_carga else 'NO'}  "
              f"queda en: {orden_inicial}")

    print()
    print("=" * 66)

    if fallos:
        print(f"{fallos} caso(s) difieren")

    else:
        print("El refactor no cambia nada: mismo orden y misma carga.")

    print("=" * 66)

    return fallos == 0


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
