from sqlalchemy import Column, Integer, String, Text, TIMESTAMP, DECIMAL
from .base import Base

try:
    from geoalchemy2 import Geography
    GeoType = Geography(geometry_type="POINT", srid=4326)
except ImportError:
    from sqlalchemy import Text as GeoFallback
    GeoType = Text

class Incidente(Base):
    __tablename__ = "incidentes"
    id_incidente = Column(Integer, primary_key=True, autoincrement=True)
    tipo = Column(String(30), nullable=False)  # accidente, averia, robo, etc.
    descripcion = Column(Text, nullable=True)
    latitud = Column(DECIMAL(10, 7), nullable=True)
    longitud = Column(DECIMAL(10, 7), nullable=True)
    ubicacion = Column(GeoType, nullable=True)
    fecha_hora = Column(TIMESTAMP, nullable=False)
    nivel = Column(String(20), nullable=True)
    fuente = Column(String(100), nullable=True)
    estado = Column(String(20), default="activo")
