from sqlalchemy import create_engine, text
from app.core.config import settings

engine = create_engine(settings.database_url)

with engine.connect() as connection:

    print("\n--- PEDIDOS ---")

    resultado = connection.execute(text("""
        SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_name = 'pedidos'
        ORDER BY ordinal_position
    """))

    for row in resultado:
        print(dict(row._mapping))

    print("\n--- CLIENTES ---")

    resultado = connection.execute(text("""
        SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_name = 'clientes'
        ORDER BY ordinal_position
    """))

    for row in resultado:
        print(dict(row._mapping))

    print("\n--- VENTANAS_TIEMPO ---")

    resultado = connection.execute(text("""
        SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_name = 'ventanas_tiempo'
        ORDER BY ordinal_position
    """))

    for row in resultado:
        print(dict(row._mapping))