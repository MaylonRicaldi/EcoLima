from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..models.pedido import Pedido
from ..models.clientes import Cliente
from ..models.ventanas_tiempo import VentanaTiempo
from ..schemas.pedido import PedidoCreate, PedidoResponse, PedidoUpdate
from ..database import get_db

router = APIRouter(prefix="/api/pedidos", tags=["Pedidos - RF-02 / ER PEDIDOS"])

def get_or_create_cliente(db: Session, cliente_id_str: str, direccion: str, referencia: str, lat: float, lon: float) -> Cliente:
    # Buscar por documento (donde guardamos el ID string RF-02) o nombre
    cliente = db.query(Cliente).filter(Cliente.documento == cliente_id_str).first()
    if cliente:
        return cliente
    # Crear cliente mínimo con 0 datos previos, solo lo necesario
    cliente = Cliente(
        nombre=cliente_id_str,
        documento=cliente_id_str,
        direccion=direccion,
        referencia=referencia,
        latitud=lat,
        longitud=lon,
        estado="activo"
    )
    db.add(cliente)
    db.flush()
    return cliente

def get_or_create_ventana(db: Session, hora_inicio, hora_fin) -> VentanaTiempo:
    ventana = db.query(VentanaTiempo).filter(
        VentanaTiempo.hora_inicio == hora_inicio,
        VentanaTiempo.hora_fin == hora_fin
    ).first()
    if ventana:
        return ventana
    ventana = VentanaTiempo(
        hora_inicio=hora_inicio,
        hora_fin=hora_fin,
        tolerancia_minutos=15,
        penalizacion_por_minuto=5.00
    )
    db.add(ventana)
    db.flush()
    return ventana

def to_response(p: Pedido) -> dict:
    ventana = p.ventana
    return {
        "cliente_id": p.cliente.documento if p.cliente and p.cliente.documento else str(p.id_cliente),
        "direccion_entrega": p.direccion_entrega,
        "punto_referencia": p.referencia,
        "latitud": float(p.latitud),
        "longitud": float(p.longitud),
        "peso_kg": float(p.peso_kg),
        "volumen_m3": float(p.volumen_m3),
        "ventana_inicio": ventana.hora_inicio if ventana else None,
        "ventana_fin": ventana.hora_fin if ventana else None,
        "prioridad": p.prioridad,
        "tipo_producto": p.tipo_producto,
        "id": p.id_pedido,
    }

@router.post("/", response_model=PedidoResponse, status_code=201, summary="RF-02: Registrar pedido (ER PEDIDOS + CLIENTES + VENTANAS_TIEMPO)")
def crear_pedido(payload: PedidoCreate, db: Session = Depends(get_db)):
    cliente = get_or_create_cliente(
        db, payload.cliente_id, payload.direccion_entrega,
        payload.punto_referencia, payload.latitud, payload.longitud
    )
    ventana = get_or_create_ventana(db, payload.ventana_inicio, payload.ventana_fin)

    pedido = Pedido(
        id_cliente=cliente.id_cliente,
        id_ventana_tiempo=ventana.id_ventana,
        direccion_entrega=payload.direccion_entrega,
        referencia=payload.punto_referencia,
        latitud=payload.latitud,
        longitud=payload.longitud,
        peso_kg=payload.peso_kg,
        volumen_m3=payload.volumen_m3,
        prioridad=payload.prioridad,
        tipo_producto=payload.tipo_producto,
        estado="pendiente"
    )
    db.add(pedido)
    db.commit()
    db.refresh(pedido)
    # Cargar relaciones para respuesta
    pedido.cliente = cliente
    pedido.ventana = ventana
    return to_response(pedido)

@router.get("/", response_model=List[PedidoResponse], summary="Listar pedidos")
def listar_pedidos(
    cliente_id: Optional[str] = Query(None, description="Filtrar por ID cliente (documento)"),
    prioridad: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Pedido)
    if cliente_id:
        # Filtrar por documento del cliente
        q = q.join(Cliente).filter(Cliente.documento == cliente_id)
    if prioridad:
        q = q.filter(Pedido.prioridad == prioridad)
    pedidos = q.order_by(Pedido.id_pedido.desc()).all()
    for p in pedidos:
        _ = p.cliente
        _ = p.ventana
    return [to_response(p) for p in pedidos]

@router.get("/{pedido_id}", response_model=PedidoResponse)
def obtener_pedido(pedido_id: int, db: Session = Depends(get_db)):
    p = db.query(Pedido).filter(Pedido.id_pedido == pedido_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return to_response(p)

@router.patch("/{pedido_id}", response_model=PedidoResponse)
def actualizar_pedido(pedido_id: int, payload: PedidoUpdate, db: Session = Depends(get_db)):
    p = db.query(Pedido).filter(Pedido.id_pedido == pedido_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    data = payload.model_dump(exclude_unset=True)

    if "cliente_id" in data:
        cliente = get_or_create_cliente(db, data.pop("cliente_id"), p.direccion_entrega, p.referencia, float(p.latitud), float(p.longitud))
        p.id_cliente = cliente.id_cliente

    # Ventana: si se actualiza una de las dos, crear nueva o actualizar existente
    if "ventana_inicio" in data or "ventana_fin" in data:
        inicio = data.get("ventana_inicio", p.ventana.hora_inicio if p.ventana else None)
        fin = data.get("ventana_fin", p.ventana.hora_fin if p.ventana else None)
        if fin <= inicio:
            raise HTTPException(status_code=422, detail="Hora fin debe ser posterior a hora inicio")
        ventana = get_or_create_ventana(db, inicio, fin)
        p.id_ventana_tiempo = ventana.id_ventana
        data.pop("ventana_inicio", None)
        data.pop("ventana_fin", None)

    # Mapear punto_referencia -> referencia
    if "punto_referencia" in data:
        p.referencia = data.pop("punto_referencia")

    for k, v in data.items():
        # cliente_id ya manejado, resto directo
        if hasattr(p, k):
            setattr(p, k, v)

    db.commit()
    db.refresh(p)
    return to_response(p)

@router.delete("/{pedido_id}", status_code=204)
def eliminar_pedido(pedido_id: int, db: Session = Depends(get_db)):
    p = db.query(Pedido).filter(Pedido.id_pedido == pedido_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    db.delete(p)
    db.commit()
    return None
