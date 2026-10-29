"""Migración: obstáculos en la calzada y ventanas de un caso especial.

Dos cambios, los dos autorizados de forma explícita:

1. Tabla nueva `obstaculos`.

   Un obstáculo es una obstrucción fija en la vía: el cono que un
   conductor coloca en el punto donde hay un malestar, una obra, un
   árbol caído. No es un incidente, porque un incidente es un hecho
   que pasa y se resuelve, mientras que el cono se queda ahí para
   las rutas siguientes y se quita cuando alguien lo decide.

   Mezclarlos en `incidentes` obligaría a distinguir un cono de un
   accidente por el texto de la descripción, que es frágil.

   Por defecto los obstáculos NO se borran al terminar la ruta: se
   quedan indicados y afectan a las rutas siguientes. Se quitan a
   mano, que es lo que se pidió.

2. Columna `es_ocasional` en `ventanas_tiempo`.

   Una ventana creada para un pedido concreto no debe ofrecerse en el
   desplegable de los demás. Con la columna, el catálogo de ventanas
   es lo de FALSE y las puntuales quedan aparte.

No se modifica ninguna tabla existente ni sus datos: sólo se agrega
una tabla y una columna con su valor por defecto.

Uso (desde backend/):

    python tests/migrar_esquema_obstaculos.py         # muestra estado
    python tests/migrar_esquema_obstaculos.py --aplicar
"""
import sys

sys.path.insert(0, ".")

from sqlalchemy import text

from app.db.database import SessionLocal

TABLA_OBSTACULOS = """
    CREATE TABLE IF NOT EXISTS obstaculos (
        id_obstaculo   SERIAL PRIMARY KEY,
        tipo           VARCHAR(30)   NOT NULL,
        descripcion    TEXT          NOT NULL,
        latitud        NUMERIC(9, 6) NOT NULL,
        longitud       NUMERIC(9, 6) NOT NULL,
        ubicacion      GEOGRAPHY(Point, 4326) NOT NULL,
        nivel          VARCHAR(10)   NOT NULL DEFAULT 'MEDIO',
        id_usuario     INTEGER,
        fecha_registro TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resuelto       BOOLEAN       NOT NULL DEFAULT FALSE,
        CONSTRAINT obstaculos_tipo_check CHECK (
            tipo IN ('CONO', 'OBRA', 'ARBOL', 'BACHE',
                     'BLOQUEO_CALLE', 'OTRO')
        ),
        CONSTRAINT obstaculos_nivel_check CHECK (
            nivel IN ('ALTO', 'MEDIO', 'BAJO')
        ),
        CONSTRAINT obstaculos_latitud_check CHECK (
            latitud BETWEEN -13 AND -11
        ),
        CONSTRAINT obstaculos_longitud_check CHECK (
            longitud BETWEEN -78 AND -76
        ),
        CONSTRAINT obstaculos_id_usuario_fkey
            FOREIGN KEY (id_usuario)
            REFERENCES usuarios(id_usuario)
            ON DELETE SET NULL
    )
"""


def existe_tabla(db, nombre):
    return db.execute(
        text("SELECT to_regclass(:n) IS NOT NULL"),
        {"n": nombre},
    ).scalar()


def existe_columna(db, tabla, columna):
    return db.execute(
        text("""
            SELECT count(*) > 0
            FROM information_schema.columns
            WHERE table_name = :t AND column_name = :c
        """),
        {"t": tabla, "c": columna},
    ).scalar()


def estado(db):
    print("Estado actual:")

    tabla = existe_tabla(db, 'obstaculos')

    print(
        f"  obstaculos                 "
        f"{'existe' if tabla else 'NO EXISTE'}"
    )

    columna = existe_columna(db, 'ventanas_tiempo', 'es_ocasional')

    print(
        f"  ventanas_tiempo.es_ocasional "
        f"{'existe' if columna else 'NO EXISTE'}"
    )

    if tabla:
        total = db.execute(
            text("SELECT count(*) FROM obstaculos")
        ).scalar()

        print(f"    obstaculos registrados: {total}")

    if columna:
        ventanas = db.execute(text("""
            SELECT
                count(*) FILTER (WHERE es_ocasional) AS ocasionales,
                count(*) FILTER (WHERE NOT es_ocasional) AS catalogo
            FROM ventanas_tiempo
        """)).mappings().first()

        print(
            f"    ventanas de catálogo: {ventanas['catalogo']}, "
            f"ocasionales: {ventanas['ocasionales']}"
        )

    return tabla, columna


def aplicar(db):
    print("Aplicando migración...\n")

    # 1. La tabla de obstáculos
    db.execute(text(TABLA_OBSTACULOS))

    print("  1. tabla obstaculos creada")

    db.execute(text("""
        CREATE INDEX IF NOT EXISTS obstaculos_ubicacion_idx
        ON obstaculos USING GIST (ubicacion)
    """))

    db.execute(text("""
        CREATE INDEX IF NOT EXISTS obstaculos_activos_idx
        ON obstaculos (resuelto, fecha_registro)
    """))

    print("  2. índices de obstacles creados")

    # 2. Las ventanas puntuales
    # DEFAULT FALSE y no NOT NULL: las filas que ya existen pasan a
    # formar parte del catálogo sin tocar nada.
    db.execute(text("""
        ALTER TABLE ventanas_tiempo
        ADD COLUMN IF NOT EXISTS es_ocasional BOOLEAN NOT NULL DEFAULT FALSE
    """))

    print("  3. ventanas_tiempo.es_ocasional agregada")
    print("     las ventanas actuales quedan como catálogo")

    db.commit()

    print("\nMigración aplicada.")


def main():
    db = SessionLocal()

    try:
        tabla, columna = estado(db)

        if tabla and columna:
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