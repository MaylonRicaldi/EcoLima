"""Limpieza de cuentas de prueba y duplicadas.

Deja una cuenta por cada rol del sistema, más los conductores que
tienen ficha (los que el sistema usa al asignar rutas).

Uso (desde backend/):

    python tests/limpiar_cuentas.py listar
    python tests/limpiar_cuentas.py limpiar
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from sqlalchemy import text

from app.db.database import SessionLocal


# Cuentas de demostración, una por rol. Son las que usa
# usuarios_demo.py y probar_cuentas.py.
CUENTAS_DEMO = [
    "admin@ecolima.com",
    "operador@ecolima.com",
    "conductor@ecolima.com",
    "auditor@ecolima.com",
    "cliente@ecolima.com",
]

# Cuentas que se pueden borrar: o son basura de las pruebas, o
# duplican el rol de otra cuenta sin aportar nada.
BORRABLES = [
    # La creaba prueba_permisos.py en cada corrida y nunca se borraba
    "prueba.permisos@ecolima.com",
    # Segundo operador sin contraseña conocida, no lo usa nadie
    "carlos@ecolima.com",
]

INVENTARIO = text(
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


def listar():
    db = SessionLocal()

    print("id | rol       | estado   | ficha | email")
    print("---+-----------+----------+-------+-------------------------------")

    for fila in db.execute(INVENTARIO).mappings():
        marca = "  (demo)" if fila["email"] in CUENTAS_DEMO else ""

        print(
            f'{fila["id_usuario"]:>2} '
            f'| {fila["rol"]:<9} '
            f'| {fila["estado"]:<8} '
            f'| {fila["ficha"]:>5} '
            f'| {fila["email"]}{marca}'
        )

    db.close()


def limpiar():
    db = SessionLocal()

    total = 0

    for correo in BORRABLES:
        resultado = db.execute(
            text("""
                DELETE FROM usuarios
                WHERE email = :e
                  AND NOT EXISTS (
                      SELECT 1 FROM conductores
                      WHERE conductores.id_usuario = usuarios.id_usuario
                  )
            """),
            {"e": correo},
        )

        borrados = resultado.rowcount

        total += borrados

        if borrados:
            print(f"  borrada: {correo}")
        else:
            print(
                f"  se conserva: {correo} "
                f"(no existe o tiene ficha de conductor)"
            )

    db.commit()
    db.close()

    print(f"\n{total} cuenta(s) eliminada(s).")

    return 0


if __name__ == "__main__":
    accion = sys.argv[1] if len(sys.argv) > 1 else "listar"

    if accion == "listar":
        listar()
        sys.exit(0)

    if accion == "limpiar":
        sys.exit(limpiar())

    print("Acciones: listar | limpiar")
    sys.exit(1)