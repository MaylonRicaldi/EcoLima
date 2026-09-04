from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..models.pedido import Pedido
from ..schemas.pedido import PedidoCreate, PedidoResponse, PedidoUpdate
from ..database import get_db

router = APIRouter(prefix="/api/pedidos", tags=["Pedidos"])


@router.post("/", response_model=PedidoResponse, status_code=201, summary="RF-02: Registrar pedido")
def crear_pedido(payload: PedidoCreate, db: Session = Depends(get_db)):
    """
    RF-02: Orden de campos solicitado:
    1. cliente_id (ID, no nombre)
    2. direccion_entrega + punto_referencia opcional
    3. coordenadas GPS (latitud/longitud) - capturadas vía 2 opciones frontend
    4. peso_kg, volumen_m3
    5. ventana_inicio / ventana_fin (hora manual HH:MM)
    6. prioridad (express, estándar, económico)
    7. tipo_producto (perecedero, no perecedero)
    """
    # Validación adicional: coordenadas dentro de zona operativa (advertencia no bloqueo)
    pedido = Pedido(
        cliente_id=payload.cliente_id,
        direccion_entrega=payload.direccion_entrega,
        punto_referencia=payload.punto_referencia,
        latitud=payload.latitud,
        longitud=payload.longitud,
        peso_kg=payload.peso_kg,
        volumen_m3=payload.volumen_m3,
        ventana_inicio=payload.ventana_inicio,
        ventana_fin=payload.ventana_fin,
        prioridad=payload.prioridad,
        tipo_producto=payload.tipo_producto,
    )
    db.add(pedido)
    db.commit()
    db.refresh(pedido)
    return pedido


@router.get("/", response_model=List[PedidoResponse], summary="Listar pedidos")
def listar_pedidos(
    cliente_id: Optional[str] = Query(None, description="Filtrar por ID cliente"),
    prioridad: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Pedido)
    if cliente_id:
        q = q.filter(Pedido.cliente_id == cliente_id)
    if prioridad:
        q = q.filter(Pedido.prioridad == prioridad)
    return q.order_by(Pedido.id.desc()).all()


@router.get("/{pedido_id}", response_model=PedidoResponse, summary="Obtener pedido")
def obtener_pedido(pedido_id: int, db: Session = Depends(get_db)):
    p = db.get(Pedido, pedido_id)
    if not p:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return p


@router.patch("/{pedido_id}", response_model=PedidoResponse, summary="Actualizar pedido")
def actualizar_pedido(pedido_id: int, payload: PedidoUpdate, db: Session = Depends(get_db)):
    p = db.get(Pedido, pedido_id)
    if not p:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    data = payload.model_dump(exclude_unset=True)
    # Validar ventana si se actualiza una de las dos
    if "ventana_inicio" in data or "ventana_fin" in data:
        inicio = data.get("ventana_inicio", p.ventana_inicio)
        fin = data.get("ventana_fin", p.ventana_fin)
        if fin <= inicio:
            raise HTTPException(status_code=422, detail="Hora fin debe ser posterior a hora inicio")
    for k, v in data.items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{pedido_id}", status_code=204, summary="Eliminar pedido")
def eliminar_pedido(pedido_id: int, db: Session = Depends(get_db)):
    p = db.get(Pedido, pedido_id)
    if not p:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    db.delete(p)
    db.commit()
    return None
