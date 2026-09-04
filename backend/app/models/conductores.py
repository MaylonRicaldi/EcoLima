from sqlalchemy import Column, Integer, String, Text, DECIMAL, TIME, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

try:
    from geoalchemy2 import Geography
    GeoType = Geography(geometry_type="POINT", srid=4326)
except ImportError:
    from sqlalchemy import Text as GeoFallback
    GeoType = Text

class Conductor(Base):
    __tablename__ = "conductores"
    id_conductor = Column(Integer, primary_key=True, autoincrement=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), nullable=False)
    dni = Column(String(15), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=True)
    telefono = Column(String(20), nullable=True)
    anios_experiencia = Column(Integer, nullable=True)
    hora_disponibilidad_inicio = Column(TIME, nullable=True)
    hora_disponibilidad_fin = Column(TIME, nullable=True)
    horas_max_conduccion = Column(DECIMAL(5, 2), default=8)
    horas_conduccion_acumuladas = Column(DECIMAL(6, 2), default=0)
    ubicacion_inicio = Column(GeoType, nullable=True)
    estado = Column(String(20), default="disponible")

    usuario = relationship("Usuario", backref="conductor")
