from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.database_url)

with engine.connect() as connection:

    tablas = [
        "pedidos",
        "clientes",
        "ventanas_tiempo",
    ]

    for tabla in tablas:
        print(f"\n--- RESTRICCIONES {tabla.upper()} ---")

        resultado = connection.execute(
            text("""
                SELECT
                    conname,
                    pg_get_constraintdef(oid) AS definicion
                FROM pg_constraint
                WHERE conrelid = CAST(:tabla AS regclass)
                ORDER BY conname
            """),
            {"tabla": tabla},
        )

        for row in resultado:
            print(dict(row._mapping))