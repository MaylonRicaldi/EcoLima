import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from .models.base import Base

load_dotenv()

# PostgreSQL por defecto (según ER UML), 0 datos. Fallback a SQLite solo para tests sin Docker.
# Ejemplo: postgresql://ecolima:ecolima123@localhost:5432/ecolima
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://ecolima:ecolima123@localhost:5432/ecolima"
)

# Si no hay driver psycopg2 disponible en test local sin Postgres, usar SQLite en memoria para validación
try:
    import psycopg2  # noqa
    use_sqlite_fallback = False
except ImportError:
    if DATABASE_URL.startswith("postgresql"):
        DATABASE_URL = "sqlite:///./ecolima.db"
        use_sqlite_fallback = True
    else:
        use_sqlite_fallback = DATABASE_URL.startswith("sqlite")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Crea extensión PostGIS (si Postgres) y todas las tablas sin datos (0 filas)."""
    # Intentar habilitar PostGIS
    if DATABASE_URL.startswith("postgresql"):
        try:
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
                conn.commit()
        except Exception as e:
            # No crítico para SQLite o sin permisos
            print(f"PostGIS extension warning: {e}")

    # Importar todos los modelos para registrar en Base.metadata
    from .models import (  # noqa: F401
        roles, usuarios, clientes, tipos_vehiculo, vehiculo,
        conductores, licencias, ubicaciones, ventanas_tiempo,
        pedido, rutas, ruta_pedidos, asignaciones, paradas_ruta,
        trafico, incidentes, indicadores_ruta, compensacion_carbono, reportes
    )
    Base.metadata.create_all(bind=engine)
    # 0 datos: no seed, solo DDL vacío
