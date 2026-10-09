"""Deja la base como estaba: sin datos que dejaron las pruebas.

El orden importa. La tabla ruta_pedidos tiene FK hacia pedidos y
paradas_ruta / indicadores_ruta / asignaciones apuntan a rutas, así
que hay que borrar de la hoja hacia la raíz:

    paradas_ruta -> indicadores_ruta -> ruta_pedidos
        -> asignaciones -> rutas -> pedidos

Uso (desde backend/):
    python tests/limpiar_pedidos_prueba.py
"""
import sys

sys.path.insert(0, ".")

from sqlalchemy import text

from app.db.database import SessionLocal

db = SessionLocal()

# Todo lo que no sea el pedido 1 (el único real del entorno)
CON_PEDIDOS = "SELECT id_pedido FROM pedidos WHERE id_pedido > 1"
CON_RUTAS = """
    SELECT DISTINCT r.id_ruta
    FROM rutas r
    LEFT JOIN ruta_pedidos rp ON rp.id_ruta = r.id_ruta
    WHERE rp.id_pedido IN (""" + CON_PEDIDOS + """)
       OR r.fecha > (SELECT MAX(fecha) FROM rutas)
"""

PASOS = [
    ("paradas", f"DELETE FROM paradas_ruta WHERE id_ruta IN ({CON_RUTAS})"),
    (
        "indicadores",
        f"DELETE FROM indicadores_ruta WHERE id_ruta IN ({CON_RUTAS})",
    ),
    (
        "ruta_pedidos",
        f"DELETE FROM ruta_pedidos WHERE id_pedido IN ({CON_PEDIDOS})",
    ),
    (
        "asignaciones",
        f"DELETE FROM asignaciones WHERE id_ruta IN ({CON_RUTAS})",
    ),
    ("rutas", f"DELETE FROM rutas WHERE id_ruta IN ({CON_RUTAS})"),
    ("pedidos", f"DELETE FROM pedidos WHERE id_pedido IN ({CON_PEDIDOS})"),
]

for nombre, consulta in PASOS:
    borrados = db.execute(text(consulta)).rowcount

    if borrados:
        print(f"  {nombre}: {borrados}")

db.commit()

print()
print(
    "pedidos restantes:",
    [
        f[0]
        for f in db.execute(
            text("SELECT id_pedido FROM pedidos ORDER BY id_pedido")
        )
    ],
)
print(
    "rutas restantes:",
    db.execute(text("SELECT count(*) FROM rutas")).scalar_one(),
)

db.close()