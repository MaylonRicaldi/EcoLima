"""Deja la base limpia para empezar de cero.

Borra los datos de la operación y las cuentas, y conserva lo que el
administrador necesita para arrancar:

  Se conserva
    roles                los cinco roles del sistema
    usuarios             sólo admin@ecolima.com
    vehiculos            la flota
    tipos_vehiculo       el catálogo de tipos
    ventanas_tiempo      las ventanas configuradas
    ubicaciones, reportes, compensacion_carbono

  Se borra
    pedidos, rutas, ruta_pedidos, paradas_ruta, indicadores_ruta,
    asignaciones
    conductores, licencias
    clientes
    trafico, incidentes

El orden respeta las claves foráneas: de la hoja hacia la raíz.

Uso (desde backend/):

    python tests/vaciar_base.py            # muestra qué haría
    python tests/vaciar_base.py --aplicar
"""
import sys

sys.path.insert(0, ".")

from sqlalchemy import text

from app.db.database import SessionLocal

ADMIN = "admin@ecolima.com"

# Tablas que quedan vacías, en el orden en que se deben borrar.
VACIAR = [
    # --- dependencias de la operación ---
    "paradas_ruta",
    "indicadores_ruta",
    "ruta_pedidos",
    "asignaciones",
    "rutas",
    "pedidos",

    # --- personas y habilitaciones ---
    "licencias",
    "conductores",

    # --- clientes ---
    "clientes",

    # --- contexto de operación ---
    "incidentes",
    "trafico",
]

CONSERVAR = [
    "roles",
    "vehiculos",
    "tipos_vehiculo",
    "ventanas_tiempo",
    "ubicaciones",
    "reportes",
    "compensacion_carbono",
]


def conteos(db):
    print("Antes:")
    print()

    for tabla in VACIAR:
        total = db.execute(text(f"SELECT count(*) FROM {tabla}")).scalar_one()

        if total:
            print(f"  {tabla:20} {total:>5}   <- se borra")

    total = db.execute(
        text("SELECT count(*) FROM usuarios WHERE email <> :a"),
        {"a": ADMIN},
    ).scalar_one()

    if total:
        print(f"  {'usuarios (otros)':20} {total:>5}   <- se borra")

    print()

    for tabla in CONSERVAR:
        total = db.execute(text(f"SELECT count(*) FROM {tabla}")).scalar_one()

        print(f"  {tabla:20} {total:>5}   <- se conserva")

    print()


def aplicar(db):
    print("Vaciando...\n")

    for tabla in VACIAR:
        borrados = db.execute(
            text(f"DELETE FROM {tabla}")
        ).rowcount

        if borrados:
            print(f"  {tabla:20} {borrados:>5}")

    borrados = db.execute(
        text("DELETE FROM usuarios WHERE email <> :a"),
        {"a": ADMIN},
    ).rowcount

    if borrados:
        print(f"  {'usuarios':20} {borrados:>5}")

    db.commit()

    # La secuencia de ids de los usuarios borrados queda corrida; se
    # reinicia para que el siguiente creado salga con id bajo.
    db.execute(
        text("""
            SELECT setval(
                'usuarios_id_usuario_seq',
                COALESCE(
                    (SELECT max(id_usuario) FROM usuarios),
                    0
                ) + 1,
                false
            )
        """)
    )

    db.commit()

    print()
    print("Base limpia.")


def main():
    db = SessionLocal()

    try:
        admin = db.execute(
            text("SELECT id_usuario FROM usuarios WHERE email = :a"),
            {"a": ADMIN},
        ).scalar()

        if admin is None:
            print(f"No existe {ADMIN}. No se toca la base.")
            return 1

        conteos(db)

        if '--aplicar' in sys.argv:
            print("⚠ Esto borra datos. Escribe 'APLICAR' para confirmar:")
            confirmacion = input()

            if confirmacion.strip().upper() != 'APLICAR':
                print("Cancelado.")
                return 0

            aplicar(db)
        else:
            print("Nada se ha borrado. Usa --aplicar si estás seguro.")

        return 0

    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())