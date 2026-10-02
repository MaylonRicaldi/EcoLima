"""Prueba HU-06: optimización de rutas end-to-end.

Crea pedidos de prueba, ejecuta el optimizador por la API, verifica que
se guarden rutas/paradas/asignaciones/indicadores con la relación
correcta (PEDIDOS -> RUTA -> ASIGNACION -> VEHICULO + CONDUCTOR) y
limpia al final.

Uso: python tests/prueba_rutas.py   (desde backend/)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from cliente_http import Api, Resultado, token_de

from app.db.database import SessionLocal
from sqlalchemy import text


CLIENTES_PRUEBA = "prueba.hu06@ecolima.com"


def main():
    admin = Api(token_de(1, "ADMIN"))
    db = SessionLocal()

    r = Resultado("HU-06 optimización de rutas")

    # ---------- datos previos ----------
    cliente = db.execute(
        text("""
            SELECT c.id_cliente FROM clientes c
            WHERE c.email = :email
        """),
        {"email": CLIENTES_PRUEBA},
    ).scalar()

    if not cliente:
        st, creado = admin.post("/clientes", {
            "nombre": "Cliente HU-06",
            "email": CLIENTES_PRUEBA,
            "direccion": "Av. Siempre Viva 742, San Juan de Lurigancho",
            "latitud": -12.01,
            "longitud": -77.005,
        })

        cliente = creado["id_cliente"]

    r.check("cliente de prueba disponible", cliente is not None, str(cliente))

    ventana = db.execute(
        text("SELECT id_ventana FROM ventanas_tiempo ORDER BY id_ventana LIMIT 1")
    ).scalar()

    r.check("ventana de tiempo disponible", ventana is not None, str(ventana))

    # ---------- crear pedidos ----------
    pedidos = [
        (-12.011, -77.006, 20, 0.4, "EXPRESS", "NO_PERECEDERO"),
        (-12.025, -77.015, 35, 0.7, "ESTANDAR", "NO_PERECEDERO"),
        (-12.040, -77.030, 15, 0.3, "ECONOMICO", "PERECEDERO"),
        (-12.008, -77.040, 28, 0.5, "ESTANDAR", "QUIMICO"),
    ]

    ids = []

    for lat, lon, peso, vol, prio, tipo in pedidos:
        st, creado = admin.post("/pedidos", {
            "id_cliente": cliente,
            "id_ventana_tiempo": ventana,
            "direccion_entrega": f"Destino {lat} {lon}",
            "latitud": lat,
            "longitud": lon,
            "peso_kg": peso,
            "volumen_m3": vol,
            "prioridad": prio,
            "tipo_producto": tipo,
        })

        if st == 201:
            ids.append(creado["id_pedido"])

    r.check("se crearon 4 pedidos de prueba", len(ids) == 4, str(ids))

    # ---------- ejecutar optimización ----------
    st, resultado = admin.post("/rutas/optimizar", {
        "algoritmo": "SA",
        "iteraciones": 150,
        "semilla": 7,
        "fecha": "2026-10-05",
    })

    if st != 200:
        r.check("POST /rutas/optimizar", False, f"status {st}: {resultado}")
        limpiar(db, admin, ids, cliente)
        return r.resumen()

    r.check("POST /rutas/optimizar responde 200", True)

    rutas = resultado["rutas_creadas"]
    r.check("genera al menos una ruta", len(rutas) >= 1,
            f"{len(rutas)} rutas")

    if not rutas:
        limpiar(db, admin, ids, cliente)
        return r.resumen()

    print(f"       pedidos planificados : {resultado['pedidos_planificados']}")
    print(f"       vehiculos elegibles  : {resultado['vehiculos_elegibles']}")
    print(f"       conductores disp.    : {resultado['conductores_disponibles']}")
    print(f"       segundos resueltos   : {resultado['segundos_resueltos']}")
    for a in resultado["advertencias"]:
        print(f"       aviso: {a}")

    r.check("resuelve en menos de 45 s (RNF-001)",
            resultado["segundos_resueltos"] < 45,
            str(resultado["segundos_resueltos"]))

    r.check("todos los pedidos planificados o con motivo",
            resultado["pedidos_planificados"] + len(
                resultado["pedidos_no_planificados"]
            ) >= 4,
            f"planificados {resultado['pedidos_planificados']} + "
            f"no planificados {len(resultado['pedidos_no_planificados'])}")

    for np in resultado["pedidos_no_planificados"]:
        print(f"       no planificado: pedido {np['id_pedido']}"
              f" -> {np['motivo']}")

    r.check("todo pedido no planificado tiene motivo",
            all(np.get("motivo") for np in resultado["pedidos_no_planificados"]))

    # ---------- verificar persistencia ----------
    for ruta in rutas:
        id_ruta = ruta["id_ruta"]

        st, detalle = admin.get(f"/rutas/{id_ruta}")
        r.check(f"GET /rutas/{id_ruta} detalle", st == 200, f"status {st}")

        if st != 200:
            continue

        paradas = detalle["paradas"]
        peds = detalle["pedidos"]
        asignacion = detalle["asignacion"]
        indicador = detalle["indicador"]

        r.check(f"ruta {id_ruta} tiene paradas",
                len(paradas) >= 2, str(len(paradas)))
        r.check(f"ruta {id_ruta} empieza en INICIO",
                paradas[0]["tipo_parada"] == "INICIO")
        r.check(f"ruta {id_ruta} termina en FIN",
                paradas[-1]["tipo_parada"] == "FIN")
        r.check(f"ruta {id_ruta} tiene entregas",
                sum(1 for p in paradas if p["tipo_parada"] == "ENTREGA")
                == len(peds))
        r.check(f"ruta {id_ruta} tiene asignación con vehiculo y conductor",
                asignacion is not None
                and asignacion["id_vehiculo"] is not None
                and asignacion["id_conductor"] is not None,
                str(asignacion) if asignacion else "sin asignacion")
        r.check(f"ruta {id_ruta} tiene indicador (HU-09)",
                indicador is not None)
        r.check(f"ruta {id_ruta} cumple la relacion PEDIDO->RUTA",
                all(p["id_pedido"] for p in peds),
                str([p["id_pedido"] for p in peds]))
        r.check(f"ruta {id_ruta} tiene algoritmo SA",
                ruta["algoritmo_utilizado"] == "SA")
        r.check(f"ruta {id_ruta} arranca en PLANIFICADA",
                ruta["estado"] == "PLANIFICADA")
        r.check(f"ruta {id_ruta} tiene CO2 calculada",
                ruta["co2_kg"] >= 0, str(ruta["co2_kg"]))
        r.check(f"ruta {id_ruta} tiene costo total",
                ruta["costo_total"] > 0, str(ruta["costo_total"]))

        print(f"       ruta {id_ruta}: {ruta['distancia_km']} km, "
              f"{ruta['duracion_minutos']} min, "
              f"CO2 {ruta['co2_kg']} kg, S/ {ruta['costo_total']}, "
              f"cumplimiento {ruta['cumplimiento_ventanas_pct']}%")

    # ---------- los pedidos pasan a ASIGNADO ----------
    st, datos = admin.get("/pedidos")
    asignados = [p for p in datos if p["id_pedido"] in ids
                 and p["estado"] == "ASIGNADO"]
    r.check("los pedidos planificados quedan ASIGNADO",
            len(asignados) == resultado["pedidos_planificados"],
            f"{len(asignados)} ASIGNADO vs "
            f"{resultado['pedidos_planificados']} planificados")

    # RN-008: perecedero y quimico nunca en la misma ruta
    mezclado = False
    for ruta in rutas:
        st, detalle = admin.get(f"/rutas/{ruta['id_ruta']}")
        tipos = {p["tipo_producto"] for p in detalle["pedidos"]}
        if {"PERECEDERO", "QUIMICO"} <= tipos:
            mezclado = True
    r.check("ninguna ruta mezcla PERECEDERO con QUIMICO (RN-008)",
            not mezclado)

    # ---------- permisos ----------
    conductor = Api(token_de(2, "CONDUCTOR"))
    st, rts = conductor.get("/rutas")
    r.check("CONDUCTOR lee rutas (permitido)", st == 200, f"status {st}")

    st, _ = conductor.post("/rutas/optimizar", {"algoritmo": "SA"})
    r.check("CONDUCTOR NO optimiza (403)", st == 403, f"status {st}")

    st, _ = conductor.get("/clientes")
    r.check("CONDUCTOR NO lee clientes (403)", st == 403, f"status {st}")

    limpiar(db, admin, ids, cliente)

    return r.resumen()


def limpiar(db, admin, ids, cliente):
    print("\n  limpiando datos de prueba HU-06...")
    for pid in ids:
        db.execute(
            text("""
                DELETE FROM indicadores_ruta
                WHERE id_ruta IN (
                    SELECT id_ruta FROM ruta_pedidos
                    WHERE id_pedido = :id
                )
            """),
            {"id": pid},
        )
        db.execute(
            text("DELETE FROM paradas_ruta WHERE id_ruta IN "
                 "(SELECT id_ruta FROM ruta_pedidos WHERE id_pedido = :id)"),
            {"id": pid},
        )
        db.execute(
            text("DELETE FROM asignaciones WHERE id_ruta IN "
                 "(SELECT id_ruta FROM ruta_pedidos WHERE id_pedido = :id)"),
            {"id": pid},
        )
        db.execute(
            text("DELETE FROM ruta_pedidos WHERE id_pedido = :id"),
            {"id": pid},
        )
        db.execute(
            text("DELETE FROM pedidos WHERE id_pedido = :id"),
            {"id": pid},
        )

    db.execute(
        text("UPDATE conductores SET estado='DISPONIBLE', "
             "horas_conduccion_acumuladas=0 WHERE estado='EN_RUTA'"),
    )
    db.commit()
    db.close()


if __name__ == "__main__":
    sys.exit(0 if main() else 1)