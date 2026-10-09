"""Gestión de usuarios de prueba por rol.

Las contraseñas se guardan con bcrypt (una sola vía), así que no se
pueden recuperar: solo restablecer. Este script permite:

  - restablecer la contraseña de un usuario existente
  - crear los usuarios que falten para validar cada rol

Uso (desde backend/):

    python tests/usuarios_demo.py listar
    python tests/usuarios_demo.py resetar <email> <contrasena>
    python tests/usuarios_demo.py crear

Contraseña por defecto de los usuarios de demo: Demo1234
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from app.core.security import hash_password
from app.db.database import SessionLocal
from sqlalchemy import text


CONTRASENA_DEMO = "Demo1234"

# Un usuario por cada rol de la tabla roles
USUARIOS_DEMO = [
    {
        "email": "admin@ecolima.com",
        "nombre": "Administrador EcoLima",
        "id_rol": 1,
    },
    {
        "email": "operador@ecolima.com",
        "nombre": "Operador Demo",
        "id_rol": 2,
    },
    {
        "email": "conductor@ecolima.com",
        "nombre": "Conductor Demo",
        "id_rol": 3,
    },
    {
        "email": "auditor@ecolima.com",
        "nombre": "Auditor Demo",
        "id_rol": 4,
    },
    {
        "email": "cliente@ecolima.com",
        "nombre": "Cliente Demo",
        "id_rol": 5,
    },
]


def listar():
    db = SessionLocal()

    print(f"{'id':>3}  {'rol':<10} {'email':<32} estado")
    print("-" * 60)

    for r in db.execute(
        text("""
            SELECT u.id_usuario, r.nombre AS rol,
                   u.email, u.estado
            FROM usuarios u
            INNER JOIN roles r ON r.id_rol = u.id_rol
            ORDER BY r.id_rol, u.id_usuario
        """)
    ).mappings():
        print(
            f"{r['id_usuario']:>3}  {r['rol']:<10} "
            f"{r['email']:<32} {r['estado']}"
        )

    db.close()


def resetar(email, contrasena):
    db = SessionLocal()

    usuario = db.execute(
        text("SELECT id_usuario FROM usuarios WHERE email = :e"),
        {"e": email},
    ).scalar()

    if not usuario:
        print(f"No existe el usuario {email}")
        db.close()
        return 1

    db.execute(
        text("""
            UPDATE usuarios
            SET password_hash = :hash,
                intentos_fallidos = 0,
                bloqueado_hasta = NULL,
                estado = 'ACTIVO'
            WHERE email = :e
        """),
        {"e": email, "hash": hash_password(contrasena)},
    )

    db.commit()
    db.close()

    print(f"Contraseña de {email} restablecida.")
    print("  intentos fallidos = 0, bloqueo despejado, estado ACTIVO")

    return 0


def crear():
    db = SessionLocal()
    creados = 0

    for u in USUARIOS_DEMO:
        existe = db.execute(
            text("SELECT id_usuario FROM usuarios WHERE email = :e"),
            {"e": u["email"]},
        ).scalar()

        if existe:
            print(f"  ya existe: {u['email']}")

            # si existe pero está bloqueado o inactivo, lo revive
            db.execute(
                text("""
                    UPDATE usuarios
                    SET estado = 'ACTIVO',
                        intentos_fallidos = 0,
                        bloqueado_hasta = NULL
                    WHERE email = :e
                """),
                {"e": u["email"]},
            )

            continue

        db.execute(
            text("""
                INSERT INTO usuarios (
                    id_rol, nombre, email,
                    password_hash, estado
                )
                VALUES (
                    :id_rol, :nombre, :email,
                    :hash, 'ACTIVO'
                )
            """),
            {
                "id_rol": u["id_rol"],
                "nombre": u["nombre"],
                "email": u["email"],
                "hash": hash_password(CONTRASENA_DEMO),
            },
        )

        print(f"  creado: {u['email']} (rol {u['id_rol']})")
        creados += 1

    db.commit()

    # El cliente demo necesita un cliente con el mismo correo para que
    # pueda ver sus pedidos (el filtro de fila se hace por email).
    existe_cliente = db.execute(
        text("SELECT id_cliente FROM clientes WHERE email = :e"),
        {"e": "cliente@ecolima.com"},
    ).scalar()

    if not existe_cliente:
        db.execute(
            text("""
                INSERT INTO clientes (
                    nombre, email, direccion,
                    latitud, longitud, estado
                )
                VALUES (
                    'Cliente Demo', 'cliente@ecolima.com',
                    'Av. Siempre Viva 742, San Juan de Lurigancho',
                    -12.01, -77.005, 'ACTIVO'
                )
            """)
        )

        print("  creado cliente homónimo para el rol CLIENTE")

    db.commit()
    db.close()

    print(f"\n  {creados} usuario(s) creado(s).")
    print(f"  Contraseña de todos: {CONTRASENA_DEMO}")

    return 0


if __name__ == "__main__":
    accion = sys.argv[1] if len(sys.argv) > 1 else "listar"

    if accion == "listar":
        listar()
        sys.exit(0)

    if accion == "resetar":
        if len(sys.argv) < 4:
            print("Uso: resetar <email> <contrasena>")
            sys.exit(1)

        sys.exit(resetar(sys.argv[2], sys.argv[3]))

    if accion == "crear":
        sys.exit(crear())

    print("Acciones: listar | crear | resetar <email> <contrasena>")
    sys.exit(1)