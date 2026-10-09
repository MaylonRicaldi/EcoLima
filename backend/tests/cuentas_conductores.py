"""Reorganiza las cuentas de conductores.

Objetivo: que admin@ecolima.com deje de estar enlazado a un conductor
y que existan 5 conductores con cuentas conductoreco1..5@ecolima.com.

No crea pedidos ni rutas. Reutiliza las fichas de conductor que ya
existen (con sus licencias) en lugar de duplicarlas.

Contrasenas (peticion del usuario): el nombre local del correo.

Uso: python tests/cuentas_conductores.py   (desde backend/)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ".")

from app.core.security import hash_password
from app.db.database import SessionLocal
from sqlalchemy import text


ADMIN_EMAIL = "admin@ecolima.com"
ADMIN_PASSWORD = "admin"

ROL_CONDUCTOR = 3

# (sufijo, nombre, apellido, dni)
CUENTAS = [
    ("conductoreco1", "Carlos", "Perez", "74512415"),
    ("conductoreco2", "Maylon", "Ricaldi", "74154215"),
    ("conductoreco3", "Luis", "Quispe", "70112233"),
    ("conductoreco4", "Ana", "Torres", "70223344"),
    ("conductoreco5", "Jose", "Ramirez", "70334455"),
]

CATEGORIAS = ["A-IIA", "A-IIB", "A-IIIA"]


def obtener_admin(db):
    return db.execute(
        text("""
            SELECT u.id_usuario
            FROM usuarios u
            INNER JOIN roles r ON r.id_rol = u.id_rol
            WHERE u.email = :e AND r.nombre = 'ADMIN'
        """),
        {"e": ADMIN_EMAIL},
    ).scalar()


def main():
    db = SessionLocal()

    try:
        return _cargar(db)
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        print(f"\nERROR: {exc}")
        print("Se revirtieron los cambios.")
        db.close()
        return 1
    finally:
        db.close()


def _cargar(db):
    admin_id = obtener_admin(db)

    if not admin_id:
        print("No se encontro admin@ecolima.com")
        db.close()
        return 1

    # 1. Libera al admin: ninguna ficha de conductor debe apuntarle
    atados = db.execute(
        text("""
            SELECT c.id_conductor, c.nombre, c.apellido
            FROM conductores c
            WHERE c.id_usuario = :id
        """),
        {"id": admin_id},
    ).mappings().all()

    for c in atados:
        print(
            f"  ficha #{c['id_conductor']} "
            f"{c['nombre']} {c['apellido']} apunta al admin "
            "-> se reasigna"
        )

    # 2. Fichas reutilizables. Primero las que apuntan al admin (deben
    #    desvincularse), luego el resto: así ninguna ficha queda con el
    #    usuario administrador.
    atados_ids = [c["id_conductor"] for c in atados]

    resto = db.execute(
        text("""
            SELECT c.id_conductor
            FROM conductores c
            WHERE c.id_usuario <> :id
            ORDER BY c.id_conductor
        """),
        {"id": admin_id},
    ).scalars().all()

    fichas_reutilizables = atados_ids + list(resto)

    print(f"\n  fichas reutilizables: {len(fichas_reutilizables)} "
          f"({len(atados_ids)} estaban enlazadas al admin)")

    # 3. Crea el usuario y liga (o crea) la ficha de cada cuenta
    # DNI ya usados: hay que elegir uno libre (el DDL exige UNIQUE)
    dnis_usados = {
        r[0]
        for r in db.execute(
            text("SELECT dni FROM conductores")
        ).fetchall()
    }

    def dni_libre(candidato):
        if candidato not in dnis_usados:
            dnis_usados.add(candidato)
            return candidato

        # genera uno Sequential que no exista
        base = 70000000 + (len(dnis_usados) * 1111)

        while str(base) in dnis_usados:
            base += 7

        dnis_usados.add(str(base))
        return str(base)

    for idx, (sufijo, nombre, apellido, dni) in enumerate(CUENTAS):
        email = f"{sufijo}@ecolima.com"
        password = sufijo

        ficha_existente = (
            fichas_reutilizables[idx]
            if idx < len(fichas_reutilizables)
            else None
        )

        # usuario
        usuario_id = db.execute(
            text("SELECT id_usuario FROM usuarios WHERE email = :e"),
            {"e": email},
        ).scalar()

        if usuario_id:
            db.execute(
                text("""
                    UPDATE usuarios
                    SET id_rol = :rol,
                        password_hash = :hash,
                        intentos_fallidos = 0,
                        bloqueado_hasta = NULL,
                        estado = 'ACTIVO'
                    WHERE id_usuario = :id
                """),
                {
                    "rol": ROL_CONDUCTOR,
                    "hash": hash_password(password),
                    "id": usuario_id,
                },
            )
            print(f"  usuario actualizado: {email}")
        else:
            usuario_id = db.execute(
                text("""
                    INSERT INTO usuarios (
                        id_rol, nombre, email,
                        password_hash, estado
                    )
                    VALUES (
                        :rol, :nombre, :email,
                        :hash, 'ACTIVO'
                    )
                    RETURNING id_usuario
                """),
                {
                    "rol": ROL_CONDUCTOR,
                    "nombre": f"{nombre} {apellido}",
                    "email": email,
                    "hash": hash_password(password),
                },
            ).scalar()

            print(f"  usuario creado: {email}")

        # ficha de conductor
        if ficha_existente:
            # La ficha se reasigna al usuario de la cuenta y se
            # normalizan nombre/apellido/DNI para que coincidan.
            db.execute(
                text("""
                    UPDATE conductores
                    SET id_usuario = :u,
                        dni = :dni,
                        nombre = :nombre,
                        apellido = :apellido,
                        estado = 'DISPONIBLE',
                        horas_conduccion_acumuladas = 0
                    WHERE id_conductor = :c
                """),
                {
                    "u": usuario_id,
                    "dni": dni_libre(dni),
                    "nombre": nombre,
                    "apellido": apellido,
                    "c": ficha_existente,
                },
            )

            ficha_id = ficha_existente
            print(f"    ficha #{ficha_id} reasignada a {email}")
        else:
            ficha_id = db.execute(
                text("""
                    INSERT INTO conductores (
                        id_usuario, dni, nombre, apellido,
                        telefono, anios_experiencia,
                        hora_disponibilidad_inicio,
                        hora_disponibilidad_fin,
                        horas_max_conduccion,
                        horas_conduccion_acumuladas,
                        estado
                    )
                    VALUES (
                        :u, :dni, :nombre, :apellido,
                        :tel, :anios,
                        TIME '06:00', TIME '20:00',
                        8.0, 0.0, 'DISPONIBLE'
                    )
                    RETURNING id_conductor
                """),
                {
                    "u": usuario_id,
                    "dni": dni_libre(dni),
                    "nombre": nombre,
                    "apellido": apellido,
                    "tel": f"90000000{idx + 1}",
                    "anios": 2 + idx,
                },
            ).scalar()

            print(f"    ficha #{ficha_id} creada")

        # licencia vigente: sin ella el optimizador no lo asigna
        tiene = db.execute(
            text(
                "SELECT count(*) FROM licencias "
                "WHERE id_conductor = :c"
            ),
            {"c": ficha_id},
        ).scalar()

        if not tiene:
            db.execute(
                text("""
                    INSERT INTO licencias (
                        id_conductor, numero, categoria,
                        fecha_emision, fecha_vencimiento, estado
                    )
                    VALUES (
                        :c, :num, :cat,
                        CURRENT_DATE - 365,
                        CURRENT_DATE + 730,
                        'VIGENTE'
                    )
                """),
                {
                    "c": ficha_id,
                    "num": f"Q{email.split('@')[0].upper()[:8]}",
                    "cat": CATEGORIAS[idx % len(CATEGORIAS)],
                },
            )

            print("    licencia VIGENTE creada")

    # 4. contraseña del admin
    db.execute(
        text("""
            UPDATE usuarios
            SET password_hash = :hash,
                intentos_fallidos = 0,
                bloqueado_hasta = NULL,
                estado = 'ACTIVO'
            WHERE id_usuario = :id
        """),
        {"hash": hash_password(ADMIN_PASSWORD), "id": admin_id},
    )

    db.commit()

    # 5. verificación
    print("\n" + "=" * 62)
    print("CUENTAS DE CONDUCTOR")
    print("=" * 62)

    for r in db.execute(
        text("""
            SELECT u.email, u.estado, rr.nombre AS rol,
                   c.id_conductor,
                   c.nombre || ' ' || c.apellido AS conductor,
                   c.estado AS estado_cond,
                   c.dni
            FROM conductores c
            INNER JOIN usuarios u ON u.id_usuario = c.id_usuario
            INNER JOIN roles rr ON rr.id_rol = u.id_rol
            ORDER BY c.id_conductor
        """)
    ).mappings():
        print(
            f"  #{r['id_conductor']} {r['email']:<30} "
            f"rol={r['rol']:<10} {r['conductor']} "
            f"({r['estado_cond']}) dni={r['dni']}"
        )

    admin_es_conductor = db.execute(
        text(
            "SELECT count(*) FROM conductores WHERE id_usuario = :id"
        ),
        {"id": admin_id},
    ).scalar()

    print()
    print(f"  admin@ecolima.com como conductor: {admin_es_conductor} "
          "(debe ser 0)")

    total = db.execute(
        text("SELECT count(*) FROM conductores")).scalar()
    print(f"  total de conductores: {total}")

    return 0


if __name__ == "__main__":
    sys.exit(main())