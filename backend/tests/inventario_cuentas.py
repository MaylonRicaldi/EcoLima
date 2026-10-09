"""Inventario de cuentas: id, rol, estado y si tiene ficha de conductor."""
import sys

sys.path.insert(0, ".")

from sqlalchemy import text

from app.db.database import SessionLocal

db = SessionLocal()

CONSULTA = text(
    """
    SELECT
        u.id_usuario,
        u.email,
        u.estado,
        r.nombre AS rol,
        (
            SELECT count(*)
            FROM conductores c
            WHERE c.id_usuario = u.id_usuario
        ) AS ficha
    FROM usuarios u
    JOIN roles r ON r.id_rol = u.id_rol
    ORDER BY r.nombre, u.id_usuario
    """
)

print("id | rol       | estado   | ficha | email")
print("---+-----------+----------+-------+-------------------------------")

for fila in db.execute(CONSULTA).mappings():
    print(
        f'{fila["id_usuario"]:>2} '
        f'| {fila["rol"]:<9} '
        f'| {fila["estado"]:<8} '
        f'| {fila["ficha"]:>5} '
        f'| {fila["email"]}'
    )

db.close()