from sqlalchemy import Column, Integer, String, Text, DECIMAL, TIME
from .base import Base

try:
    from geoalchemy2 import Geography
    GeoType = Geography(geometry_type="POINT", srid=4326)
except ImportError:
    from sqlalchemy import Text as GeoTypeFallback
    GeoType = Text  # fallback si no hay PostGIS

class Cliente(Base):
    __tablename__ = "clientes"
    id_cliente = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(150), nullable=False)
    documento = Column(String(20), nullable=True)
    telefono = Column(String(20), nullable=True)
    email = Column(String(150), nullable=True)
    direccion = Column(Text, nullable=True)
    referencia = Column(Text, nullable=True)
    latitud = Column(DECIMAL(10, 7), nullable=True)
    longitud = Column(DECIMAL(10, 7), nullable=True)
    ubicacion = Column(GeoType, nullable=True)
    horario_apertura = Column(TIME, nullable=True)
    horario_cierre = Column(TIME, nullable=True)
    restricciones_acceso = Column(Text, nullable=True)
    estado = Column(String(20), default="activo")
