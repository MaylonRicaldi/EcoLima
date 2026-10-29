"""¿Se comporta bien el orden de una orden nueva?

Comprueba la regla del negocio completa:

  1. Un pedido suelto se puede encargar a una ruta en marcha y entra
     en ella (no se crea otra ruta).
  2. No se puede encargar dos veces el mismo pedido.
  3. El sistema propone un orden, con los números que lo sostienen.
  4. El tiempo manda sobre la distancia: si el pedido que está más
     lejos se le está yendo la ventana, ese va primero.
  5. Si el pedido nuevo está más cerca y nada urge, se propone
     adelantarlo.
  6. Nada cambia solo: hasta que no se confirma, el orden es el de
     antes.
  7. Al confirmar, ese pedido pasa el primero y el resto no se mueve.
  8. Una entrega ya cerrada no se puede adelantar.
  9. Un envío nunca está en dos rutas a la vez.
"""
import sys

sys.path.insert(0, ".")
sys.path.insert(0, "tests")

from sqlalchemy import text

from cliente_http import Api, Resultado, token_de
from app.db.database import SessionLocal


def estado_ruta(id_ruta):
    db = SessionLocal()
    try:
        fila = db.execute(
            text("SELECT estado FROM rutas WHERE id_ruta = :id"),
            {"id": id_ruta},
        ).mappings().first()

        pedidos = db.execute(text("""
            SELECT rp.id_pedido, rp.orden_visita, rp.estado_entrega
            FROM ruta_pedidos rp
            WHERE rp.id_ruta = :id
            ORDER BY rp.orden_visita
        """), {"id": id_ruta}).mappings().all()

        return (fila["estado"] if fila else None), [dict(p) for p in pedidos]
    finally:
        db.close()


def main():
    r = Resultado("Encargar otra orden a una ruta en marcha")

    db = SessionLocal()
    try:
        admin = db.execute(text(
            "SELECT id_usuario FROM usuarios "
            "WHERE email = 'admin@ecolima.com'"
        )).scalar_one()

        ruta = db.execute(text("""
            SELECT r.id_ruta
            FROM rutas r
            WHERE r.estado IN ('PLANIFICADA', 'EN_CURSO', 'REOPTIMIZADA')
              AND EXISTS (
                SELECT 1 FROM ruta_pedidos rp
                WHERE rp.id_ruta = r.id_ruta
                  AND rp.estado_entrega = 'PENDIENTE'
              )
            ORDER BY r.id_ruta DESC
            LIMIT 1
        """)).scalar()

        # Un pedido suelto de verdad
        suelto = db.execute(text("""
            SELECT p.id_pedido
            FROM pedidos p
            WHERE p.estado = 'PENDIENTE'
              AND NOT EXISTS (
                SELECT 1 FROM ruta_pedidos rp
                WHERE rp.id_pedido = p.id_pedido
              )
            ORDER BY p.id_pedido DESC
            LIMIT 1
        """)).scalar()
    finally:
        db.close()

    if ruta is None or suelto is None:
        print()
        print("No hay una ruta con pedidos pendientes y a la vez un")
        print("pedido suelto. Planifica una ruta y crea un pedido más.")
        return True

    api = Api(token_de(admin, "ADMIN"))

    print(f"Ruta {ruta}, pedido suelto {suelto}")
    print()

    # ---------------- 1. se puede encargar ----------------

    estado_antes, pedidos_antes = estado_ruta(ruta)

    print(f"  Antes: {estado_antes}, "
          f"{len(pedidos_antes)} pedidos, orden "
          f"{[p['id_pedido'] for p in pedidos_antes]}")

    st, res = api.request(
        "POST", f"/rutas/{ruta}/pedidos", {"id_pedido": suelto}
    )

    r.check("encargar un pedido devuelve 200", st == 200, f"status {st}")

    if st != 200:
        print(f"    {res}")
        return False

    estado_despues, pedidos_despues = estado_ruta(ruta)

    print(f"  Después: {estado_despues}, "
          f"{len(pedidos_despues)} pedidos, orden "
          f"{[p['id_pedido'] for p in pedidos_despues]}")

    r.check(
        "el pedido entra en la ruta",
        any(p["id_pedido"] == suelto for p in pedidos_despues),
        f"orden {[p['id_pedido'] for p in pedidos_despues]}",
    )

    r.check(
        "entra al final, sin reordenar nada solo",
        pedidos_despues[-1]["id_pedido"] == suelto,
        f"último: {pedidos_despues[-1]['id_pedido']}",
    )

    r.check(
        "no se crea otra ruta",
        len(pedidos_despues) == len(pedidos_antes) + 1,
        f"{len(pedidos_antes)} -> {len(pedidos_despues)}",
    )

    r.check(
        "la ruta sigue siendo la misma",
        estado_despues in ('PLANIFICADA', 'EN_CURSO'),
        estado_despues,
    )

    # ---------------- 2. no se encarga dos veces ----------------

    st, err = api.request(
        "POST", f"/rutas/{ruta}/pedidos", {"id_pedido": suelto}
    )

    r.check("encargarlo otra vez se rechaza", st == 409, f"status {st}")

    # ---------------- 3. la recomendación trae números ----------------

    rec = res["recomendacion"]

    print()
    print(f"  Recomendación: {rec['recomendacion']} "
          f"({rec['motivo']})")
    print(f"    desde: {rec['desde']}")
    print(f"    margen de urgencia: "
          f"{rec['margen_urgencia_minutos']} min")

    for etiqueta, key in (("la que viene", "actual"), ("la nueva", "nuevo")):
        c = rec[key]

        if c:
            print(f"    {etiqueta:<13} #{c['id_pedido']:<5} "
                  f"{c['km']:>6} km {c['minutos']:>6} min  "
                  f"cierra {c['hora_fin']}  "
                  f"{'URGENTE' if c['urgente'] else 'normal'}")

    r.check(
        "la recomendación dice algo",
        rec["recomendacion"] in ("ANTICIPAR", "MANTENER"),
        rec["recomendacion"],
    )

    r.check(
        "el motivo es uno de los previstos",
        rec["motivo"] in (
            "MAS_CERCA", "MAS_LEJOS",
            "URGENTE_ACTUAL", "URGENTE_NUEVO",
        ),
        rec["motivo"],
    )

    r.check(
        "trae las dos candidatos con distancia y minutos",
        rec["nuevo"] is not None
        and "km" in rec["nuevo"]
        and "minutos" in rec["nuevo"]
        and (
            rec["actual"] is None
            or "minutos" in rec["actual"]
        ),
    )

    # ---------------- 4 y 5. la regla de decisión ----------------

    if rec["actual"] and rec["nuevo"]:
        a, n = rec["actual"], rec["nuevo"]

        if n["urgente"] and not a["urgente"]:
            r.check(
                "si urge el nuevo, va primero aunque esté más lejos",
                rec["recomendacion"] == "ANTICIPAR",
                f"{rec['recomendacion']} (nuevo {n['minutos']} min, "
                f"actual {a['minutos']} min)",
            )

        elif a["urgente"] and not n["urgente"]:
            r.check(
                "si urge el que ya venía, se termina primero",
                rec["recomendacion"] == "MANTENER",
                f"{rec['recomendacion']} (actual {a['minutos']} min, "
                f"nuevo {n['minutos']} min)",
            )

        elif n["minutos"] < a["minutos"]:
            r.check(
                "si el nuevo está más cerca y nada urge, se adelanta",
                rec["recomendacion"] == "ANTICIPAR",
                f"{rec['recomendacion']}",
            )

        else:
            r.check(
                "si el nuevo está más lejos, se sigue el orden",
                rec["recomendacion"] == "MANTENER",
                f"{rec['recomendacion']}",
            )

    # ---------------- 6. nada cambia solo ----------------

    _, pedidos_preguntando = estado_ruta(ruta)

    st, _ = api.request(
        "GET",
        f"/rutas/{ruta}/pedidos/{suelto}/orden-sugerido",
    )

    _, pedidos_despues_de_preguntar = estado_ruta(ruta)

    r.check("preguntar no cambia el orden",
            pedidos_preguntando == pedidos_despues_de_preguntar)

    r.check("preguntar el orden devuelve 200", st == 200, f"status {st}")

    # ---------------- 7. al confirmar, se adelanta ----------------

    pendientes = [
        p for p in pedidos_despues_de_preguntar
        if p["estado_entrega"] == "PENDIENTE"
    ]

    primero = pendientes[0]["id_pedido"]

    st, res2 = api.request(
        "POST", f"/rutas/{ruta}/pedidos/{suelto}/anticipar"
    )

    r.check("adelantar devuelve 200", st == 200, f"status {st}")

    if st == 200:
        _, pedidos_finales = estado_ruta(ruta)

        pendientes_finales = [
            p for p in pedidos_finales
            if p["estado_entrega"] == "PENDIENTE"
        ]

        orden_final = [p["id_pedido"] for p in pendientes_finales]
        orden_previo = [p["id_pedido"] for p in pendientes]

        print()
        print(f"  Orden antes de confirmar: {orden_previo}")
        print(f"  Orden después          : {orden_final}")
        print()

        if primero == suelto:
            r.check("si ya era el primero, no hace nada", True)

        else:
            r.check(
                "el pedido adelantado queda primero",
                orden_final[0] == suelto,
                f"primero: {orden_final[0]}",
            )

            # El que estaba primero no se entrega todavía: se queda
            # esperando en la cola, al final. Lo que no debe pasar es
            # que los demás se barajen entre ellos.
            r.check(
                "el que era primero vuelve a la cola",
                orden_final[-1] == primero,
                f"último: {orden_final[-1]}, era {primero}",
            )

            r.check(
                "los demás conservan su orden relativo",
                orden_final[1:-1] == orden_previo[1:-1],
                f"{orden_final[1:-1]} vs {orden_previo[1:-1]}",
            )

            r.check(
                "no se suelta ningún pedido",
                sorted(orden_final) == sorted(orden_previo),
            )

    # ---------------- 8. entrega cerrada no se adelanta ----------------

    db = SessionLocal()
    try:
        cerrada = db.execute(text("""
            SELECT rp.id_pedido
            FROM ruta_pedidos rp
            INNER JOIN rutas r ON r.id_ruta = rp.id_ruta
            WHERE rp.id_ruta = :id
              AND rp.estado_entrega IN ('ENTREGADO', 'FALLIDO')
            LIMIT 1
        """), {"id": ruta}).scalar()
    finally:
        db.close()

    if cerrada is None:
        print()
        print("  No hay entregas cerradas en esta ruta: "
              "no se comprueba ese caso.")
    else:
        st, _ = api.request(
            "POST", f"/rutas/{ruta}/pedidos/{cerrada}/anticipar"
        )

        r.check(
            "una entrega cerrada no se puede adelantar",
            st == 404,
            f"status {st}",
        )

    # ---------------- 9. nunca dos rutas ----------------

    db = SessionLocal()
    try:
        repetidos = db.execute(text("""
            SELECT id_pedido, COUNT(*)
            FROM ruta_pedidos
            GROUP BY id_pedido
            HAVING COUNT(*) > 1
        """)).all()
    finally:
        db.close()

    r.check(
        "ningún envío está en dos rutas",
        not repetidos,
        f"{len(repetidos)} repetidos",
    )

    print()
    print(f"{r.resumen()}")

    return r.ok


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
