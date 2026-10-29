"""Prueba de saturación, obstáculos y optimización desde el cono.

Verifica, con datos reales:

  1. La saturación informa de capacidad y de tráfico por separado
  2. Propone una ventana del catálogo cuando la elegida no tiene hueco
  3. El cono se registra, aparece para todos y se quita a mano
  4. La ventana creada para un caso puntual NO se ofrece a otros
  5. El optimizador esquiva de verdad el cono (antes no lo esquivaba)
  6. "Optimizar desde el cono" conserva vehículo, conductor y pedidos
"""
import datetime
import sys

sys.path.insert(0, ".")
sys.path.insert(0, "tests")

from cliente_http import Api, Resultado, token_de

HOY = datetime.date.today()

CONO = {
    "tipo": "CONO",
    "descripcion": "Cono de obra colocado por el conductor en la calle",
    "latitud": -12.020,
    "longitud": -77.000,
    "nivel": "ALTO",
}


def main():
    r = Resultado("Saturación, obstáculos y optimización desde el cono")

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

        id_conductor = db.execute(
            text(
                "SELECT id_conductor FROM conductores "
                "ORDER BY id_conductor LIMIT 1"
            )
        ).scalar()

    finally:
        db.close()

    api = Api(token_de(admin, "ADMIN"))

    # ---------------- 1. saturación ----------------

    st, sat = api.get(
        f"/operacion/saturacion?fecha={HOY}"
        "&hora_inicio=08:00:00&hora_fin=12:00:00"
    )

    r.check("GET /operacion/saturacion", st == 200, f"status {st}")

    if st != 200:
        return False

    print()
    print("Saturación 08:00-12:00:")
    print(f"  estado            : {sat['estado']}")
    print(f"  conductores       : {sat['conductores_disponibles']} libres, "
          f"{sat['conductores_en_ruta']} en ruta")
    print(f"  horas libres      : {sat['horas_libres_totales']} h")
    print(f"  carga libre       : {sat['carga_kg_libre']:.0f} kg / "
          f"{sat['carga_m3_libre']:.1f} m3")
    print(f"  trafico           : {sat['tramos_congestionados']} tramos, "
          f"{sat['tramos_en_ruta_afectados']} sobre ruta")
    print(f"  congestion maxima : {sat['congestion_maxima']}")

    for m in sat["motivos"]:
        print(f"    - {m}")

    print()

    r.check(
        "informa de capacidad",
        "conductores_disponibles" in sat
        and "carga_kg_libre" in sat,
    )

    r.check(
        "informa de trafico por separado",
        "tramos_congestionados" in sat
        and "tramos_en_ruta_afectados" in sat,
    )

    r.check(
        "el estado es uno de los tres",
        sat["estado"] in ("HOLGADO", "AJUSTADO", "SATURADO"),
        sat["estado"],
    )

    # Una ventana imposible debe salir saturada
    st, imposible = api.get(
        f"/operacion/saturacion?fecha={HOY}"
        "&hora_inicio=23:00:00&hora_fin=23:30:00"
    )

    r.check(
        "una franja sin conductores sale SATURADA",
        imposible["estado"] == "SATURADO",
        f"{imposible['estado']}: {imposible['motivos']}",
    )

    # Ventana inválida
    st, _ = api.get(
        f"/operacion/saturacion?fecha={HOY}"
        "&hora_inicio=12:00:00&hora_fin=08:00:00"
    )

    r.check(
        "rechaza una ventana invertida",
        st == 400,
        f"status {st}",
    )

    # ---------------- 2. ventana sugerida ----------------

    st, sug = api.post("/operacion/ventana-sugerida", {
        "fecha": HOY.isoformat(),
        "hora_inicio": "23:00",
        "hora_fin": "23:30",
        "peso_kg": 10,
        "volumen_m3": 1,
    })

    r.check("POST /operacion/ventana-sugerida", st == 200, f"status {st}")

    if st == 200 and sug["ventana_sugerida"]:
        v = sug["ventana_sugerida"]

        print()
        print(f"Ventana sugerida: {v['hora_inicio']} - {v['hora_fin']}")
        print(f"  {v['motivo']}")
        print()

        r.check(
            "la sugerencia viene del catalogo",
            v["id_ventana"] is not None,
            f"ventana {v['id_ventana']}",
        )

    # ---------------- 3. el cono ----------------

    st, cono = api.post("/obstaculos", CONO)

    r.check("POST /obstaculos", st == 201, f"status {st} {cono}")

    id_cono = cono.get("id_obstaculo") if st == 201 else None

    if st == 201:
        print()
        print(f"Cono registrado: #{id_cono} en "
              f"{cono['latitud']}, {cono['longitud']}")
        print()

        st, lista = api.get("/obstaculos")

        r.check(
            "el cono aparece en el listado",
            any(o["id_obstaculo"] == id_cono for o in lista),
            f"{len(lista)} obstaculos",
        )

        r.check(
            "aparece sin resolver",
            all(
                not o["resuelto"] for o in lista
            ),
            "todos los de la lista estan vigentes",
        )

        # ---------------- 4. ventana ocasional ----------------

        st, ocasional = api.post("/clientes/ventanas-tiempo", {
            "hora_inicio": "13:00",
            "hora_fin": "14:00",
            "es_ocasional": True,
        })

        r.check(
            "se puede crear una ventana para un caso puntual",
            st == 201,
            f"status {st} {ocasional}",
        )

        id_ocasional = (
            ocasional.get("id_ventana") if st == 201 else None
        )

        st, todas = api.get("/clientes/ventanas-tiempo")

        if id_ocasional:
            marcada = next(
                (v for v in todas if v["id_ventana"] == id_ocasional),
                None,
            )

            r.check(
                "queda marcada como ocasional",
                marcada and marcada.get("es_ocasional") is True,
                str(marcada),
            )

        # El listado de administracion si las muestra todas: hay que
        # verlas para poder borrarlas. Lo que no debe pasar es que
        # el desplegable del formulario de pedidos las ofrezca.
        st, todas = api.get("/clientes/ventanas-tiempo")

        r.check(
            "el listado de administracion si las muestra",
            any(
                v["id_ventana"] == id_ocasional for v in todas
            ),
            "se pueden gestionar desde el modulo de clientes",
        )

        st, catalogo = api.get(
            "/clientes/ventanas-tiempo/disponibles"
        )

        r.check(
            "el desplegable NO ofrece la ventana ocasional",
            all(
                not v.get("es_ocasional") for v in catalogo
            ),
            f"{len(catalogo)} ventanas en el desplegable",
        )

        r.check(
            "ni siquiera por su id",
            not any(
                v["id_ventana"] == id_ocasional for v in catalogo
            ),
        )

    # ---------------- 5. el optimizador esquiva ----------------

    from app.services import optimizador as OPT

    from app.db.database import SessionLocal as SL

    db = SL()

    try:
        p = OPT.ProblemaVRPTW(
            pedidos=[],
            vehiculos=[],
            conductores=[],
            base={"latitud": -12.015, "longitud": -77.005},
            fecha=HOY,
        )
    finally:
        db.close()

    r.check(
        "sin obstaculos el factor es 1",
        p._factor_obstaculo(-12.020, -77.000) == 1.0,
        str(p._factor_obstaculo(-12.020, -77.000)),
    )

    p._puntos_a_esquivar.append({
        "latitud": -12.020,
        "longitud": -77.000,
        "peso": 1.0,
        "que": "cono de prueba",
    })

    cerca = p._factor_obstaculo(-12.0205, -77.0005)
    lejos = p._factor_obstaculo(-12.060, -77.050)

    print()
    print(f"Factor con el cono a 50 m:  {cerca:.2f}")
    print(f"Factor lejos del cono:     {lejos:.2f}")
    print()

    r.check(
        "cerca del cono el tiempo se encarece",
        cerca > 1.5,
        f"factor {cerca:.2f}",
    )

    r.check(
        "lejos del cono no cambia nada",
        lejos == 1.0,
        f"factor {lejos:.2f}",
    )

    # ---------------- 6. optimizar desde el cono ----------------

    db = SessionLocal()

    try:
        id_ruta = db.execute(
            text("""
                SELECT r.id_ruta
                FROM rutas r
                WHERE EXISTS (
                    SELECT 1 FROM ruta_pedidos rp
                    WHERE rp.id_ruta = r.id_ruta
                      AND rp.estado_entrega = 'PENDIENTE'
                )
                AND r.estado IN ('PLANIFICADA','EN_CURSO','REOPTIMIZADA')
                ORDER BY r.id_ruta DESC LIMIT 1
            """)
        ).scalar()

        antes = None

        if id_ruta:
            st, d = api.get(f"/rutas/{id_ruta}")

            antes = {
                "vehiculo": (d.get("asignacion") or {}).get("id_vehiculo"),
                "conductor": (d.get("asignacion") or {}).get("id_conductor"),
                "pedidos": sorted(p["id_pedido"] for p in d["pedidos"]),
            }
    finally:
        db.close()

    if id_cono and id_ruta:
        st, resp = api.post(
            f"/obstaculos/{id_cono}/optimizar-ruta",
            {"iteraciones": 300},
        )

        r.check(
            "optimizar desde el cono responde",
            st == 200,
            f"status {st} {resp if st != 200 else ''}",
        )

        if st == 200:
            despues = None

            st, d = api.get(f"/rutas/{resp['id_ruta']}")

            despues = {
                "vehiculo": (d.get("asignacion") or {}).get(
                    "id_vehiculo"
                ),
                "conductor": (d.get("asignacion") or {}).get(
                    "id_conductor"
                ),
                "pedidos": sorted(
                    p["id_pedido"] for p in d["pedidos"]
                ),
            }

            r.check(
                "no cambia el vehiculo",
                despues["vehiculo"] == antes["vehiculo"],
                f"{antes['vehiculo']} -> {despues['vehiculo']}",
            )

            r.check(
                "no cambia el conductor",
                despues["conductor"] == antes["conductor"],
                f"{antes['conductor']} -> {despues['conductor']}",
            )

            r.check(
                "no pierde pedidos",
                despues["pedidos"] == antes["pedidos"],
                f"{antes['pedidos']} -> {despues['pedidos']}",
            )

            r.check(
                "avisa que el cono se queda",
                any(
                    'cono se mantiene' in a.lower()
                    for a in resp["advertencias"]
                ),
                str(resp["advertencias"][-1:]),
            )

            # El cono sigue ahí
            st, lista = api.get("/obstaculos")

            r.check(
                "el cono sigue en el mapa",
                any(
                    o["id_obstaculo"] == id_cono for o in lista
                ),
                "el cono no se quito al optimizar",
            )

            # ---------------- limpiar ----------------

            st, _ = api.request("DELETE", f"/obstaculos/{id_cono}")

            r.check(
                "el cono se puede quitar a mano",
                st == 200,
                f"status {st}",
            )

            st, lista = api.get("/obstaculos")

            r.check(
                "despues de quitarlo no aparece",
                not any(
                    o["id_obstaculo"] == id_cono for o in lista
                ),
            )

    # ---------------- limpiar ----------------
    id_ocasional = None

    # Limpia la ventana ocasional si se creó
    if id_ocasional:
        db = SessionLocal()

        try:
            db.execute(
                text(
                    "DELETE FROM ventanas_tiempo "
                    "WHERE id_ventana = :id"
                ),
                {"id": id_ocasional},
            )
            db.commit()
        finally:
            db.close()

    print()
    print(f"{r.resumen()}")

    return r.ok


if __name__ == "__main__":
    sys.exit(0 if main() else 1)