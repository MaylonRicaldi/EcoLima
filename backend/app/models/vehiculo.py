from sqlalchemy import Column, Integer, String, Text, DECIMAL, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from .base import Base

try:
    from geoalchemy2 import Geography
    GeoType = Geography(geometry_type="POINT", srid=4326)
except ImportError:
    from sqlalchemy import Text as GeoFallback
    GeoType = Text

class Vehiculo(Base):
    """
    VEHICULOS según ER UML + compatibilidad RF-01.
    RF-01 campos: placa, tipo (FK tipos_vehiculo), capacidad_kg, consumo_km_l, factor_co2, anio_fabricacion
    UML añade: marca, modelo, capacidad_m3, tipo_combustible, costos, estado, etc.
    BD PostgreSQL, 0 datos (solo DDL).
    """
    __tablename__ = "vehiculos"

    id_vehiculo = Column(Integer, primary_key=True, autoincrement=True)
    id_tipo_vehiculo = Column(Integer, ForeignKey("tipos_vehiculo.id_tipo", ondelete="RESTRICT"), nullable=False)
    placa = Column(String(15), unique=True, nullable=False)
    marca = Column(String(50), nullable=True)
    modelo = Column(String(50), nullable=True)
    anio_fabricacion = Column(Integer, nullable=False)
    capacidad_kg = Column(DECIMAL(10, 2), nullable=False)
    capacidad_m3 = Column(DECIMAL(10, 2), nullable=True)
    consumo_km_l = Column(DECIMAL(10, 2), nullable=False)  # RF-01 consumo_km_l
    factor_co2_kg_km = Column(DECIMAL(10, 4), nullable=False)  # RF-01 factor
    tipo_combustible = Column(String(30), nullable=True)  # diésel, GNV, eléctrico
    costo_adquisicion = Column(DECIMAL(12, 2), nullable=True)
    valor_actual = Column(DECIMAL(12, 2), nullable=True)
    depreciacion_anual = Column(DECIMAL(12, 2), nullable=True)
    costo_soat_anual = Column(DECIMAL(12, 2), nullable=True)
    costo_seguro_anual = Column(DECIMAL(12, 2), nullable=True)
    estado = Column(String(20), default="disponible")
    # Base operativa para mapa RF-04 - opcional, no requerido en registro RF-01 (corrige bug home_latitude)
    home_latitude = Column(DECIMAL(10, 7), nullable=True)
    home_longitude = Column(DECIMAL(10, 7), nullable=True)
    home_ubicacion = Column(GeoType, nullable=True)

    tipo = relationship("TipoVehiculoCat", backref="vehiculos")

    __table_args__ = (
        CheckConstraint("capacidad_kg > 0", name="ck_veh_capacidad_positiva"),
        CheckConstraint("consumo_km_l > 0", name="ck_veh_consumo_positivo"),
        CheckConstraint("factor_co2_kg_km > 0 AND factor_co2_kg_km < 1", name="ck_veh_factor_rango"),
        CheckConstraint("anio_fabricacion >= 1990 AND anio_fabricacion <= 2026", name="ck_veh_anio_rango"),
    )

    # Propiedades de compatibilidad con código previo (RF-01 simple)
    @property
    def id(self):
        return self.id_vehiculo

    @property
    def capacidad_carga_kg(self):
        return float(self.capacidad_kg) if self.capacidad_kg else None

    @property
    def consumo_combustible_km_l(self):
        return float(self.consumo_km_l) if self.consumo_km_l else None

    @property
    def factor_emision_co2_kg_km(self):
        return float(self.factor_co2_kg_km) if self.factor_co2_kg_km else None

    def calcular_combustible(self, distancia_km: float) -> float:
        return float(distancia_km) / float(self.consumo_km_l)

    def calcular_emisiones(self, distancia_km: float) -> float:
        return float(distancia_km) * float(self.factor_co2_kg_km)
