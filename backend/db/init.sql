-- EcoLogística Lima - DDL PostgreSQL/PostGIS - 0 datos
-- Generado desde ER UML PlantUML - 19 entidades
CREATE EXTENSION IF NOT EXISTS postgis;


CREATE TABLE clientes (
	id_cliente SERIAL NOT NULL, 
	nombre VARCHAR(150) NOT NULL, 
	documento VARCHAR(20), 
	telefono VARCHAR(20), 
	email VARCHAR(150), 
	direccion TEXT, 
	referencia TEXT, 
	latitud DECIMAL(10, 7), 
	longitud DECIMAL(10, 7), 
	ubicacion TEXT, 
	horario_apertura TIME WITHOUT TIME ZONE, 
	horario_cierre TIME WITHOUT TIME ZONE, 
	restricciones_acceso TEXT, 
	estado VARCHAR(20), 
	PRIMARY KEY (id_cliente)
)

;


CREATE TABLE compensacion_carbono (
	id_compensacion SERIAL NOT NULL, 
	co2_total_kg DECIMAL(12, 2) NOT NULL, 
	co2_a_compensar_kg DECIMAL(12, 2) NOT NULL, 
	factor_captura_arbol_kg DECIMAL(10, 4) NOT NULL, 
	arboles_necesarios DECIMAL(10, 2) NOT NULL, 
	proyecto_reforestacion VARCHAR(200), 
	ubicacion VARCHAR(200), 
	costo_estimado DECIMAL(12, 2), 
	fecha_calculo TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id_compensacion)
)

;


CREATE TABLE incidentes (
	id_incidente SERIAL NOT NULL, 
	tipo VARCHAR(30) NOT NULL, 
	descripcion TEXT, 
	latitud DECIMAL(10, 7), 
	longitud DECIMAL(10, 7), 
	ubicacion TEXT, 
	fecha_hora TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	nivel VARCHAR(20), 
	fuente VARCHAR(100), 
	estado VARCHAR(20), 
	PRIMARY KEY (id_incidente)
)

;


CREATE TABLE roles (
	id_rol SERIAL NOT NULL, 
	nombre VARCHAR(50) NOT NULL, 
	PRIMARY KEY (id_rol), 
	UNIQUE (nombre)
)

;


CREATE TABLE rutas (
	id_ruta SERIAL NOT NULL, 
	fecha DATE NOT NULL, 
	hora_inicio TIMESTAMP WITHOUT TIME ZONE, 
	hora_fin TIMESTAMP WITHOUT TIME ZONE, 
	distancia_km DECIMAL(10, 2), 
	duracion_minutos DECIMAL(10, 2), 
	distancia_base_km DECIMAL(10, 2), 
	duracion_base_minutos DECIMAL(10, 2), 
	combustible_litros DECIMAL(10, 2), 
	costo_combustible DECIMAL(12, 2), 
	costo_mantenimiento DECIMAL(12, 2), 
	costo_conductor DECIMAL(12, 2), 
	costo_depreciacion DECIMAL(12, 2), 
	costo_seguro DECIMAL(12, 2), 
	costo_total DECIMAL(12, 2), 
	co2_kg DECIMAL(12, 2), 
	co2_evitable_kg DECIMAL(12, 2), 
	cumplimiento_ventanas_pct DECIMAL(5, 2), 
	estado VARCHAR(30), 
	algoritmo_utilizado VARCHAR(100), 
	PRIMARY KEY (id_ruta)
)

;


CREATE TABLE tipos_vehiculo (
	id_tipo SERIAL NOT NULL, 
	nombre VARCHAR(50) NOT NULL, 
	descripcion TEXT, 
	PRIMARY KEY (id_tipo), 
	UNIQUE (nombre)
)

;


CREATE TABLE trafico (
	id_trafico SERIAL NOT NULL, 
	fecha_hora TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	segmento VARCHAR(150), 
	latitud DECIMAL(10, 7), 
	longitud DECIMAL(10, 7), 
	nivel_congestion VARCHAR(20), 
	velocidad_kmh DECIMAL(6, 2), 
	fuente VARCHAR(100), 
	PRIMARY KEY (id_trafico)
)

;


CREATE TABLE ubicaciones (
	id_ubicacion SERIAL NOT NULL, 
	direccion TEXT NOT NULL, 
	referencia TEXT, 
	latitud DECIMAL(10, 7) NOT NULL, 
	longitud DECIMAL(10, 7) NOT NULL, 
	geom TEXT, 
	tipo VARCHAR(30), 
	PRIMARY KEY (id_ubicacion)
)

;


CREATE TABLE ventanas_tiempo (
	id_ventana SERIAL NOT NULL, 
	hora_inicio TIME WITHOUT TIME ZONE NOT NULL, 
	hora_fin TIME WITHOUT TIME ZONE NOT NULL, 
	tolerancia_minutos INTEGER, 
	penalizacion_por_minuto DECIMAL(10, 2), 
	PRIMARY KEY (id_ventana)
)

;


CREATE TABLE indicadores_ruta (
	id_indicador SERIAL NOT NULL, 
	id_ruta INTEGER NOT NULL, 
	distancia_km DECIMAL(10, 2), 
	combustible_l DECIMAL(10, 2), 
	co2_kg DECIMAL(12, 2), 
	costo_total DECIMAL(12, 2), 
	ahorro_combustible_l DECIMAL(10, 2), 
	ahorro_economico DECIMAL(12, 2), 
	co2_ahorrado_kg DECIMAL(12, 2), 
	cumplimiento_ventanas_pct DECIMAL(5, 2), 
	reduccion_co2_pct DECIMAL(5, 2), 
	reduccion_distancia_pct DECIMAL(5, 2), 
	fecha_calculo TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id_indicador), 
	FOREIGN KEY(id_ruta) REFERENCES rutas (id_ruta) ON DELETE CASCADE
)

;


CREATE TABLE paradas_ruta (
	id_parada SERIAL NOT NULL, 
	id_ruta INTEGER NOT NULL, 
	orden INTEGER NOT NULL, 
	latitud DECIMAL(10, 7) NOT NULL, 
	longitud DECIMAL(10, 7) NOT NULL, 
	ubicacion TEXT, 
	hora_llegada_estimada TIMESTAMP WITHOUT TIME ZONE, 
	hora_llegada_real TIMESTAMP WITHOUT TIME ZONE, 
	tiempo_servicio INTEGER, 
	tiempo_espera INTEGER, 
	tipo_parada VARCHAR(30), 
	PRIMARY KEY (id_parada), 
	FOREIGN KEY(id_ruta) REFERENCES rutas (id_ruta) ON DELETE CASCADE
)

;


CREATE TABLE pedidos (
	id_pedido SERIAL NOT NULL, 
	id_cliente INTEGER NOT NULL, 
	id_ventana_tiempo INTEGER NOT NULL, 
	direccion_entrega TEXT NOT NULL, 
	referencia TEXT, 
	latitud DECIMAL(10, 7) NOT NULL, 
	longitud DECIMAL(10, 7) NOT NULL, 
	ubicacion TEXT, 
	peso_kg DECIMAL(10, 2) NOT NULL, 
	volumen_m3 DECIMAL(10, 2) NOT NULL, 
	prioridad VARCHAR(20) NOT NULL, 
	tipo_producto VARCHAR(100) NOT NULL, 
	estado VARCHAR(30), 
	fecha_registro TIMESTAMP WITHOUT TIME ZONE DEFAULT now(), 
	PRIMARY KEY (id_pedido), 
	FOREIGN KEY(id_cliente) REFERENCES clientes (id_cliente) ON DELETE RESTRICT, 
	FOREIGN KEY(id_ventana_tiempo) REFERENCES ventanas_tiempo (id_ventana) ON DELETE RESTRICT
)

;


CREATE TABLE usuarios (
	id_usuario SERIAL NOT NULL, 
	id_rol INTEGER NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	email VARCHAR(150) NOT NULL, 
	password_hash TEXT NOT NULL, 
	estado VARCHAR(20), 
	fecha_creacion TIMESTAMP WITHOUT TIME ZONE, 
	ultimo_acceso TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id_usuario), 
	FOREIGN KEY(id_rol) REFERENCES roles (id_rol) ON DELETE RESTRICT, 
	UNIQUE (email)
)

;


CREATE TABLE vehiculos (
	id_vehiculo SERIAL NOT NULL, 
	id_tipo_vehiculo INTEGER NOT NULL, 
	placa VARCHAR(15) NOT NULL, 
	marca VARCHAR(50), 
	modelo VARCHAR(50), 
	anio_fabricacion INTEGER NOT NULL, 
	capacidad_kg DECIMAL(10, 2) NOT NULL, 
	capacidad_m3 DECIMAL(10, 2), 
	consumo_km_l DECIMAL(10, 2) NOT NULL, 
	factor_co2_kg_km DECIMAL(10, 4) NOT NULL, 
	tipo_combustible VARCHAR(30), 
	costo_adquisicion DECIMAL(12, 2), 
	valor_actual DECIMAL(12, 2), 
	depreciacion_anual DECIMAL(12, 2), 
	costo_soat_anual DECIMAL(12, 2), 
	costo_seguro_anual DECIMAL(12, 2), 
	estado VARCHAR(20), 
	PRIMARY KEY (id_vehiculo), 
	CONSTRAINT ck_veh_capacidad_positiva CHECK (capacidad_kg > 0), 
	CONSTRAINT ck_veh_consumo_positivo CHECK (consumo_km_l > 0), 
	CONSTRAINT ck_veh_factor_rango CHECK (factor_co2_kg_km > 0 AND factor_co2_kg_km < 1), 
	CONSTRAINT ck_veh_anio_rango CHECK (anio_fabricacion >= 1990 AND anio_fabricacion <= 2026), 
	FOREIGN KEY(id_tipo_vehiculo) REFERENCES tipos_vehiculo (id_tipo) ON DELETE RESTRICT, 
	UNIQUE (placa)
)

;


CREATE TABLE conductores (
	id_conductor SERIAL NOT NULL, 
	id_usuario INTEGER NOT NULL, 
	dni VARCHAR(15) NOT NULL, 
	nombre VARCHAR(100) NOT NULL, 
	apellido VARCHAR(100), 
	telefono VARCHAR(20), 
	anios_experiencia INTEGER, 
	hora_disponibilidad_inicio TIME WITHOUT TIME ZONE, 
	hora_disponibilidad_fin TIME WITHOUT TIME ZONE, 
	horas_max_conduccion DECIMAL(5, 2), 
	horas_conduccion_acumuladas DECIMAL(6, 2), 
	ubicacion_inicio TEXT, 
	estado VARCHAR(20), 
	PRIMARY KEY (id_conductor), 
	FOREIGN KEY(id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE, 
	UNIQUE (dni)
)

;


CREATE TABLE reportes (
	id_reporte SERIAL NOT NULL, 
	id_ruta INTEGER NOT NULL, 
	usuario_generador INTEGER, 
	tipo VARCHAR(50) NOT NULL, 
	fecha_generacion TIMESTAMP WITHOUT TIME ZONE, 
	ruta_archivo TEXT, 
	PRIMARY KEY (id_reporte), 
	FOREIGN KEY(id_ruta) REFERENCES rutas (id_ruta) ON DELETE CASCADE, 
	FOREIGN KEY(usuario_generador) REFERENCES usuarios (id_usuario) ON DELETE SET NULL
)

;


CREATE TABLE ruta_pedidos (
	id_ruta INTEGER NOT NULL, 
	id_pedido INTEGER NOT NULL, 
	orden_visita INTEGER NOT NULL, 
	hora_llegada_estimada TIMESTAMP WITHOUT TIME ZONE, 
	hora_llegada_real TIMESTAMP WITHOUT TIME ZONE, 
	tiempo_espera INTEGER, 
	penalizacion DECIMAL(10, 2), 
	estado_entrega VARCHAR(30), 
	PRIMARY KEY (id_ruta, id_pedido), 
	FOREIGN KEY(id_ruta) REFERENCES rutas (id_ruta) ON DELETE CASCADE, 
	FOREIGN KEY(id_pedido) REFERENCES pedidos (id_pedido) ON DELETE CASCADE
)

;


CREATE TABLE asignaciones (
	id_asignacion SERIAL NOT NULL, 
	id_ruta INTEGER NOT NULL, 
	id_vehiculo INTEGER NOT NULL, 
	id_conductor INTEGER NOT NULL, 
	fecha_asignacion TIMESTAMP WITHOUT TIME ZONE, 
	hora_salida TIMESTAMP WITHOUT TIME ZONE, 
	hora_retorno TIMESTAMP WITHOUT TIME ZONE, 
	horas_conduccion DECIMAL(6, 2), 
	horas_descanso DECIMAL(6, 2), 
	descanso_requerido BOOLEAN, 
	estado VARCHAR(20), 
	PRIMARY KEY (id_asignacion), 
	FOREIGN KEY(id_ruta) REFERENCES rutas (id_ruta) ON DELETE CASCADE, 
	FOREIGN KEY(id_vehiculo) REFERENCES vehiculos (id_vehiculo) ON DELETE RESTRICT, 
	FOREIGN KEY(id_conductor) REFERENCES conductores (id_conductor) ON DELETE RESTRICT
)

;


CREATE TABLE licencias (
	id_licencia SERIAL NOT NULL, 
	id_conductor INTEGER NOT NULL, 
	numero VARCHAR(30) NOT NULL, 
	categoria VARCHAR(20) NOT NULL, 
	fecha_emision DATE, 
	fecha_vencimiento DATE, 
	estado VARCHAR(20), 
	PRIMARY KEY (id_licencia), 
	FOREIGN KEY(id_conductor) REFERENCES conductores (id_conductor) ON DELETE CASCADE, 
	UNIQUE (numero)
)

;

-- 0 datos: solo esquema, sin INSERTs
