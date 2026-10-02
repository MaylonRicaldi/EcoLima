from sqlalchemy import text

from app.db.database import engine


with engine.connect() as db:

    print("\n--- CONDUCTORES ---")

    conductores = db.execute(
        text("""
            SELECT
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns
            WHERE table_name = 'conductores'
            ORDER BY ordinal_position
        """)
    ).fetchall()

    for fila in conductores:
        print(fila)


    print("\n--- LICENCIAS ---")

    licencias = db.execute(
        text("""
            SELECT
                column_name,
                data_type,
                is_nullable
            FROM information_schema.columns
            WHERE table_name = 'licencias'
            ORDER BY ordinal_position
        """)
    ).fetchall()

    for fila in licencias:
        print(fila)