from sqlalchemy import text

from app.db.database import engine


with engine.connect() as db:

    print("\n--- RESTRICCIONES CONDUCTORES ---")

    resultado = db.execute(
        text("""
            SELECT
                conname,
                pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'conductores'::regclass
            ORDER BY conname
        """)
    ).fetchall()

    for fila in resultado:
        print(fila)


    print("\n--- RESTRICCIONES LICENCIAS ---")

    resultado = db.execute(
        text("""
            SELECT
                conname,
                pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'licencias'::regclass
            ORDER BY conname
        """)
    ).fetchall()

    for fila in resultado:
        print(fila)


    print("\n--- CONDUCTORES REGISTRADOS ---")

    resultado = db.execute(
        text("""
            SELECT *
            FROM conductores
            ORDER BY id_conductor
        """)
    ).fetchall()

    for fila in resultado:
        print(fila)


    print("\n--- LICENCIAS REGISTRADAS ---")

    resultado = db.execute(
        text("""
            SELECT *
            FROM licencias
            ORDER BY id_licencia
        """)
    ).fetchall()

    for fila in resultado:
        print(fila)