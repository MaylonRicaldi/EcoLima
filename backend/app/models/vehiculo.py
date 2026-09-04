from sqlalchemy import Column, Integer, String, Float, Enum as SAEnum, CheckConstraint
from sqlalchemy.orm import declarative_base
import enum

Base = declarative_base()

class TipoVehiculo(str, enum.Enum):
    camioneta = "camioneta"
    furgon = "furgón"
    moto = "moto"

class Vehiculo(Base):
    """
    RF-01 - Gestión de Flota (Consigna EcoLogística Lima)

    Campos requeridos por RF-01:
      - placa, tipo, capacidad_carga_kg, consumo_combustible_km_l,
        factor_emision_co2_kg_km, anio_fabricacion

    FIX aplicado:
      - Se AGREGAN consumo_combustible_km_l (km/L) y factor_emision_co2_kg_km (kg CO2/km)
        que faltaban en la versión anterior.
      - Se ELIMINAN latitud_base y longitud_base del formulario de registro.
        Antes se solicitaban al registrar vehículo pero no son parte de RF-01.
        La ubicación base se gestiona aparte (p. ej. sede en SJL) o vía asignación
        de ruta, no como atributo obligatorio del vehículo.

    Notas de dominio (Lima):
      - Vehículos >15 años tienen factor de emisión alto (diésel ~0.21-0.28 kgCO2/km).
      - Consumo típico: moto 35-45 km/L, camioneta diésel 8-12 km/L, furgón 6-9 km/L.
    """
    __tablename__ = "vehiculos"

    id = Column(Integer, primary_key=True, index=True)
    placa = Column(String(10), unique=True, nullable=False, index=True)
    tipo = Column(SAEnum(TipoVehiculo, name="tipo_vehiculo"), nullable=False)
    capacidad_carga_kg = Column(Float, nullable=False)
    consumo_combustible_km_l = Column(Float, nullable=False)  # km/L - NUEVO
    factor_emision_co2_kg_km = Column(Float, nullable=False)  # kg CO2/km - NUEVO
    anio_fabricacion = Column(Integer, nullable=False)

    # Eliminado: latitud_base, longitud_base (no se solicitan al registrar)

    __table_args__ = (
        CheckConstraint("capacidad_carga_kg > 0", name="ck_capacidad_positiva"),
        CheckConstraint("consumo_combustible_km_l > 0", name="ck_consumo_positivo"),
        CheckConstraint("factor_emision_co2_kg_km > 0", name="ck_factor_positivo"),
        CheckConstraint("factor_emision_co2_kg_km < 1", name="ck_factor_rango"),  # <1 kg/km realista
        CheckConstraint("anio_fabricacion >= 1990 AND anio_fabricacion <= 2026", name="ck_anio_rango"),
    )

    def calcular_combustible(self, distancia_km: float) -> float:
        """Litros = distancia / consumo (km/L)"""
        return distancia_km / self.consumo_combustible_km_l

    def calcular_emisiones(self, distancia_km: float) -> float:
        """kg CO2 = distancia * factor (kgCO2/km)"""
        return distancia_km * self.factor_emision_co2_kg_km
