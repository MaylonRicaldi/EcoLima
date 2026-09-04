import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models.base import Base

# Usar DATABASE_URL si existe (PostgreSQL prod), fallback SQLite para desarrollo/demo
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ecolima.db")

# SQLite necesita check_same_thread=False
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Importar modelos para que se registren en Base.metadata
    from .models import vehiculo, pedido  # noqa: F401
    Base.metadata.create_all(bind=engine)
