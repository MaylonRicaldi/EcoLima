"""Migración de la base de datos: dos cambios que el DDL no permitía.

1. licencias.categoria sólo admitía clases A (A-I, A-IIA, A-IIB,
   A-IIIA, A-IIIB, A-IIIC). Las motos en el Perú se conducen con
   clase B (B-I, B-IIA, B-IIB, B-IIC), así que no había dónde
   registrar al conductor que puede manejar una moto.

2. conductores.id_usuario era NOT NULL UNIQUE, lo que obligaba a que
   todo conductor tuviera una cuenta del sistema. Se vuelve opcional:
   el conductor es un registro de la operación y puede no tener
   cuenta. Un UNIQUE sobre una columna NULL sigue admitiendo varios
   NULL, que es justo lo que se necesita.

Uso (desde backend/):

    python tests/migrar_esquema.py        # muestra el estado
    python tests/migrar_esquema.py --aplicar
"""
import sys

sys.path.insert(0, ".")

from sqlalchemy import text

from app.db.database import SessionLocal

# Valores válidos, tomados de la clasificación del MTC:
# clase A para autos/camionetas/camiones/buses y clase B para motos.
CATEGORIAS = (
    "A-I", "A-IIA", "A-IIB", "A-IIIA", "A-IIIB", "A-IIIC",
    "B-I", "B-IIA", "B-IIB", "B-IIC",
)


def lista_sql(valores):
    """Construye la lista de valores de un CHECK de PostgreSQL."""
    return ", ".join(f"'{valor}'" for valor in valores)


def estado(db):
    print("Estado actual:")

    categorias = db.execute(text("""
        SELECT pg_get_constraintdef(oid)
        FROM pg_constraint
        WHERE conrelid = 'licencias'::regclass
          AND conname LIKE 'licencias_categoria%'
    """)).scalar()

    print(f"  licencias.categoria  {categorias}")

    id_usuario = db.execute(text("""
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_name = 'conductores' AND column_name = 'id_usuario'
    """)).scalar()

    nulo = 'nullable' if id_usuario == 'YES' else 'NOT NULL'

    print(f"  conductores.id_usuario  {nulo}")

    return categorias, id_usuario


def aplicar(db):
    print("Aplicando migración...\n")

    # 1. Ampliar las categorías de licencia
    db.execute(text("""
        ALTER TABLE licencias
        DROP CONSTRAINT IF EXISTS licencias_categoria_check
    """))

    db.execute(
        text(
            "ALTER TABLE licencias "
            "ADD CONSTRAINT licencias_categoria_check "
            f"CHECK (categoria IN ({lista_sql(CATEGORIAS)}))"
        )
    )

    print("  1. licencias.categoria ahora admite clases A y B")

    # 2. El conductor ya no está obligado a tener cuenta
    db.execute(text("""
        ALTER TABLE conductores
        ALTER COLUMN id_usuario DROP NOT NULL
    """))

    print("  2. conductores.id_usuario ahora es opcional")

    # Si se borra la cuenta, el conductor no se borra con ella:
    # queda como registro sin acceso al sistema.
    db.execute(text("""
        ALTER TABLE conductores
        DROP CONSTRAINT IF EXISTS conductores_id_usuario_fkey
    """))

    db.execute(text("""
        ALTER TABLE conductores
        ADD CONSTRAINT conductores_id_usuario_fkey
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL
    """))

    print("  3. borrar una cuenta deja el conductor sin acceso, "
          "no lo borra")

    db.commit()
    print("\nMigración aplicada.")


def main():
    db = SessionLocal()

    try:
        categorias, id_usuario = estado(db)

        ya_migrado = "'B-I'" in (categorias or "") and id_usuario == 'YES'

        if ya_migrado:
            print("\nLa base ya está migrada. No hay nada que hacer.")
            return 0

        print()

        if '--aplicar' in sys.argv:
            aplicar(db)
        else:
            print("Falta aplicar. Ejecuta con --aplicar")

        return 0

    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())