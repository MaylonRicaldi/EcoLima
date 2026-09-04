from sqlalchemy import Column, Integer, String, Text, DECIMAL, Date, TIMESTAMP
from .base import Base

class Ruta(Base):
    __tablename__ = "rutas"
    id_ruta = Column(Integer, primary_key=True, autoincrement=True)
    fecha = Column(Date, nullable=False)
    hora_inicio = Column(TIMESTAMP, nullable=True)
    hora_fin = Column(TIMESTAMP, nullable=True)
    distancia_km = Column(DECIMAL(10, 2), nullable=True)
    duracion_minutos = Column(DECIMAL(10, 2), nullable=True)
    distancia_base_km = Column(DECIMAL(10, 2), nullable=True)
    duracion_base_minutos = Column(DECIMAL(10, 2), nullable=True)
    combustible_litros = Column(DECIMAL(10, 2), nullable=True)
    costo_combustible = Column(DECIMAL(12, 2), nullable=True)
    costo_mantenimiento = Column(DECIMAL(12, 2), nullable=True)
    costo_conductor = Column(DECIMAL(12, 2), nullable=True)
    costo_depreciacion = Column(DECIMAL(12, 2), nullable=True)
    costo_seguro = Column(DECIMAL(12, 2), nullable=True)
    costo_total = Column(DECIMAL(12, 2), nullable=True)
    co2_kg = Column(DECIMAL(12, 2), nullable=True)
    co2_evitable_kg = Column(DECIMAL(12, 2), nullable=True)
    cumplimiento_ventanas_pct = Column(DECIMAL(5, 2), nullable=True)
    estado = Column(String(30), default="planificada")
    algoritmo_utilizado = Column(String(100), nullable=True)
