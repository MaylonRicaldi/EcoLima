from sqlalchemy import Column, Integer, String, TIMESTAMP, DECIMAL
from .base import Base

class Trafico(Base):
    __tablename__ = "trafico"
    id_trafico = Column(Integer, primary_key=True, autoincrement=True)
    fecha_hora = Column(TIMESTAMP, nullable=False)
    segmento = Column(String(150), nullable=True)
    latitud = Column(DECIMAL(10, 7), nullable=True)
    longitud = Column(DECIMAL(10, 7), nullable=True)
    nivel_congestion = Column(String(20), nullable=True)  # verde, amarillo, rojo
    velocidad_kmh = Column(DECIMAL(6, 2), nullable=True)
    fuente = Column(String(100), nullable=True)  # Waze, Google, SIMAT
