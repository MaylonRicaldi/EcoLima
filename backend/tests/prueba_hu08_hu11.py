"""Prueba HU-08, HU-09, HU-10 y HU-11.

Crea una ruta real, luego registra tráfico e incidentes, evalúa la
reoptimización, genera el reporte de sostenibilidad y el plan de
compensación de carbono.

Uso: python tests/prueba_hu08_hu11.py   (desde backend/)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from cliente_http import Api, Resultado, token_de

from app.db.database import SessionLocal
from sqlalchemy import text


def main():
    admin = Api(token_de(1, "ADMIN"))
    db = SessionLocal()

    r = Resultado("HU-08 / HU-09 / HU-10 / HU-11")

    # ---------- datos ----------
    cliente = db.execute(
        text("SELECT id_cliente FROM clientes WHERE email = :e"),
        {"e": "prueba.hu08@ecolima.com"},
    ).scalar()

    if not cliente:
        st, creado = admin.post("/clientes", {
            "nombre": "Cliente HU-08",
            "email": "prueba.hu08@ecolima.com",
            "direccion": "Av. Siempre Viva 742, SJL",
            "latitud": -12.01, "longitud": -77.005,
        })
        cliente = creado["id_cliente"]

    ventana = db.execute(
        text("SELECT id_ventana FROM ventanas_tiempo ORDER BY id_ventana LIMIT 1")
    ).scalar()

    pedidos_ids = []
    for lat, lon, peso in [
        (-12.011, -77.006, 20), (-12.025, -77.015, 35),
    ]:
        st, creado = admin.post("/pedidos", {
            "id_cliente": cliente,
            "id_ventana_tiempo": ventana,
            "direccion_entrega": f"Destino {lat}",
            "latitud": lat, "longitud": lon,
            "peso_kg": peso, "volumen_m3": 0.5,
            "prioridad": "ESTANDAR", "tipo_producto": "NO_PERECEDERO",
        })
        if st == 201:
            pedidos_ids.append(creado["id_pedido"])

    r.check("pedidos creados para la prueba", len(pedidos_ids) == 2,
            str(pedidos_ids))

    # ---------- HU-06: ruta ----------
    st, opt = admin.post("/rutas/optimizar", {
        "algoritmo": "SA", "iteraciones": 100, "semilla": 3,
        "fecha": "2026-10-05",
    })

    r.check("optimización genera rutas", st == 200 and opt["rutas_creadas"],
            f"status {st}")

    if st != 200 or not opt["rutas_creadas"]:
        return r.resumen()

    id_ruta = opt["rutas_creadas"][0]["id_ruta"]
    r.check("ruta creada", True, f"id_ruta {id_ruta}")

    # ---------- HU-08: tráfico ----------
    st, traf = admin.post("/trafico", {
        "segmento": "Av. Proceres de la Independencia (tramo prueba)",
        "latitud": -12.011, "longitud": -77.006,
        "nivel_congestion": "ROJO",
        "velocidad_kmh": 12.0,
        "fuente": "MANUAL",
    })
    r.check("POST /trafico registra tramo", st == 201, f"status {st}: {traf}")

    st, lista = admin.get("/trafico")
    r.check("GET /trafico lista", st == 200 and len(lista) >= 1,
            f"{len(lista)} tramos")

    st, _ = admin.post("/trafico", {
        "segmento": "x", "latitud": -12.01, "longitud": -77.01,
        "nivel_congestion": "PURPURA", "fuente": "MANUAL",
    })
    r.check("rechaza nivel de congestión inválido", st == 422, f"status {st}")

    # ---------- HU-08: incidentes ----------
    st, inc = admin.post("/incidentes", {
        "tipo": "BLOQUEO",
        "descripcion": "Bloqueo de pista por obra en ruta de prueba",
        "latitud": -12.012, "longitud": -77.007,
        "nivel": "ALTO",
        "fuente": "MANUAL",
    })
    r.check("POST /incidentes registra", st == 201, f"status {st}: {inc}")

    st, incs = admin.get("/incidentes")
    r.check("GET /incidentes lista", st == 200 and len(incs) >= 1,
            f"{len(incs)} incidentes")

    # ---------- RN-017: evaluación de reoptimización ----------
    st, ev = admin.get(f"/rutas/{id_ruta}/evaluar-reoptimizacion")
    r.check("GET evaluar-reoptimizacion", st == 200, f"status {st}")

    if st == 200:
        r.check("detecta incidente cercano (RN-017c)",
                any("Incidente" in m for m in ev["motivos"]),
                str(ev["motivos"]))
        r.check("detecta tramo ROJO (RN-012)",
                any("ROJO" in m for m in ev["motivos"]),
                str(ev["motivos"]))
        r.check("marca que requiere reoptimización",
                ev["requiere_reoptimizacion"] is True)
        r.check("lista incidentes en la ruta",
                len(ev["incidentes_en_ruta"]) >= 1,
                str(len(ev["incidentes_en_ruta"])))

    st, pend = admin.get("/rutas/pendientes-reoptimizacion")
    r.check("rutas pendientes de reoptimización", st == 200, f"status {st}")

    # ---------- HU-08: reoptimización real ----------
    st, reopt = admin.post(
        f"/rutas/{id_ruta}/reoptimizar",
        {"iteraciones": 100, "semilla": 11},
    )
    r.check("POST reoptimizar", st == 200, f"status {st}")

    if st == 200:
        r.check("reoptimización crea rutas nuevas",
                len(reopt["rutas_creadas"]) >= 1,
                str(len(reopt["rutas_creadas"])))
        st2, detalle = admin.get(f"/rutas/{id_ruta}")
        r.check("ruta original queda REOPTIMIZADA",
                detalle["estado"] == "REOPTIMIZADA",
                detalle["estado"])

    # ---------- HU-09: dashboard ----------
    st, dash = admin.get("/dashboard")
    r.check("GET /dashboard", st == 200, f"status {st}")

    if st == 200:
        print("\n  --- dashboard ---")
        print(f"  pedidos={dash['conteos']['pedidos']} "
              f"rutas={dash['conteos']['rutas']} "
              f"vehiculos={dash['conteos']['vehiculos']}")
        print(f"  distancia={dash['operacion']['distancia_km']} km  "
              f"CO2={dash['operacion']['co2_kg']} kg  "
              f"costo=S/ {dash['operacion']['costo_total']}")
        print(f"  ahorro CO2={dash['ahorro']['co2_kg']} kg  "
              f"arboles={dash['sostenibilidad']['arboles_equivalentes']}")
        print(f"  {dash['sostenibilidad']['mensaje']}")

        r.check("dashboard trae conteos reales",
                dash["conteos"]["pedidos"] > 0)
        r.check("dashboard trae distancia real",
                dash["operacion"]["distancia_km"] >= 0)
        r.check("dashboard trae CO2 real",
                dash["operacion"]["co2_kg"] >= 0)
        r.check("dashboard usa factor 22 kg/arbol (RN-018)",
                dash["sostenibilidad"]["kg_co2_por_arbol_anio"] == 22.0)
        r.check("cumplimiento de ventanas presente",
                "cumplimiento_pct" in dash["ventanas"])

    st, ind = admin.get("/indicadores")
    r.check("GET /indicadores usa tabla indicadores_ruta",
            st == 200 and len(ind) >= 1, f"{len(ind)} indicadores")

    # ---------- HU-10: reportes ----------
    st, rep = admin.post(
        f"/reportes?tipo=SOSTENIBILIDAD&id_ruta={id_ruta}", None
    )
    r.check("POST /reportes genera", st == 200, f"status {st}: {rep}")

    st, reps = admin.get("/reportes")
    r.check("GET /reportes lista", st == 200 and len(reps) >= 1,
            f"{len(reps)} reportes")

    st, _ = admin.post("/reportes?tipo=INVALIDO", None)
    r.check("rechaza tipo de reporte inválido", st in (400, 422),
            f"status {st}")

    st, det = admin.get(f"/reportes/sostenibilidad?id_ruta={id_ruta}")
    r.check("GET reporte sostenibilidad por ruta", st == 200, f"status {st}")

    if st == 200:
        r.check("reporte incluye TCO desglosado",
                all(k in det for k in (
                    "costo_combustible", "costo_mantenimiento",
                    "costo_depreciacion", "costo_seguro", "costo_conductor",
                    "costo_total",
                )))
        r.check("reporte incluye CO2 y arboles",
                "co2_kg" in det and "arboles_equivalentes" in det)

    st, cons = admin.get("/reportes/consolidado")
    r.check("GET reporte consolidado", st == 200, f"status {st}")

    if st == 200:
        r.check("consolidado trae totales",
                cons["totales"]["distancia_km"] >= 0)

    # ---------- HU-11: compensación de carbono ----------
    st, comp = admin.post("/sostenibilidad/compensacion", None)
    r.check("POST compensación genera plan", st == 200, f"status {st}: {comp}")

    if st == 200:
        r.check("usa factor 22 kg CO2/arbol/año (RN-018)",
                float(comp["factor_captura_arbol_kg"]) == 22.0,
                str(comp["factor_captura_arbol_kg"]))
        esperado = round(
            float(comp["co2_a_compensar_kg"]) / 22.0, 2
        )
        r.check("arboles_necesarios = CO2 / 22 (columna generada)",
                abs(float(comp["arboles_necesarios"]) - esperado) < 0.02,
                f"{comp['arboles_necesarios']} vs {esperado}")
        r.check("proyecto de reforestación referenciado",
                "Huascar" in (comp["proyecto_reforestacion"] or "")
                or "Arboles" in (comp["proyecto_reforestacion"] or ""),
                comp["proyecto_reforestacion"])

    st, comps = admin.get("/sostenibilidad/compensacion")
    r.check("GET compensación lista", st == 200 and len(comps) >= 1,
            f"{len(comps)} planes")

    st, impacto = admin.get("/sostenibilidad/impacto")
    r.check("GET impacto ambiental", st == 200, f"status {st}")

    if st == 200:
        r.check("impacto calcula arboles de compensación",
                impacto["arboles_para_compensar"] >= 0)
        print(f"  {impacto['equivalencia']}")

    # ---------- permisos ----------
    conductor = Api(token_de(2, "CONDUCTOR"))
    st, _ = conductor.get("/dashboard")
    r.check("CONDUCTOR NO ve dashboard global (403)", st == 403,
            f"status {st}")

    st, _ = conductor.post("/incidentes", {
        "tipo": "AVERIA",
        "descripcion": "Falla en el vehiculo durante la ruta",
        "latitud": -12.01, "longitud": -77.01,
        "nivel": "MEDIO",
    })
    r.check("CONDUCTOR SÍ reporta incidentes (permitido)", st == 201,
            f"status {st}")

    st, _ = conductor.get("/reportes")
    r.check("CONDUCTOR NO lee reportes (403)", st == 403, f"status {st}")

    limpiar(db)

    return r.resumen()


def limpiar(db):
    print("\n  limpiando datos de prueba...")
    db.execute(text("DELETE FROM indicadores_ruta"))
    db.execute(text("DELETE FROM paradas_ruta"))
    db.execute(text("DELETE FROM asignaciones"))
    db.execute(text("DELETE FROM ruta_pedidos"))
    db.execute(text("DELETE FROM rutas"))
    db.execute(text("DELETE FROM trafico"))
    db.execute(text("DELETE FROM incidentes"))
    db.execute(text("DELETE FROM compensacion_carbono"))
    db.execute(text("DELETE FROM reportes"))
    db.execute(
        text("UPDATE pedidos SET estado='PENDIENTE' WHERE estado='ASIGNADO'")
    )
    db.execute(
        text("UPDATE conductores SET estado='DISPONIBLE', "
             "horas_conduccion_acumuladas=0 WHERE estado='EN_RUTA'")
    )
    db.execute(text("DELETE FROM pedidos WHERE id_cliente IN "
                    "(SELECT id_cliente FROM clientes "
                    "WHERE email = 'prueba.hu08@ecolima.com')"))
    db.execute(text("DELETE FROM clientes WHERE email = 'prueba.hu08@ecolima.com'"))
    db.commit()
    db.close()


if __name__ == "__main__":
    sys.exit(0 if main() else 1)