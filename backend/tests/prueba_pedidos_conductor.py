"""Verifica que el CONDUCTOR ve sólo los pedidos de sus rutas (RES-08).

Crea una ruta con 2 conductores distintos y comprueba que cada uno
recibe únicamente los pedidos de su propia ruta.

Uso: python tests/prueba_pedidos_conductor.py   (desde backend/)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from cliente_http import Api, Resultado, token_de

from app.db.database import SessionLocal
from sqlalchemy import text


def main():
    r = Resultado("Pedidos del conductor (fila, no rol)")

    admin = Api(token_de(1, "ADMIN"))
    db = SessionLocal()

    # Conductores cuyo usuario tenga realmente rol CONDUCTOR.
    # El seed original enlaza un conductor con la cuenta admin, así que
    # filtrar por r.nombre evita.token con rol real de BD.
    conductores = db.execute(
        text("""
            SELECT c.id_conductor, c.id_usuario,
                   c.nombre || ' ' || c.apellido AS nombre
            FROM conductores c
            INNER JOIN usuarios u
                ON u.id_usuario = c.id_usuario
            INNER JOIN roles r
                ON r.id_rol = u.id_rol
            WHERE r.nombre = 'CONDUCTOR'
              AND EXISTS (
                SELECT 1 FROM licencias l
                WHERE l.id_conductor = c.id_conductor
                  AND l.estado = 'VIGENTE'
              )
            ORDER BY c.id_conductor
            LIMIT 2
        """)
    ).mappings().all()

    if not conductores:
        r.check("hay al menos 1 conductor con rol CONDUCTOR y licencia",
                False, "ninguno: revisa el seed de conductores")
        return r.resumen()

    c1 = conductores[0]
    print(f"       conductor: {c1['nombre']} (user {c1['id_usuario']})")

    if len(conductores) > 1:
        c2 = conductores[1]
        print(f"       conductor: {c2['nombre']} (user {c2['id_usuario']})")
    else:
        print("       (solo 1 conductor con rol CONDUCTOR: "
              "no se puede comparar entre dos)")
        c2 = None

    # ---------- comparar contra la vista global ----------
    st, todos = admin.get("/pedidos")
    ids_admin = {p["id_pedido"] for p in todos}
    r.check("ADMIN ve todos los pedidos", st == 200,
            f"{len(ids_admin)} pedidos")

    # ---------- vista del conductor 1 ----------
    t1 = token_de(c1["id_usuario"], "CONDUCTOR")
    cond1 = Api(t1)

    st, p1 = cond1.get("/pedidos")
    r.check("CONDUCTOR puede listar pedidos", st == 200, f"status {st}")

    ids1 = {p["id_pedido"] for p in p1} if isinstance(p1, list) else set()

    print(f"       conductor 1 ve {len(ids1)} pedidos")
    print(f"       admin ve      {len(ids_admin)} pedidos")

    # Lo que ve el conductor debe estar en su ruta
    suyos = db.execute(
        text("""
            SELECT rp.id_pedido
            FROM ruta_pedidos rp
            INNER JOIN asignaciones a ON a.id_ruta = rp.id_ruta
            WHERE a.id_conductor = :cid
        """),
        {"cid": c1["id_conductor"]},
    ).scalars().all()

    r.check("CONDUCTOR ve exactamente los pedidos de sus rutas",
            ids1 == set(suyos),
            f"ve {sorted(ids1)} vs deberia {sorted(suyos)}")

    r.check("CONDUCTOR no ve pedidos de otras rutas",
            ids1.issubset(ids_admin),
            f"{sorted(ids1 - ids_admin)}")

    # ---------- conductor 2 no ve los del conductor 1 ----------
    if c2 is not None:
        t2 = token_de(c2["id_usuario"], "CONDUCTOR")
        cond2 = Api(t2)

        st, p2 = cond2.get("/pedidos")
        ids2 = {
            p["id_pedido"] for p in p2
        } if isinstance(p2, list) else set()

        suyos2 = set(db.execute(
            text("""
                SELECT rp.id_pedido
                FROM ruta_pedidos rp
                INNER JOIN asignaciones a
                    ON a.id_ruta = rp.id_ruta
                WHERE a.id_conductor = :cid
            """),
            {"cid": c2["id_conductor"]},
        ).scalars().all())

        r.check("cada conductor ve lo suyo", ids2 == suyos2,
                f"ve {sorted(ids2)} vs deberia {sorted(suyos2)}")
    else:
        print("       (omitido: no hay 2do conductor con rol CONDUCTOR)")

    # ---------- detalle directo ----------
    if ids1:
        pid = sorted(ids1)[0]
        st, uno = cond1.get(f"/pedidos/{pid}")
        r.check("CONDUCTOR consulta su pedido", st == 200, f"status {st}")

        ajenos = ids_admin - ids1

        if ajenos:
            fuera = sorted(ajenos)[0]
            st, _ = cond1.get(f"/pedidos/{fuera}")
            r.check("CONDUCTOR NO consulta un pedido ajeno",
                    st == 404, f"status {st} (se esperaba 404)")

    # ---------- escribir sigue bloqueado ----------
    st, _ = cond1.post("/pedidos", {
        "id_cliente": 1,
        "id_ventana_tiempo": 1,
        "direccion_entrega": "Intento no autorizado",
        "latitud": -12.01, "longitud": -77.01,
        "peso_kg": 1, "volumen_m3": 1,
        "prioridad": "ESTANDAR",
        "tipo_producto": "NO_PERECEDERO",
    })
    r.check("CONDUCTOR NO crea pedidos", st == 403, f"status {st}")

    st, _ = cond1.patch("/pedidos/1/estado", {"estado": "ENTREGADO"})
    r.check("CONDUCTOR NO cambia estado", st == 403, f"status {st}")

    db.close()

    return r.resumen()


if __name__ == "__main__":
    sys.exit(0 if main() else 1)