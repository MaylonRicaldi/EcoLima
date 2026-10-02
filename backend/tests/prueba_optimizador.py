"""Prueba del optimizador HU-06 con datos sintéticos.

No toca la base de datos: valida las restricciones y los cálculos
(RN-003 a RN-009, RN-018) contra casos conocidos.

Uso: python tests/prueba_optimizador.py   (desde backend/)
"""
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from app.core import parametros as P
from app.services import calculos as C
from app.services.optimizador import ProblemaVRPTW, MTC_NO_CIRCULA

BASE = {"latitud": -12.015, "longitud": -77.005}


def pedido(n, lat, lon, peso, vol, prioridad="ESTANDAR",
           tipo="NO_PERECEDERO", hi=8, hf=12):
    return {
        "id_pedido": n,
        "id_cliente": 1,
        "direccion_entrega": f"Direccion {n}",
        "latitud": lat,
        "longitud": lon,
        "peso_kg": peso,
        "volumen_m3": vol,
        "prioridad": prioridad,
        "tipo_producto": tipo,
        "hora_inicio": datetime.time(hi, 0),
        "hora_fin": datetime.time(hf, 0),
        "tolerancia_minutos": 15,
        "penalizacion_por_minuto": 0.50,
    }


def vehiculo(n, placa, kg, m3, consumo=10.0, co2=0.9):
    return {
        "id_vehiculo": n,
        "placa": placa,
        "capacidad_kg": kg,
        "capacidad_m3": m3,
        "consumo_km_l": consumo,
        "factor_co2_kg_km": co2,
        "tipo_combustible": "DIESEL",
        "costo_adquisicion": 50000.0,
        "costo_soat_anual": 500.0,
        "costo_seguro_anual": 1500.0,
    }


def conductor(n, ubicacion=None):
    return {
        "id_conductor": n,
        "id_usuario": n,
        "nombre": f"Cond{n}",
        "apellido": "Test",
        "dni": "12345678",
        "anios_experiencia": 5,
        "hora_disponibilidad_inicio": datetime.time(6, 0),
        "hora_disponibilidad_fin": datetime.time(20, 0),
        "horas_max_conduccion": 8.0,
        "horas_conduccion_acumuladas": 0.0,
        "ubicacion_inicio": ubicacion,
    }


def main():
    fallos = []
    ok = 0

    def check(nombre, cond, detalle=""):
        nonlocal ok
        if cond:
            ok += 1
            print(f"  [OK  ] {nombre}" + (f"  -> {detalle}" if detalle else ""))
        else:
            fallos.append(nombre)
            print(f"  [FALLA] {nombre}  {detalle}")

    print("=== RN-002: CO2 = distancia * factor ===")
    print(f"  {C.calcular_co2(10, 0.9)} == 9.0")
    check("CO2 de 10 km con factor 0.9", C.calcular_co2(10, 0.9) == 9.0)

    print("\n=== RN-018: arboles = CO2 / 22 ===")
    check("1909 kg CO2 -> 86.77 arboles",
          C.arboles_equivalentes(1909) == 86.77,
          str(C.arboles_equivalentes(1909)))
    check("22000 kg -> 1000 arboles",
          C.arboles_equivalentes(22000) == 1000.0,
          str(C.arboles_equivalentes(22000)))

    print("\n=== RN-009: TCO ===")
    v = vehiculo(1, "ABC-123", 800, 3.5)
    tco = C.calcular_tco(20.0, v)
    # 20 km / 10 km/L = 2 L = 0.5284 gal * 17.50 = 9.25
    # mantenimiento = 20 * 1.20 = 24.00
    # depreciacion = 50000 * 0.20 / 30 = 333.33
    # seguros = (500 + 1500) / 30 = 66.67
    # conductor = 1500 / 30 = 50.00
    check("combustible ~9.25", tco["costo_combustible"] == 9.25,
          str(tco["costo_combustible"]))
    check("mantenimiento 24.00", tco["costo_mantenimiento"] == 24.0,
          str(tco["costo_mantenimiento"]))
    check("depreciacion 333.33", tco["costo_depreciacion"] == 333.33,
          str(tco["costo_depreciacion"]))
    check("seguros 66.67", tco["costo_seguro"] == 66.67,
          str(tco["costo_seguro"]))
    check("conductor 50.00", tco["costo_conductor"] == 50.0,
          str(tco["costo_conductor"]))
    check("total = suma de partes",
          tco["costo_total"] == round(
              tco["costo_combustible"] + tco["costo_mantenimiento"]
              + tco["costo_depreciacion"] + tco["costo_seguro"]
              + tco["costo_conductor"], 2),
          str(tco["costo_total"]))
    check("CO2 de la ruta con TCO", tco["co2_kg"] == 18.0,
          str(tco["co2_kg"]))

    print("\n=== RN-005: penalidad = minutos * 0.50 ===")
    check("30 min tarde = 15.00",
          C.minutos_penalidad_ventana(30) == 15.0)
    check("0 min tarde = 0.00",
          C.minutos_penalidad_ventana(0) == 0.0)
    check("sin tardanza no penaliza",
          C.minutos_penalidad_ventana(-5) == 0.0)

    print("\n=== RN-003: restricción MTC por ultimo digito ===")
    lunes = datetime.date(2026, 10, 5)  # lunes
    p = ProblemaVRPTW(
        [],
        [
            vehiculo(1, "ABC-120", 500, 5),
            vehiculo(2, "ABC-121", 500, 5),
        ],
        [], BASE, lunes,
    )
    check("placa terminada en 0 no circula lunes",
          p.vehiculos[0].elegible_hoy(p.dia_semana) is False)
    check("placa terminada en 1 si circula lunes",
          p.vehiculos[1].elegible_hoy(p.dia_semana) is True)
    check("dia_semana lunes = 1", p.dia_semana == 1, str(p.dia_semana))
    domingo = datetime.date(2026, 10, 4)  # domingo
    p2 = ProblemaVRPTW(
        [], [vehiculo(1, "ABC-120", 500, 5)], [], BASE, domingo
    )
    check("domingo todos circulan",
          p2.vehiculos[0].elegible_hoy(p2.dia_semana) is True)

    print("\n=== RN-006: capacidad ===")
    v = vehiculo(1, "ABC-123", 100, 10)
    p3 = ProblemaVRPTW(
        [pedido(1, -12.01, -77.01, 60, 5)],
        [v], [conductor(1)], BASE, lunes,
    )
    rutas = p3.solucion_inicial()
    check("pedido de 60 kg cabe en vehiculo de 100 kg",
          len(rutas) == 1 and rutas[0].vehiculo.carga_kg == 60,
          str(rutas[0].vehiculo.carga_kg) if rutas else "sin ruta")

    v2 = vehiculo(1, "ABC-123", 50, 10)
    p4 = ProblemaVRPTW(
        [pedido(1, -12.01, -77.01, 60, 5)],
        [v2], [conductor(1)], BASE, lunes,
    )
    rutas2 = p4.solucion_inicial()
    check("pedido de 60 kg NO cabe en vehiculo de 50 kg",
          len(rutas2) == 0, str(len(rutas2)))

    print("\n=== RN-008: perecedero no comparte con quimico ===")
    p5 = ProblemaVRPTW(
        [
            pedido(1, -12.01, -77.01, 10, 1, tipo="PERECEDERO"),
            pedido(2, -12.02, -77.02, 10, 1, tipo="QUIMICO"),
        ],
        [vehiculo(1, "ABC-123", 500, 10)],
        [conductor(1), conductor(2)], BASE, lunes,
    )
    rutas5 = p5.solucion_inicial()
    tipos_por_ruta = [
        {c.tipo_producto for c in r.secuencia} for r in rutas5
    ]
    check("PERECEDERO y QUIMICO en rutas distintas",
          all(not ({"PERECEDERO", "QUIMICO"} <= t) for t in tipos_por_ruta),
          str(tipos_por_ruta))

    print("\n=== Optimización completa ===")
    pedidos = [
        pedido(1, -12.010, -77.005, 25, 0.5, "EXPRESS", hi=8, hf=10),
        pedido(2, -12.020, -77.015, 30, 0.6, "ESTANDAR", hi=9, hf=12),
        pedido(3, -12.030, -77.025, 15, 0.3, "ECONOMICO", hi=10, hf=13),
        pedido(4, -12.005, -77.035, 20, 0.4, "EXPRESS", hi=8, hf=11),
    ]
    vehiculos = [
        vehiculo(1, "ABC-121", 500, 5),
        vehiculo(2, "DEF-124", 800, 8),
    ]
    conductores = [conductor(1), conductor(2)]

    p6 = ProblemaVRPTW(pedidos, vehiculos, conductores, BASE, lunes)
    optimas = p6.asignar_conductores(p6.optimizar(iteraciones=200))

    check("genera al menos una ruta", len(optimas) >= 1, str(len(optimas)))

    serving = sum(len(r.secuencia) for r in optimas)
    check("todos los pedidos planificados", serving == len(pedidos),
          f"{serving}/{len(pedidos)}")

    check("cada ruta tiene vehiculo asignado",
          all(r.vehiculo is not None for r in optimas))
    check("cada ruta tiene conductor asignado",
          all(r.conductor is not None for r in optimas))

    placas = [r.vehiculo.placa for r in optimas]
    check("ningun vehiculo en dos rutas",
          len(placas) == len(set(placas)), str(placas))

    ids_conductor = [r.conductor.id_conductor for r in optimas]
    check("ningun conductor en dos rutas",
          len(ids_conductor) == len(set(ids_conductor)), str(ids_conductor))

    check("no excede capacidad kg",
          all(r.vehiculo.carga_kg <= r.vehiculo.capacidad_kg
              for r in optimas))
    check("no excede capacidad m3",
          all(r.vehiculo.carga_m3 <= r.vehiculo.capacidad_m3
              for r in optimas))

    check("dentro de horario operativo",
          all(r.minutos / 60 <= P.HORAS_MAX_JORNADA + 2
              for r in optimas),
          str([round(r.minutos / 60, 2) for r in optimas]))

    check("cumplimiento de ventanas calculado",
          all(r.cumplimiento_pct is not None for r in optimas),
          str([r.cumplimiento_pct for r in optimas]))

    print("\n  detalle de la solución:")
    for i, r in enumerate(optimas, 1):
        print(f"    ruta {i}: vehiculo {r.vehiculo.placa} "
              f"conductor {r.conductor.nombre_completo if r.conductor else '-'}")
        print(f"      pedidos={[c.id_pedido for c in r.secuencia]}")
        print(f"      distancia={r.distancia_km} km  tiempo={r.minutos} min")
        print(f"      carga={r.vehiculo.carga_kg}/{r.vehiculo.capacidad_kg} kg")
        print(f"      CO2={r.co2_kg} kg  costo=S/ {r.costo_total}")
        print(f"      penalizacion=S/ {r.penalizacion}  "
              f"cumplimiento={r.cumplimiento_pct}%")

    print("\n=== RNF-001: tiempo de calculo ===")
    import time as _t
    t0 = _t.perf_counter()
    p7 = ProblemaVRPTW(pedidos, vehiculos, conductores, BASE, lunes)
    p7.asignar_conductores(p7.optimizar(iteraciones=400))
    elapsed = _t.perf_counter() - t0
    check("resuelve en menos de 45 s", elapsed < P.TIEMPO_MAX_OPTIMIZACION_SEG,
          f"{elapsed:.3f}s")

    print(f"\n=== RESULTADO: {ok}/{ok + len(fallos)} OK ===")
    if fallos:
        for f in fallos:
            print(f"  FALLA: {f}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())