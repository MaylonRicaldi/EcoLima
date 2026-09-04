from sqlalchemy import Column, Integer, DECIMAL, TIMESTAMP, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base

class IndicadorRuta(Base):
    __tablename__ = "indicadores_ruta"
    id_indicador = Column(Integer, primary_key=True, autoincrement=True)
    id_ruta = Column(Integer, ForeignKey("rutas.id_ruta", ondelete="CASCADE"), nullable=False)
    distancia_km = Column(DECIMAL(10, 2), nullable=True)
    combustible_l = Column(DECIMAL(10, 2), nullable=True)
    co2_kg = Column(DECIMAL(12, 2), nullable=True)
    costo_total = Column(DECIMAL(12, 2), nullable=True)
    ahorro_combustible_l = Column(DECIMAL(10, 2), nullable=True)
    ahorro_economico = Column(DECIMAL(12, 2), nullable=True)
    co2_ahorrado_kg = Column(DECIMAL(12, 2), nullable=True)
    cumplimiento_ventanas_pct = Column(DECIMAL(5, 2), nullable=True)
    reduccion_co2_pct = Column(DECIMAL(5, 2), nullable=True)
    reduccion_distancia_pct = Column(DECIMAL(5, 2), nullable=True)
    fecha_calculo = Column(TIMESTAMP, nullable=True)

    ruta = relationship("Ruta", backref="indicadores")
