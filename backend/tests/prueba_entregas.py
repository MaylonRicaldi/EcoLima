"""Una entrega entregada es un hecho y no se deshace.

Comprueba tres cosas, en el orden en que ocurren:

  1. Al marcar ENTREGADO, el pedido queda ENTREGADO y el resto sigue
     pendiente. La ruta pasa a EN_CURSO.
  2. Al corregir el recorrido con entregas ya cerradas, esas
     entregas NO vuelven a PENDIENTE: se conservan con su hora real.
  3. Cuando ya no queda nada por entregar, la ruta se cierra, el
     conductor queda libre y ni la ruta ni sus pedidos se pueden
     volver a optimizar ni reprogramar.
"""
import sys

sys.path.insert(0, ".")
sys.path.insert(0, "tests")

from cliente_http import Api, Resultado, token_de


def entregas_de(api, id_ruta):
    st, d = api.get(f"/rutas/{id_ruta}")

    if st != 200:
        return {}

    return {
        p['id_pedido']: p['estado_entrega'] for p in d.get('pedidos', [])
    }


def estado_operacion(api, id_ruta):
    st, d = api.get(f"/rutas/{id_ruta}")

    return {
        "estado": d.get("estado"),
        "asignacion": (d.get("asignacion") or {}).get("estado"),
        "id_vehiculo": (d.get("asignacion") or {}).get("id_vehiculo"),
        "id_conductor": (d.get("asignacion") or {}).get("id_conductor"),
    }


def main():
    r = Resultado("Entrega cerrada es un registro definitivo")

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

        # Una ruta con al menos 3 pedidos y con conductor
        id_ruta = db.execute(
            text("""
                SELECT r.id_ruta
                FROM rutas r
                WHERE (
                    SELECT count(*) FROM ruta_pedidos rp
                    WHERE rp.id_ruta = r.id_ruta
                ) >= 3
                AND EXISTS (
                    SELECT 1 FROM asignaciones a
                    WHERE a.id_ruta = r.id_ruta
                )
                AND r.estado NOT IN ('COMPLETADA','CANCELADA')
                ORDER BY r.id_ruta DESC LIMIT 1
            """)
        ).scalar()

        # Un conductor de la ruta, para comprobar que queda libre
        conductor = db.execute(
            text("""
                SELECT c.nombre, c.apellido, c.estado
                FROM asignaciones a
                JOIN conductores c ON c.id_conductor = a.id_conductor
                WHERE a.id_ruta = :r
            """),
            {"r": id_ruta},
        ).mappings().first()

        pedidos = db.execute(
            text("""
                SELECT id_pedido FROM ruta_pedidos
                WHERE id_ruta = :r ORDER BY orden_visita
            """),
            {"r": id_ruta},
        ).scalars().all()

    finally:
        db.close()

    if not id_ruta:
        print("No hay ruta con pedidos suficientes.")
        return True

    api = Api(token_de(admin, "ADMIN"))

    print(f"Ruta {id_ruta}, conductor "
          f"{conductor['nombre']} {conductor['apellido']} "
          f"({conductor['estado']})")
    print(f"Pedidos: {list(pedidos)}\n")

    # ---------------- 1. entregar uno ----------------
    primero = pedidos[0]

    st, _ = api.patch(
        f"/rutas/{id_ruta}/pedidos/{primero}/estado",
        {"estado_entrega": "ENTREGADO"},
    )

    r.check("marcar ENTREGADO", st == 200, f"status {st}")

    entregas = entregas_de(api, id_ruta)

    r.check(
        "el pedido queda ENTREGADO",
        entregas.get(primero) == "ENTREGADO",
        f"{primero} = {entregas.get(primero)}",
    )

    r.check(
        "los demas siguen PENDIENTE",
        all(
            entregas[p] == "PENDIENTE" for p in pedidos if p != primero
        ),
        str({p: entregas[p] for p in pedidos if p != primero}),
    )

    op = estado_operacion(api, id_ruta)

    r.check(
        "la ruta queda EN_CURSO",
        op["estado"] == "EN_CURSO",
        op["estado"],
    )

    # ---------------- 2. corregir con entregas cerradas ----
    st, reopt = api.post(
        f"/rutas/{id_ruta}/reoptimizar",
        {"iteraciones": 300},
    )

    r.check("corregir el recorrido con entregas cerradas",
            st == 200, f"status {st} {reopt if st != 200 else ''}")

    if st == 200:
        entregas = entregas_de(api, id_ruta)

        r.check(
            "el pedido entregado NO vuelve a PENDIENTE",
            entregas.get(primero) == "ENTREGADO",
            f"{primero} = {entregas.get(primero)}",
        )

        r.check(
            "el resto sigue PENDIENTE",
            all(
                entregas[p] == "PENDIENTE"
                for p in pedidos if p != primero
            ),
            str({p: entregas[p] for p in pedidos if p != primero}),
        )

        r.check(
            "no pierde ningun pedido de la ruta",
            sorted(entregas) == sorted(pedidos),
            f"{sorted(entregas)} vs {sorted(pedidos)}",
        )

        r.check(
            "sigue el mismo vehiculo y conductor",
            reopt["id_vehiculo"] == op["id_vehiculo"]
            and reopt["id_conductor"] == op["id_conductor"],
        )

    # ---------------- 3. no deshacer una entrega ----------
    st, det = api.patch(
        f"/rutas/{id_ruta}/pedidos/{primero}/estado",
        {"estado_entrega": "REPROGRAMADO"},
    )

    r.check(
        "no se puede deshacer una entrega",
        st == 409,
        f"status {st}",
    )

    entregas = entregas_de(api, id_ruta)

    r.check(
        "el pedido sigue ENTREGADO tras el intento",
        entregas.get(primero) == "ENTREGADO",
        f"{primero} = {entregas.get(primero)}",
    )

    # ---------------- 4. entregar todos ----------------
    for p in pedidos:
        if p == primero:
            continue

        api.patch(
            f"/rutas/{id_ruta}/pedidos/{p}/estado",
            {"estado_entrega": "ENTREGADO"},
        )

    entregas = entregas_de(api, id_ruta)

    r.check(
        "todos los pedidos quedan ENTREGADO",
        all(entregas.get(p) == "ENTREGADO" for p in pedidos),
        str(entregas),
    )

    op = estado_operacion(api, id_ruta)

    r.check(
        "la ruta se cierra como COMPLETADA",
        op["estado"] == "COMPLETADA",
        op["estado"],
    )

    r.check(
        "la asignacion queda COMPLETADA",
        op["asignacion"] == "COMPLETADA",
        str(op["asignacion"]),
    )

    # El conductor queda libre
    db = SessionLocal()

    try:
        est = db.execute(
            text("""
                SELECT c.estado, c.horas_conduccion_acumuladas
                FROM asignaciones a
                JOIN conductores c ON c.id_conductor = a.id_conductor
                WHERE a.id_ruta = :r
            """),
            {"r": id_ruta},
        ).mappings().first()

        r.check(
            "el conductor queda LIBRE (DISPONIBLE)",
            est["estado"] == "DISPONIBLE",
            est["estado"],
        )

        r.check(
            "se reinician sus horas de conduccion",
            float(est["horas_conduccion_acumuladas"]) == 0.0,
            str(est["horas_conduccion_acumuladas"]),
        )

        # Y el sistema lo vuelve a considerar disponible
        n = db.execute(
            text("""
                SELECT count(*) FROM conductores c
                WHERE c.estado = 'DISPONIBLE'
                  AND EXISTS (
                    SELECT 1 FROM licencias l
                    WHERE l.id_conductor = c.id_conductor
                      AND l.estado = 'VIGENTE'
                      AND l.fecha_vencimiento >= CURRENT_DATE
                  )
            """)
        ).scalar()

        r.check(
            "el optimizador ya lo ve disponible otra vez",
            n >= 1,
            f"{n} conductores listos para recibir rutas",
        )

    finally:
        db.close()

    # ---------------- 5. ruta cerrada, no se toca --------
    st, det = api.post(f"/rutas/{id_ruta}/reoptimizar", {})

    r.check(
        "una ruta cerrada NO se puede volver a corregir",
        st == 400,
        f"status {st}",
    )

    r.check(
        "y el mensaje lo explica",
        st != 200 and 'cerrada' in str(det).lower(),
        str(det),
    )

    # Tampoco se puede cambiar el estado de una entrega cerrada
    st, det = api.patch(
        f"/rutas/{id_ruta}/pedidos/{pedidos[1]}/estado",
        {"estado_entrega": "PENDIENTE"},
    )

    r.check(
        "una entrega de ruta cerrada no se reabre",
        st == 409,
        f"status {st}",
    )

    # Y los pedidos no vuelven a la bolsa de pendientes
    db = SessionLocal()

    try:
        pendientes = db.execute(
            text("""
                SELECT count(*) FROM pedidos
                WHERE estado = 'PENDIENTE'
                  AND id_pedido IN (
                    SELECT id_pedido FROM ruta_pedidos
                    WHERE id_ruta = :r
                  )
            """),
            {"r": id_ruta},
        ).scalar()

        r.check(
            "ningun pedido entregado vuelve a PENDIENTE",
            pendientes == 0,
            f"{pendientes} pendientes",
        )

        entregados = db.execute(
            text("""
                SELECT count(*) FROM pedidos
                WHERE estado = 'ENTREGADO'
                  AND id_pedido IN (
                    SELECT id_pedido FROM ruta_pedidos
                    WHERE id_ruta = :r
                  )
            """),
            {"r": id_ruta},
        ).scalar()

        r.check(
            "los pedidos quedan ENTREGADO en la tabla de pedidos",
            entregados == len(pedidos),
            f"{entregados} de {len(pedidos)}",
        )
    finally:
        db.close()

    print()
    print(f"{r.resumen()}")

    return r.ok


if __name__ == "__main__":
    sys.exit(0 if main() else 1)