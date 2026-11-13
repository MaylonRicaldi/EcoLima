-- Índices adicionales para optimizar consultas frecuentes (listados, filtros y joins)
-- Ejecutar de forma idempotente en PostgreSQL/PostGIS.

CREATE INDEX IF NOT EXISTS idx_pedidos_estado_fecha ON pedidos (estado, fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos (id_cliente);
CREATE INDEX IF NOT EXISTS idx_pedidos_ventana ON pedidos (id_ventana_tiempo);

CREATE INDEX IF NOT EXISTS idx_rutas_estado_fecha ON rutas (estado, fecha DESC, id_ruta DESC);
CREATE INDEX IF NOT EXISTS idx_ruta_pedidos_ruta_orden ON ruta_pedidos (id_ruta, orden_visita);
CREATE INDEX IF NOT EXISTS idx_ruta_pedidos_pedido ON ruta_pedidos (id_pedido);
CREATE INDEX IF NOT EXISTS idx_paradas_ruta_ruta_orden ON paradas_ruta (id_ruta, orden);

CREATE INDEX IF NOT EXISTS idx_asignaciones_ruta ON asignaciones (id_ruta);
CREATE INDEX IF NOT EXISTS idx_asignaciones_conductor ON asignaciones (id_conductor);
CREATE INDEX IF NOT EXISTS idx_asignaciones_vehiculo ON asignaciones (id_vehiculo);

CREATE INDEX IF NOT EXISTS idx_obstaculos_resuelto ON obstaculos (resuelto);
CREATE INDEX IF NOT EXISTS idx_incidentes_estado ON incidentes (estado, fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_trafico_fecha ON trafico (fecha_hora DESC);

CREATE INDEX IF NOT EXISTS idx_conductores_estado ON conductores (estado);
CREATE INDEX IF NOT EXISTS idx_clientes_estado_nombre ON clientes (estado, nombre);
CREATE INDEX IF NOT EXISTS idx_vehiculos_estado ON vehiculos (estado);
