from sqlalchemy import Column, Integer, String, Text
from .base import Base

class TipoVehiculoCat(Base):
    __tablename__ = "tipos_vehiculo"
    id_tipo = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(50), unique=True, nullable=False)  # camioneta, furgón, moto
    descripcion = Column(Text, nullable=True)
