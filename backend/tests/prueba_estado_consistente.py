"""¿Los dos módulos pueden contradecirse?

Hay dos formas de cambiar el estado de un pedido:

  - Rutas:    PATCH /rutas/{id}/pedidos/{id}/estado
  - Pedidos:  PUT /pedidos/{id}

La primera sincroniza las dos tablas. La segunda escribe sólo
`pedidos.estado` y se deja `ruta_pedidos.estado_entrega` como
estuviera. Esta prueba lo comprueba sobre datos de verdad.
"""
import sys

sys.path.insert(0, ".")
sys.path.insert(0, "tests")

from sqlalchemy import text

from cliente_http import Api, token_de
from app.db.database import SessionLocal


def estado_ruta_pedido(id_pedido):
    db = SessionLocal()
    try:
        return db.execute(text("""
            SELECT rp.estado_entrega, rp.id_ruta, r.estado AS estado_ruta
            FROM ruta_pedidos rp
            INNER JOIN rutas r ON r.id_ruta = rp.id_ruta
            WHERE rp.id_pedido = :id
            ORDER BY rp.id_ruta DESC LIMIT 1
        """), {"id": id_pedido}).mappings().first()
    finally:
        db.close()


def estado_pedido(id_pedido):
    db = SessionLocal()
    try:
        return db.execute(
            text("SELECT estado FROM pedidos WHERE id_pedido = :id"),
            {"id": id_pedido},
        ).scalar()
    finally:
        db.close()


def main():
    db = SessionLocal()
    try:
        admin = db.execute(text(
            "SELECT id_usuario FROM usuarios "
            "WHERE email = 'admin@ecolima.com'"
        )).scalar_one()

        # Un pedido que sigue dentro de una ruta en curso
        fila = db.execute(text("""
            SELECT rp.id_pedido, p.id_cliente, p.id_ventana_tiempo,
                   p.direccion_entrega, p.referencia, p.latitud,
                   p.longitud, p.peso_kg, p.volumen_m3, p.prioridad,
                   p.tipo_producto, p.estado
            FROM ruta_pedidos rp
            INNER JOIN pedidos p ON p.id_pedido = rp.id_pedido
            INNER JOIN rutas r ON r.id_ruta = rp.id_ruta
            WHERE rp.estado_entrega = 'PENDIENTE'
              AND r.estado NOT IN ('COMPLETADA','CANCELADA')
            ORDER BY rp.id_ruta DESC LIMIT 1
        """)).mappings().first()
    finally:
        db.close()

    if fila is None:
        print("No hay ningún pedido pendiente en una ruta abierta.")
        print("Planifica una ruta y vuelve a ejecutar.")
        return True

    api = Api(token_de(admin, "ADMIN"))
    id_pedido = fila["id_pedido"]

    datos = {
        "id_cliente": fila["id_cliente"],
        "id_ventana_tiempo": fila["id_ventana_tiempo"],
        "direccion_entrega": fila["direccion_entrega"],
        "referencia": fila["referencia"],
        "latitud": float(fila["latitud"]),
        "longitud": float(fila["longitud"]),
        "peso_kg": float(fila["peso_kg"]),
        "volumen_m3": float(fila["volumen_m3"]),
        "prioridad": fila["prioridad"],
        "tipo_producto": fila["tipo_producto"],
        "estado": fila["estado"],
    }

    print(f"Pedido {id_pedido}")
    print()

    ruta = estado_ruta_pedido(id_pedido)
    print(f"  antes  pedidos.estado          = {estado_pedido(id_pedido)}")
    print(f"  antes  ruta_pedidos.estado     = {ruta['estado_entrega']}  "
          f"(ruta {ruta['id_ruta']} {ruta['estado_ruta']})")
    print()

    # Desde Pedidos se cancela el pedido que el conductor va a llevar
    st, r = api.request("PUT", f"/pedidos/{id_pedido}",
                        {**datos, "estado": "CANCELADO"})
    print(f"  PUT /pedidos estado=CANCELADO -> {st}")
    print()

    ruta = estado_ruta_pedido(id_pedido)
    en_pedidos = estado_pedido(id_pedido)
    en_ruta = ruta["estado_entrega"] if ruta else None

    print(f"  después pedidos.estado         = {en_pedidos}")
    print(f"  después ruta_pedidos.estado    = {en_ruta}")
    print()

    se_contradicen = en_ruta == "PENDIENTE" and en_pedidos == "CANCELADO"

    if se_contradicen:
        print("CONTRADICCIÓN: el pedido aparece cancelado en Pedidos,")
        print("pero la ruta sigue diciendo que está pendiente de reparto.")
        print("El conductor lo lleva igual.")

    else:
        print("Los dos módulos coinciden.")

    return not se_contradicen


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
