from sqlalchemy import Column, Integer, String, DECIMAL, TIMESTAMP
from .base import Base

class CompensacionCarbono(Base):
    __tablename__ = "compensacion_carbono"
    id_compensacion = Column(Integer, primary_key=True, autoincrement=True)
    co2_total_kg = Column(DECIMAL(12, 2), nullable=False)
    co2_a_compensar_kg = Column(DECIMAL(12, 2), nullable=False)
    factor_captura_arbol_kg = Column(DECIMAL(10, 4), nullable=False)  # ej 22 kg/año por árbol
    arboles_necesarios = Column(DECIMAL(10, 2), nullable=False)
    proyecto_reforestacion = Column(String(200), nullable=True)  # Lomas de Lima, Árboles para Lima
    ubicacion = Column(String(200), nullable=True)
    costo_estimado = Column(DECIMAL(12, 2), nullable=True)
    fecha_calculo = Column(TIMESTAMP, nullable=True)
