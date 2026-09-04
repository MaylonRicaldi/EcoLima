from sqlalchemy import Column, Integer, TIME, DECIMAL
from .base import Base

class VentanaTiempo(Base):
    __tablename__ = "ventanas_tiempo"
    id_ventana = Column(Integer, primary_key=True, autoincrement=True)
    hora_inicio = Column(TIME, nullable=False)
    hora_fin = Column(TIME, nullable=False)
    tolerancia_minutos = Column(Integer, default=15)
    penalizacion_por_minuto = Column(DECIMAL(10, 2), default=5.00)
