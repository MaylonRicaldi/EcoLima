from sqlalchemy import Column, Integer, String, Float, Enum as SAEnum, Time, Text, CheckConstraint
from .base import Base
import enum
from datetime import time

class PrioridadPedido(str, enum.Enum):
    express = "express"
    estandar = "estándar"
    economico = "económico"

class TipoProducto(str, enum.Enum):
    perecedero = "perecedero"
    no_perecedero = "no perecedero"

class Pedido(Base):
    """
    RF-02 - Gestión de Pedidos (Consigna EcoLogística Lima)

    Campos RF-02 (orden solicitado por usuario):
      1. id_cliente (ID, no nombre)
      2. direccion_entrega
      3. coordenadas GPS (latitud, longitud) con 2 opciones de captura en frontend
      4. peso_kg
      5. volumen_m3
      6. ventana de tiempo entrega: hora inicio - fin (manual)
      7. prioridad: express, estándar, económico
      8. tipo_producto: perecedero, no perecedero

    Consideraciones Lima:
      - Direcciones no estándar SJL: "Altura cuadra 20, Mz C, Lote 5" + punto referencia opcional
      - Coordenadas validadas para Lima Metropolitana; mapa ayuda a precisar
    """
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(String(50), nullable=False, index=True)
    direccion_entrega = Column(Text, nullable=False)
    punto_referencia = Column(Text, nullable=True)
    latitud = Column(Float, nullable=False)
    longitud = Column(Float, nullable=False)
    peso_kg = Column(Float, nullable=False)
    volumen_m3 = Column(Float, nullable=False)
    ventana_inicio = Column(Time, nullable=False)
    ventana_fin = Column(Time, nullable=False)
    prioridad = Column(SAEnum(PrioridadPedido, name="prioridad_pedido"), nullable=False)
    tipo_producto = Column(SAEnum(TipoProducto, name="tipo_producto"), nullable=False)

    __table_args__ = (
        CheckConstraint("peso_kg > 0 AND peso_kg <= 5000", name="ck_peso_rango"),
        CheckConstraint("volumen_m3 > 0 AND volumen_m3 <= 30", name="ck_volumen_rango"),
        CheckConstraint("latitud >= -18 AND latitud <= 0", name="ck_lat_peru"),
        CheckConstraint("longitud >= -82 AND longitud <= -68", name="ck_lon_peru"),
        # ventana_fin > ventana_inicio se valida en aplicación (no trivial en CHECK de Time)
    )

    def ventana_valida(self) -> bool:
        return self.ventana_fin > self.ventana_inicio

    def to_dict(self):
        return {
            "id": self.id,
            "cliente_id": self.cliente_id,
            "direccion_entrega": self.direccion_entrega,
            "latitud": self.latitud,
            "longitud": self.longitud,
            "peso_kg": self.peso_kg,
            "volumen_m3": self.volumen_m3,
            "ventana_inicio": self.ventana_inicio.isoformat() if self.ventana_inicio else None,
            "ventana_fin": self.ventana_fin.isoformat() if self.ventana_fin else None,
            "prioridad": self.prioridad.value if self.prioridad else None,
            "tipo_producto": self.tipo_producto.value if self.tipo_producto else None,
        }
