"""¿Marcar ENTREGADO en Rutas se refleja en Pedidos?

Comprueba la cadena entera, no sólo el código:

  1. el estado del pedido en /pedidos antes
  2. se marca ENTREGADO por la vía de Rutas
  3. el estado del pedido en /pedidos después

Si el paso 3 no dice ENTREGADO, la sincronización está rota.
"""
import sys

sys.path.insert(0, ".")
sys.path.insert(0, "tests")

from sqlalchemy import text

from cliente_http import Api, token_de
from app.db.database import SessionLocal


def estado_en_pedidos(api, id_pedido):
    for p in api.get("/pedidos")[1]:
        if p["id_pedido"] == id_pedido:
            return p["estado"]

    return None


def main():
    db = SessionLocal()
    try:
        admin = db.execute(text(
            "SELECT id_usuario FROM usuarios "
            "WHERE email = 'admin@ecolima.com'"
        )).scalar_one()

        # Un pedido pendiente dentro de una ruta no cerrada
        fila = db.execute(text("""
            SELECT rp.id_ruta, rp.id_pedido, p.estado
            FROM ruta_pedidos rp
            INNER JOIN pedidos p ON p.id_pedido = rp.id_pedido
            INNER JOIN rutas r ON r.id_ruta = rp.id_ruta
            WHERE rp.estado_entrega = 'PENDIENTE'
              AND r.estado NOT IN ('COMPLETADA','CANCELADA')
            ORDER BY rp.id_ruta DESC
            LIMIT 1
        """)).mappings().first()
    finally:
        db.close()

    if fila is None:
        print("No hay ningún pedido pendiente en una ruta abierta.")
        return True

    id_ruta, id_pedido = fila["id_ruta"], fila["id_pedido"]

    api = Api(token_de(admin, "ADMIN"))

    print(f"Ruta {id_ruta}, pedido {id_pedido}")
    print()

    # ---------------- Rutas -> Pedidos ----------------
    print("  Vía del módulo Rutas (PATCH /rutas/.../estado)")
    print()

    antes = estado_en_pedidos(api, id_pedido)
    print(f"    /pedidos antes   : {antes}")

    st, r = api.request(
        "PATCH", f"/rutas/{id_ruta}/pedidos/{id_pedido}/estado",
        {"estado_entrega": "ENTREGADO"},
    )
    print(f"    PATCH estado     : {st}")

    if st != 200:
        print(f"      {r}")
        return False

    despues = estado_en_pedidos(api, id_pedido)
    print(f"    /pedidos después : {despues}")

    db = SessionLocal()
    try:
        crudo = db.execute(
            text("SELECT estado FROM pedidos WHERE id_pedido = :id"),
            {"id": id_pedido},
        ).scalar()
    finally:
        db.close()

    print(f"    base de datos    : {crudo}")
    print()

    ok = despues == "ENTREGADO" and crudo == "ENTREGADO"

    print(
        f"  {'Coincide' if ok else 'NO coincide'}"
        " al marcar entregado en Rutas."
    )
    print()

    # ---------------- Pedidos -> Rutas ----------------
    db = SessionLocal()
    try:
        admin = db.execute(text(
            "SELECT id_usuario FROM usuarios "
            "WHERE email = 'admin@ecolima.com'"
        )).scalar_one()

        otro = db.execute(text("""
            SELECT rp.id_ruta, rp.id_pedido
            FROM ruta_pedidos rp
            INNER JOIN rutas r ON r.id_ruta = rp.id_ruta
            WHERE rp.estado_entrega = 'PENDIENTE'
              AND r.estado NOT IN ('COMPLETADA','CANCELADA')
            ORDER BY rp.id_ruta DESC
            LIMIT 1
        """)).mappings().first()
    finally:
        db.close()

    if otro is None:
        print("  No queda ningún pedido pendiente para probar la vía"
              " de Pedidos.")
        return ok

    id_pedido2 = otro["id_pedido"]
    id_ruta2 = otro["id_ruta"]

    print(f"  Vía del módulo Pedidos (PATCH /pedidos/{id_pedido2}/estado)")
    print()

    st, _ = api.request(
        "PATCH", f"/pedidos/{id_pedido2}/estado", {"estado": "ENTREGADO"}
    )
    print(f"    PATCH estado     : {st}")

    if st != 200:
        print("    La vía de Pedidos no dejó cerrar la entrega.")
        return False

    st, detalle = api.request("GET", f"/rutas/{id_ruta2}")

    en_ruta = None

    if st == 200:
        for p in detalle.get("pedidos", []):
            if p["id_pedido"] == id_pedido2:
                en_ruta = p.get("estado_entrega")

    print(f"    en la ruta       : {en_ruta}")

    va = en_ruta == "ENTREGADO"

    print(
        f"  {'Coincide' if va else 'NO coincide'}"
        " al marcar entregado en Pedidos."
    )
    print()

    return ok and va


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
