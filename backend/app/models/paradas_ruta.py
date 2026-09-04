from sqlalchemy import Column, Integer, TIMESTAMP, DECIMAL, String, ForeignKey, Text
from .base import Base

try:
    from geoalchemy2 import Geography
    GeoType = Geography(geometry_type="POINT", srid=4326)
except ImportError:
    GeoType = Text

class ParadaRuta(Base):
    __tablename__ = "paradas_ruta"
    id_parada = Column(Integer, primary_key=True, autoincrement=True)
    id_ruta = Column(Integer, ForeignKey("rutas.id_ruta", ondelete="CASCADE"), nullable=False)
    orden = Column(Integer, nullable=False)
    latitud = Column(DECIMAL(10, 7), nullable=False)
    longitud = Column(DECIMAL(10, 7), nullable=False)
    ubicacion = Column(GeoType, nullable=True)
    hora_llegada_estimada = Column(TIMESTAMP, nullable=True)
    hora_llegada_real = Column(TIMESTAMP, nullable=True)
    tiempo_servicio = Column(Integer, nullable=True)
    tiempo_espera = Column(Integer, nullable=True)
    tipo_parada = Column(String(30), nullable=True)
