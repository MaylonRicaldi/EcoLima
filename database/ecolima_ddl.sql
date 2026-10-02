CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Ejemplo exigido en la consigna (compatibilidad):
-- CREATE TABLE usuarios (
--     usuario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     email VARCHAR(255) NOT NULL UNIQUE,
--     password_hash VARCHAR(255) NOT NULL,
--     estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO',
--     creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );
-- CREATE INDEX idx_usuarios_email ON usuarios(email);
-- Nota: El modelo PlantUML usa SERIAL (INT). Se implementa SERIAL para fidelidad al diagrama.
-- Para escalabilidad horizontal se recomienda UUID gen_random_uuid().

-- =========================
-- 01. ROLES
-- =========================
CREATE TABLE roles (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE CHECK (nombre IN ('ADMIN','OPERADOR','CONDUCTOR','AUDITOR','CLIENTE'))
);
CREATE INDEX idx_roles_nombre ON roles(nombre);

-- =========================
-- 02. USUARIOS
-- =========================
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    id_rol INT NOT NULL REFERENCES roles(id_rol) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','BLOQUEADO','INACTIVO')),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso TIMESTAMP
);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_id_rol ON usuarios(id_rol);
CREATE INDEX idx_usuarios_estado ON usuarios(estado);

-- =========================
-- 03. CLIENTES
-- =========================
CREATE TABLE clientes (
    id_cliente SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    documento VARCHAR(20),
    telefono VARCHAR(20),
    email VARCHAR(150),
    direccion TEXT NOT NULL,
    referencia TEXT,
    latitud DECIMAL(10,7) NOT NULL CHECK (latitud BETWEEN -13 AND -11),
    longitud DECIMAL(10,7) NOT NULL CHECK (longitud BETWEEN -78 AND -76),
    ubicacion GEOGRAPHY(Point,4326) NOT NULL,
    horario_apertura TIME,
    horario_cierre TIME,
    restricciones_acceso TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO'))
);
CREATE INDEX idx_clientes_ubicacion ON clientes USING GIST (ubicacion);
CREATE INDEX idx_clientes_estado ON clientes(estado);
CREATE INDEX idx_clientes_nombre ON clientes(nombre);

-- =========================
-- 04. TIPOS_VEHICULO
-- =========================
CREATE TABLE tipos_vehiculo (
    id_tipo SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

-- =========================
-- 05. VEHICULOS
-- =========================
CREATE TABLE vehiculos (
    id_vehiculo SERIAL PRIMARY KEY,
    id_tipo_vehiculo INT NOT NULL REFERENCES tipos_vehiculo(id_tipo) ON DELETE RESTRICT,
    placa VARCHAR(15) NOT NULL UNIQUE CHECK (placa ~ '^[A-Z0-9]{2,3}-[0-9]{3,4}$'),
    marca VARCHAR(50),
    modelo VARCHAR(50),
    anio_fabricacion INT CHECK (anio_fabricacion BETWEEN 1990 AND 2026),
    capacidad_kg DECIMAL(10,2) NOT NULL CHECK (capacidad_kg > 0),
    capacidad_m3 DECIMAL(10,2) NOT NULL CHECK (capacidad_m3 > 0),
    consumo_km_l DECIMAL(10,2) NOT NULL CHECK (consumo_km_l > 0),
    factor_co2_kg_km DECIMAL(10,4) NOT NULL CHECK (factor_co2_kg_km > 0),
    tipo_combustible VARCHAR(30) NOT NULL CHECK (tipo_combustible IN ('DIESEL','GNV','GASOLINA','ELECTRICO')),
    costo_adquisicion DECIMAL(12,2) CHECK (costo_adquisicion >= 0),
    valor_actual DECIMAL(12,2) CHECK (valor_actual >= 0),
    depreciacion_anual DECIMAL(12,2) CHECK (depreciacion_anual >= 0),
    costo_soat_anual DECIMAL(12,2) CHECK (costo_soat_anual >= 0),
    costo_seguro_anual DECIMAL(12,2) CHECK (costo_seguro_anual >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','MANTENIMIENTO','BAJA'))
);
CREATE INDEX idx_vehiculos_placa ON vehiculos(placa);
CREATE INDEX idx_vehiculos_tipo ON vehiculos(id_tipo_vehiculo);
CREATE INDEX idx_vehiculos_estado ON vehiculos(estado);
CREATE INDEX idx_vehiculos_combustible ON vehiculos(tipo_combustible);

-- =========================
-- 06. CONDUCTORES
-- =========================
CREATE TABLE conductores (
    id_conductor SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL UNIQUE REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    dni VARCHAR(15) NOT NULL UNIQUE CHECK (dni ~ '^[0-9]{8}$'),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    anios_experiencia INT NOT NULL DEFAULT 0 CHECK (anios_experiencia >= 0),
    hora_disponibilidad_inicio TIME NOT NULL,
    hora_disponibilidad_fin TIME NOT NULL,
    horas_max_conduccion DECIMAL(5,2) NOT NULL DEFAULT 8.0 CHECK (horas_max_conduccion > 0 AND horas_max_conduccion <= 8),
    horas_conduccion_acumuladas DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (horas_conduccion_acumuladas >= 0),
    ubicacion_inicio GEOGRAPHY(Point,4326),
    estado VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE','EN_RUTA','DESCANSO','INACTIVO'))
);
CREATE INDEX idx_conductores_dni ON conductores(dni);
CREATE INDEX idx_conductores_id_usuario ON conductores(id_usuario);
CREATE INDEX idx_conductores_estado ON conductores(estado);
CREATE INDEX idx_conductores_ubicacion ON conductores USING GIST (ubicacion_inicio);

-- =========================
-- 07. LICENCIAS
-- =========================
CREATE TABLE licencias (
    id_licencia SERIAL PRIMARY KEY,
    id_conductor INT NOT NULL REFERENCES conductores(id_conductor) ON DELETE CASCADE,
    numero VARCHAR(30) NOT NULL,
    categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('A-I','A-IIA','A-IIB','A-IIIA','A-IIIB','A-IIIC')),
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL CHECK (fecha_vencimiento > fecha_emision),
    estado VARCHAR(20) NOT NULL DEFAULT 'VIGENTE' CHECK (estado IN ('VIGENTE','VENCIDA','SUSPENDIDA'))
);
CREATE INDEX idx_licencias_conductor ON licencias(id_conductor);
CREATE INDEX idx_licencias_vencimiento ON licencias(fecha_vencimiento);

-- =========================
-- 08. UBICACIONES
-- =========================
CREATE TABLE ubicaciones (
    id_ubicacion SERIAL PRIMARY KEY,
    direccion TEXT NOT NULL,
    referencia TEXT,
    latitud DECIMAL(10,7) NOT NULL,
    longitud DECIMAL(10,7) NOT NULL,
    geom GEOGRAPHY(Point,4326) NOT NULL,
    tipo VARCHAR(30) CHECK (tipo IN ('PUNTO_ENTREGA','REFERENCIA','ZONA_RIESGO','RESERVA_ECOLOGICA'))
);
CREATE INDEX idx_ubicaciones_geom ON ubicaciones USING GIST (geom);
CREATE INDEX idx_ubicaciones_tipo ON ubicaciones(tipo);

-- =========================
-- 09. VENTANAS_TIEMPO
-- =========================
CREATE TABLE ventanas_tiempo (
    id_ventana SERIAL PRIMARY KEY,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL CHECK (hora_fin > hora_inicio),
    tolerancia_minutos INT NOT NULL DEFAULT 0 CHECK (tolerancia_minutos >= 0),
    penalizacion_por_minuto DECIMAL(10,2) NOT NULL DEFAULT 0.50 CHECK (penalizacion_por_minuto >= 0)
);

-- =========================
-- 10. PEDIDOS
-- =========================
CREATE TABLE pedidos (
    id_pedido SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES clientes(id_cliente) ON DELETE RESTRICT,
    id_ventana_tiempo INT NOT NULL REFERENCES ventanas_tiempo(id_ventana) ON DELETE RESTRICT,
    direccion_entrega TEXT NOT NULL,
    referencia TEXT,
    latitud DECIMAL(10,7) NOT NULL,
    longitud DECIMAL(10,7) NOT NULL,
    ubicacion GEOGRAPHY(Point,4326) NOT NULL,
    peso_kg DECIMAL(10,2) NOT NULL CHECK (peso_kg > 0),
    volumen_m3 DECIMAL(10,2) NOT NULL CHECK (volumen_m3 > 0),
    prioridad VARCHAR(20) NOT NULL DEFAULT 'ESTANDAR' CHECK (prioridad IN ('EXPRESS','ESTANDAR','ECONOMICO')),
    tipo_producto VARCHAR(100) NOT NULL CHECK (tipo_producto IN ('PERECEDERO','NO_PERECEDERO','QUIMICO')),
    estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','ASIGNADO','EN_RUTA','ENTREGADO','CANCELADO','FALLIDO')),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pedidos_cliente ON pedidos(id_cliente);
CREATE INDEX idx_pedidos_ventana ON pedidos(id_ventana_tiempo);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_prioridad ON pedidos(prioridad);
CREATE INDEX idx_pedidos_ubicacion ON pedidos USING GIST (ubicacion);
CREATE INDEX idx_pedidos_fecha ON pedidos(fecha_registro);

-- =========================
-- 11. RUTAS
-- =========================
CREATE TABLE rutas (
    id_ruta SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    hora_inicio TIMESTAMP,
    hora_fin TIMESTAMP CHECK (hora_fin IS NULL OR hora_fin > hora_inicio),
    distancia_km DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (distancia_km >= 0),
    duracion_minutos DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (duracion_minutos >= 0),
    distancia_base_km DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (distancia_base_km >= 0),
    duracion_base_minutos DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (duracion_base_minutos >= 0),
    combustible_litros DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (combustible_litros >= 0),
    costo_combustible DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (costo_combustible >= 0),
    costo_mantenimiento DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (costo_mantenimiento >= 0),
    costo_conductor DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (costo_conductor >= 0),
    costo_depreciacion DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (costo_depreciacion >= 0),
    costo_seguro DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (costo_seguro >= 0),
    costo_total DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (costo_total >= 0),
    co2_kg DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (co2_kg >= 0),
    co2_evitable_kg DECIMAL(12,2) NOT NULL DEFAULT 0,
    cumplimiento_ventanas_pct DECIMAL(5,2) CHECK (cumplimiento_ventanas_pct BETWEEN 0 AND 100),
    estado VARCHAR(30) NOT NULL DEFAULT 'PLANIFICADA' CHECK (estado IN ('PLANIFICADA','EN_CURSO','COMPLETADA','CANCELADA','REOPTIMIZADA')),
    algoritmo_utilizado VARCHAR(100) CHECK (algoritmo_utilizado IN ('GA','TABU','ACO','SA'))
);
CREATE INDEX idx_rutas_fecha ON rutas(fecha);
CREATE INDEX idx_rutas_estado ON rutas(estado);
CREATE INDEX idx_rutas_algoritmo ON rutas(algoritmo_utilizado);

-- =========================
-- 12. RUTA_PEDIDOS (M:N)
-- =========================
CREATE TABLE ruta_pedidos (
    id_ruta INT NOT NULL REFERENCES rutas(id_ruta) ON DELETE CASCADE,
    id_pedido INT NOT NULL REFERENCES pedidos(id_pedido) ON DELETE RESTRICT,
    orden_visita INT NOT NULL CHECK (orden_visita > 0),
    hora_llegada_estimada TIMESTAMP,
    hora_llegada_real TIMESTAMP,
    tiempo_espera INT NOT NULL DEFAULT 0 CHECK (tiempo_espera >= 0),
    penalizacion DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (penalizacion >= 0),
    estado_entrega VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_entrega IN ('PENDIENTE','ENTREGADO','FALLIDO','REPROGRAMADO')),
    PRIMARY KEY (id_ruta, id_pedido)
);
CREATE INDEX idx_ruta_pedidos_pedido ON ruta_pedidos(id_pedido);
CREATE INDEX idx_ruta_pedidos_orden ON ruta_pedidos(id_ruta, orden_visita);
-- Unicidad ya garantizada por PK; índice adicional para FK inversa
CREATE UNIQUE INDEX uq_ruta_pedidos_pedido ON ruta_pedidos(id_pedido);

-- =========================
-- 13. ASIGNACIONES
-- =========================
CREATE TABLE asignaciones (
    id_asignacion SERIAL PRIMARY KEY,
    id_ruta INT NOT NULL UNIQUE REFERENCES rutas(id_ruta) ON DELETE CASCADE,
    id_vehiculo INT NOT NULL REFERENCES vehiculos(id_vehiculo) ON DELETE RESTRICT,
    id_conductor INT NOT NULL REFERENCES conductores(id_conductor) ON DELETE RESTRICT,
    fecha_asignacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hora_salida TIMESTAMP,
    hora_retorno TIMESTAMP,
    horas_conduccion DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (horas_conduccion >= 0),
    horas_descanso DECIMAL(6,2) NOT NULL DEFAULT 0 CHECK (horas_descanso >= 0),
    descanso_requerido BOOLEAN NOT NULL DEFAULT false,
    estado VARCHAR(20) NOT NULL DEFAULT 'ASIGNADA' CHECK (estado IN ('ASIGNADA','EN_CURSO','COMPLETADA','CANCELADA'))
);
CREATE INDEX idx_asignaciones_vehiculo ON asignaciones(id_vehiculo);
CREATE INDEX idx_asignaciones_conductor ON asignaciones(id_conductor);
CREATE INDEX idx_asignaciones_estado ON asignaciones(estado);

-- =========================
-- 14. PARADAS_RUTA
-- =========================
CREATE TABLE paradas_ruta (
    id_parada SERIAL PRIMARY KEY,
    id_ruta INT NOT NULL REFERENCES rutas(id_ruta) ON DELETE CASCADE,
    orden INT NOT NULL CHECK (orden > 0),
    latitud DECIMAL(10,7) NOT NULL,
    longitud DECIMAL(10,7) NOT NULL,
    ubicacion GEOGRAPHY(Point,4326) NOT NULL,
    hora_llegada_estimada TIMESTAMP,
    hora_llegada_real TIMESTAMP,
    tiempo_servicio INT NOT NULL DEFAULT 0 CHECK (tiempo_servicio >= 0),
    tiempo_espera INT NOT NULL DEFAULT 0 CHECK (tiempo_espera >= 0),
    tipo_parada VARCHAR(30) NOT NULL CHECK (tipo_parada IN ('ENTREGA','DESCANSO','REPOSTAJE','INICIO','FIN'))
);
CREATE INDEX idx_paradas_ruta ON paradas_ruta(id_ruta, orden);
CREATE INDEX idx_paradas_ubicacion ON paradas_ruta USING GIST (ubicacion);

-- =========================
-- 15. TRAFICO
-- =========================
CREATE TABLE trafico (
    id_trafico SERIAL PRIMARY KEY,
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    segmento VARCHAR(150) NOT NULL,
    latitud DECIMAL(10,7) NOT NULL,
    longitud DECIMAL(10,7) NOT NULL,
    nivel_congestion VARCHAR(20) NOT NULL CHECK (nivel_congestion IN ('VERDE','AMARILLO','ROJO')),
    velocidad_kmh DECIMAL(6,2) CHECK (velocidad_kmh >= 0),
    fuente VARCHAR(100) NOT NULL CHECK (fuente IN ('WAZE','SIMAT','MANUAL'))
);
CREATE INDEX idx_trafico_fecha ON trafico(fecha_hora);
CREATE INDEX idx_trafico_segmento ON trafico(segmento);
CREATE INDEX idx_trafico_nivel ON trafico(nivel_congestion);

-- =========================
-- 16. INCIDENTES
-- =========================
CREATE TABLE incidentes (
    id_incidente SERIAL PRIMARY KEY,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('ACCIDENTE','AVERIA','ROBO','BLOQUEO','CLIMA')),
    descripcion TEXT NOT NULL,
    latitud DECIMAL(10,7) NOT NULL,
    longitud DECIMAL(10,7) NOT NULL,
    ubicacion GEOGRAPHY(Point,4326) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nivel VARCHAR(20) NOT NULL CHECK (nivel IN ('ALTO','MEDIO','BAJO')),
    fuente VARCHAR(100) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','RESUELTO','CANCELADO'))
);
CREATE INDEX idx_incidentes_ubicacion ON incidentes USING GIST (ubicacion);
CREATE INDEX idx_incidentes_tipo ON incidentes(tipo);
CREATE INDEX idx_incidentes_fecha ON incidentes(fecha_hora);
CREATE INDEX idx_incidentes_estado ON incidentes(estado);

-- =========================
-- 17. INDICADORES_RUTA
-- =========================
CREATE TABLE indicadores_ruta (
    id_indicador SERIAL PRIMARY KEY,
    id_ruta INT NOT NULL UNIQUE REFERENCES rutas(id_ruta) ON DELETE CASCADE,
    distancia_km DECIMAL(10,2) NOT NULL CHECK (distancia_km >= 0),
    combustible_l DECIMAL(10,2) NOT NULL CHECK (combustible_l >= 0),
    co2_kg DECIMAL(12,2) NOT NULL CHECK (co2_kg >= 0),
    costo_total DECIMAL(12,2) NOT NULL CHECK (costo_total >= 0),
    ahorro_combustible_l DECIMAL(10,2) NOT NULL DEFAULT 0,
    ahorro_economico DECIMAL(12,2) NOT NULL DEFAULT 0,
    co2_ahorrado_kg DECIMAL(12,2) NOT NULL DEFAULT 0,
    cumplimiento_ventanas_pct DECIMAL(5,2) CHECK (cumplimiento_ventanas_pct BETWEEN 0 AND 100),
    reduccion_co2_pct DECIMAL(5,2),
    reduccion_distancia_pct DECIMAL(5,2),
    fecha_calculo TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_indicadores_ruta ON indicadores_ruta(id_ruta);

-- =========================
-- 18. COMPENSACION_CARBONO
-- =========================
CREATE TABLE compensacion_carbono (
    id_compensacion SERIAL PRIMARY KEY,
    co2_total_kg DECIMAL(12,2) NOT NULL CHECK (co2_total_kg >= 0),
    co2_a_compensar_kg DECIMAL(12,2) NOT NULL CHECK (co2_a_compensar_kg >= 0),
    factor_captura_arbol_kg DECIMAL(10,4) NOT NULL DEFAULT 22.0 CHECK (factor_captura_arbol_kg > 0),
    arboles_necesarios DECIMAL(10,2) GENERATED ALWAYS AS (ROUND(co2_a_compensar_kg / NULLIF(factor_captura_arbol_kg,0),2)) STORED,
    proyecto_reforestacion VARCHAR(200) NOT NULL,
    ubicacion VARCHAR(200),
    costo_estimado DECIMAL(12,2) CHECK (costo_estimado >= 0),
    fecha_calculo TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 19. REPORTES
-- =========================
CREATE TABLE reportes (
    id_reporte SERIAL PRIMARY KEY,
    id_ruta INT REFERENCES rutas(id_ruta) ON DELETE SET NULL,
    usuario_generador INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('SOSTENIBILIDAD','TCO','COMPENSACION','AUDITORIA')),
    fecha_generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ruta_archivo TEXT NOT NULL
);
CREATE INDEX idx_reportes_ruta ON reportes(id_ruta);
CREATE INDEX idx_reportes_usuario ON reportes(usuario_generador);
CREATE INDEX idx_reportes_tipo ON reportes(tipo);
CREATE INDEX idx_reportes_fecha ON reportes(fecha_generacion);

-- =========================
-- TRIGGERS: Sincronización lat/long -> GEOGRAPHY
-- =========================
CREATE OR REPLACE FUNCTION fn_sync_geography() RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'clientes' THEN
        NEW.ubicacion := ST_SetSRID(ST_MakePoint(NEW.longitud, NEW.latitud),4326)::geography;
    ELSIF TG_TABLE_NAME = 'pedidos' THEN
        NEW.ubicacion := ST_SetSRID(ST_MakePoint(NEW.longitud, NEW.latitud),4326)::geography;
    ELSIF TG_TABLE_NAME = 'paradas_ruta' THEN
        NEW.ubicacion := ST_SetSRID(ST_MakePoint(NEW.longitud, NEW.latitud),4326)::geography;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clientes_geo BEFORE INSERT OR UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION fn_sync_geography();
CREATE TRIGGER trg_pedidos_geo BEFORE INSERT OR UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION fn_sync_geography();
CREATE TRIGGER trg_paradas_geo BEFORE INSERT OR UPDATE ON paradas_ruta FOR EACH ROW EXECUTE FUNCTION fn_sync_geography();

-- Datos semilla
INSERT INTO roles (nombre) VALUES ('ADMIN'),('OPERADOR'),('CONDUCTOR'),('AUDITOR'),('CLIENTE');
INSERT INTO tipos_vehiculo (nombre, descripcion) VALUES ('CAMIONETA','Capacidad media, diésel/GNV'),('FURGON','Mayor capacidad'),('MOTO','Última milla ligera');