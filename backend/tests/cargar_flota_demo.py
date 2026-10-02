"""Carga la flota mínima de demostración de DistriRápido S.A.C.

Los 2 vehículos de prueba existentes terminan en 4, por lo que quedan
bloqueados por la restricción vehicular MTC (RN-003) todos los jueves.
Para poder operar cualquier día se necesitan vehículos con dígitos
finales distintos.

No duplica: solo crea los que faltan.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from cliente_http import Api, token_de

# dígito final distinto en cada vehículo -> cubre toda la semana
VEHICULOS = [
    {
        "id_tipo_vehiculo": 1,
        "placa": "ZSE-241",
        "marca": "Toyota",
        "modelo": "Hilux",
        "anio_fabricacion": 2019,
        "capacidad_kg": 1200,
        "capacidad_m3": 5.5,
        "consumo_km_l": 9.5,
        "factor_co2_kg_km": 0.8920,
        "tipo_combustible": "DIESEL",
        "costo_adquisicion": 85000,
        "valor_actual": 52000,
        "depreciacion_anual": 17000,
        "costo_soat_anual": 480,
        "costo_seguro_anual": 1600,
        "estado": "ACTIVO",
    },
    {
        "id_tipo_vehiculo": 2,
        "placa": "ABC-257",
        "marca": "Mercedes",
        "modelo": "Sprinter",
        "anio_fabricacion": 2021,
        "capacidad_kg": 1800,
        "capacidad_m3": 11.0,
        "consumo_km_l": 11.0,
        "factor_co2_kg_km": 1.0500,
        "tipo_combustible": "DIESEL",
        "costo_adquisicion": 145000,
        "valor_actual": 110000,
        "depreciacion_anual": 29000,
        "costo_soat_anual": 520,
        "costo_seguro_anual": 2200,
        "estado": "ACTIVO",
    },
    {
        "id_tipo_vehiculo": 3,
        "placa": "PQR-263",
        "marca": "Honda",
        "modelo": "XR150",
        "anio_fabricacion": 2022,
        "capacidad_kg": 30,
        "capacidad_m3": 0.2,
        "consumo_km_l": 35.0,
        "factor_co2_kg_km": 0.2200,
        "tipo_combustible": "GASOLINA",
        "costo_adquisicion": 15000,
        "valor_actual": 9000,
        "depreciacion_anual": 3000,
        "costo_soat_anual": 320,
        "costo_seguro_anual": 600,
        "estado": "ACTIVO",
    },
]


def main():
    api = Api(token_de(1, "ADMIN"))
    _, actuales = api.get("/vehiculos")

    placas = {v["placa"] for v in actuales}
    creados = 0

    for v in VEHICULOS:
        if v["placa"] in placas:
            print(f"  ya existe: {v['placa']}")
            continue

        st, res = api.post("/vehiculos", v)

        if st == 201:
            print(f"  creado:    {v['placa']} ({v['marca']} {v['modelo']})")
            creados += 1
        else:
            print(f"  ERROR {st}: {v['placa']} -> {res}")

    _, finales = api.get("/vehiculos")
    print(f"\n  total vehículos: {len(finales)}")
    print(f"  creados ahora:   {creados}")

    digitos = sorted(
        {''.join(c for c in v['placa'] if c.isdigit())[-1]
         for v in finales if v['estado'] == 'ACTIVO'}
    )
    print(f"  dígitos finales activos: {digitos}")
    print(
        "  Con 5 dígitos distintos hay vehículo elegible "
        "todos los días."
    )

    return 0


if __name__ == "__main__":
    sys.exit(main())