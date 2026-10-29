"""Migración: el local de la empresa.

El punto desde el que salen los envíos es un dato del negocio, no
una constante escrita en el código. Se guarda en la tabla
`ubicaciones`, que ya existía en el DDL pero estaba vacía y sin usar.

El cambio es solo eso: admitir un tipo nuevo. Si la tabla está
vacía, como aquí, no hay que migrar ningún registro.

Además se deja una fila prepared con el Puerto de Callao como
valor por defecto. Las coordenadas son una aproximación razonable
del puerto (Av. San Martín, Callao): en cuanto se abra el sistema
hay que colocar el icono en el mapa para corregirlo, que es
justamente para lo que se pidió poder hacerlo.

Uso (desde backend/):

    python tests/migrar_local.py            # muestra el estado
    python tests/migrar_local.py --aplicar
"""
import sys

sys.path.insert(0, ".")

from sqlalchemy import text

from app.db.database import SessionLocal

TIPO_LOCAL = "LOCAL_OPERATIVA"

# El Puerto de Callao, sobre la Avenida San Martín. Es un valor
# aproximado: la fuente de verdad es el icono en el mapa.
PUERTO_CALLAO = {
    "direccion": "Puerto de Callao, Av. San Martín, Callao",
    "referencia": "Local de la empresa. Punto de partida de los envíos.",
    "latitud": -12.0550,
    "longitud": -77.1430,
}

TIPOS_ACTUALES = (
    "PUNTO_ENTREGA",
    "REFERENCIA",
    "ZONA_RIESGO",
    "RESERVA_ECOLOGICA",
)


def tipos_permitidos():
    return TIPOS_ACTUALES + (TIPO_LOCAL,)


def lista_sql(valores):
    return ", ".join(f"'{valor}'" for valor in valores)


def hay_local(db) -> bool:
    return bool(db.execute(
        text("SELECT count(*) FROM ubicaciones WHERE tipo = :t"),
        {"t": TIPO_LOCAL},
    ).scalar())


def estado(db):
    check = db.execute(text("""
        SELECT pg_get_constraintdef(oid)
        FROM pg_constraint
        WHERE conrelid = 'ubicaciones'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%tipo%'
    """)).scalar()

    print("Estado actual:")
    print(f"  ubicaciones.tipo admite el local: "
          f"{'sí' if TIPO_LOCAL in (check or '') else 'NO'}")
    print(f"  local registrado: {'sí' if hay_local(db) else 'no'}")

    if hay_local(db):
        fila = db.execute(
            text("""
                SELECT id_ubicacion, direccion, latitud, longitud
                FROM ubicaciones WHERE tipo = :t
            """),
            {"t": TIPO_LOCAL},
        ).mappings().first()

        print(f"    {fila['direccion']}")
        print(f"    {fila['latitud']}, {fila['longitud']}")

    return check


def aplicar(db):
    print("Aplicando migración...\n")

    # 1. Que el tipo de la ubicación admita el local
    db.execute(text("""
        ALTER TABLE ubicaciones
        DROP CONSTRAINT IF EXISTS ubicaciones_tipo_check
    """))

    db.execute(text(
        "ALTER TABLE ubicaciones "
        "ADD CONSTRAINT ubicaciones_tipo_check "
        f"CHECK (tipo IN ({lista_sql(tipos_permitidos())}))"
    ))

    print(f"  1. ubicaciones.tipo admite {TIPO_LOCAL}")

    # 2. Un local por defecto, sólo si no hay ninguno
    if not hay_local(db):
        db.execute(
            text("""
                INSERT INTO ubicaciones (
                    direccion, referencia, latitud, longitud,
                    geom, tipo
                )
                VALUES (
                    :direccion, :referencia, :latitud, :longitud,
                    ST_SetSRID(
                        ST_MakePoint(:longitud, :latitud), 4326
                    ),
                    :tipo
                )
            """),
            {**PUERTO_CALLAO, "tipo": TIPO_LOCAL},
        )

        print("  2. local por defecto: Puerto de Callao")
    else:
        print("  2. ya había un local, no se toca")

    db.commit()

    print("\nMigración aplicada.")
    print()
    print("El siguiente paso es abrir el sistema y colocar el icono")
    print("del local en el mapa, para ajustar el punto exacto.")


def main():
    db = SessionLocal()

    try:
        check = estado(db)

        ya_migrado = TIPO_LOCAL in (check or "")

        print()

        if '--aplicar' in sys.argv:
            if ya_migrado and hay_local(db):
                print("La base ya está migrada. No hay nada que hacer.")
            else:
                aplicar(db)

            return 0

        if not ya_migrado:
            print("Falta aplicar. Ejecuta con --aplicar")
        elif not hay_local(db):
            print("Falta el local. Ejecuta con --aplicar")

        return 0

    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())