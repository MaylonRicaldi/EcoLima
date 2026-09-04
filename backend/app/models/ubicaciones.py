from sqlalchemy import Column, Integer, String, Text, DECIMAL
from .base import Base

try:
    from geoalchemy2 import Geography
    GeoType = Geography(geometry_type="POINT", srid=4326)
except ImportError:
    from sqlalchemy import Text as GeoFallback
    GeoType = Text

class Ubicacion(Base):
    __tablename__ = "ubicaciones"
    id_ubicacion = Column(Integer, primary_key=True, autoincrement=True)
    direccion = Column(Text, nullable=False)
    referencia = Column(Text, nullable=True)
    latitud = Column(DECIMAL(10, 7), nullable=False)
    longitud = Column(DECIMAL(10, 7), nullable=False)
    geom = Column(GeoType, nullable=True)
    tipo = Column(String(30), nullable=True)  # cliente, entrega, base, etc.
