"""Optimizador de rutas: VRPTW + Green VRP (HU-06).

Metaheurística: Recocido Simulado (SA) sobre una solución inicial de
tipo Savings (Clarke & Wright) adaptada a ventanas de tiempo.

El DDL restringe rutas.algoritmo_utilizado a ('GA','TABU','ACO','SA'),
por lo que este módulo se identifica como SA.

Restricciones implementadas (reglas de negocio):
  RN-003  vehículo no elegible por último dígito de placa (MTC)
  RN-004  jornada máxima de 8 h y descanso de 1 h por cada 4 h
  RN-005  ventanas de tiempo con penalización por tardanza
  RN-006  capacidad de peso y volumen
  RN-007  peso por prioridad en la función objetivo
  RN-008  perecederos en primeras 4 h, no mezclar con químicos
  RN-012  horario operativo 05:00 - 22:00
  RN-015  neblina invernal 06:00-08:00 (+15% tiempo)
  RN-022  distancia vacía desde el punto de partida del conductor

Además del tráfico (que encarece el tiempo), se esquivan los puntos
con obstrucción en la calzada: el cono que coloca un conductor y los
incidentes de nivel alto.
"""
import math
import random

from app.core import parametros as P
from app.core import licencias as LIC
from app.services import calculos as C

# Radio en km dentro del cual un obstáculo obliga a desviarse. A
# menos de esto el conductor tiene margen para rodearlo sin que
# merezca la pena reordenar la ruta entera.
RADIO_OBSTACULO_KM = 0.4
from app.services import roads as R

# D.S. 033-2012-MTC: el último dígito de la placa indica el día en que
# no puede circular. 0 = lunes ... 5 = sábado; domingo sin restricción.
MTC_NO_CIRCULA = {
    1: {0},  # lunes
    2: {1},  # martes
    3: {2},  # miércoles
    4: {3},  # jueves
    5: {4},  # viernes
    6: {5},  # sábado
    7: set(),  # domingo
}


class Cliente:
    """Pedido dentro del problema de optimización."""

    __slots__ = (
        'id_pedido', 'id_cliente', 'direccion', 'latitud', 'longitud',
        'peso', 'volumen', 'prioridad', 'peso_prioridad',
        'tipo_producto', 'indice', 'ventana_inicio', 'ventana_fin',
        'tolerancia', 'penalizacion_minuto', 'hora_llegada',
        'tiempo_espera', 'penalizacion',
    )

    def __init__(self, indice, fila):
        self.indice = indice
        self.id_pedido = fila['id_pedido']
        self.id_cliente = fila['id_cliente']
        self.direccion = fila['direccion_entrega']
        self.latitud = float(fila['latitud'])
        self.longitud = float(fila['longitud'])
        self.peso = float(fila['peso_kg'])
        self.volumen = float(fila['volumen_m3'])
        self.prioridad = fila['prioridad']
        self.peso_prioridad = P.PESO_PRIORIDAD.get(fila['prioridad'], 1.0)
        self.tipo_producto = fila['tipo_producto']

        self.tolerancia = int(fila['tolerancia_minutos'] or 0)
        self.penalizacion_minuto = float(
            fila['penalizacion_por_minuto']
            if fila['penalizacion_por_minuto'] is not None
            else P.PENALIZACION_POR_MINUTO
        )

        hi = C.a_hora(fila['hora_inicio'])
        hf = C.a_hora(fila['hora_fin'])

        h_ini = hi[0] if hi else P.HORA_OPERATIVA_INICIO
        h_fin = hf[0] if hf else P.HORA_OPERATIVA_FIN

        # RN-012: la ventana se recorta al horario operativo
        h_ini = min(h_ini, P.HORA_OPERATIVA_FIN)
        h_fin = max(h_fin, h_ini)

        self.ventana_inicio = h_ini * 60
        self.ventana_fin = min(h_fin, P.HORA_OPERATIVA_FIN) * 60

        # Se rellenan durante la evaluación
        self.hora_llegada = None
        self.tiempo_espera = 0.0
        self.penalizacion = 0.0

    def es_perecedero(self):
        return self.tipo_producto == 'PERECEDERO'

    def __repr__(self):
        return f"Cliente({self.id_pedido})"


class Vehiculo:
    __slots__ = (
        'id_vehiculo', 'placa', 'capacidad_kg', 'capacidad_m3',
        'consumo_km_l', 'factor_co2_kg_km', 'tipo_combustible',
        'tipo_nombre', 'datos', 'carga_kg', 'carga_m3',
    )

    def __init__(self, fila):
        self.id_vehiculo = fila['id_vehiculo']
        self.placa = fila['placa']
        self.capacidad_kg = float(fila['capacidad_kg'])
        self.capacidad_m3 = float(fila['capacidad_m3'])
        self.consumo_km_l = float(fila['consumo_km_l'])
        self.factor_co2_kg_km = float(fila['factor_co2_kg_km'])
        self.tipo_combustible = fila['tipo_combustible']
        # Tipo del maestro tipos_vehiculo: decide qué licencia exige
        self.tipo_nombre = fila.get('tipo_nombre')
        self.datos = dict(fila)
        self.carga_kg = 0.0
        self.carga_m3 = 0.0

    def cabe(self, cliente):
        return (
            self.carga_kg + cliente.peso <= self.capacidad_kg
            and self.carga_m3 + cliente.volumen <= self.capacidad_m3
        )

    def agregar(self, cliente):
        self.carga_kg = round(self.carga_kg + cliente.peso, 6)
        self.carga_m3 = round(self.carga_m3 + cliente.volumen, 6)

    def quitar(self, cliente):
        self.carga_kg = round(self.carga_kg - cliente.peso, 6)
        self.carga_m3 = round(self.carga_m3 - cliente.volumen, 6)

    def reiniciar(self):
        self.carga_kg = 0.0
        self.carga_m3 = 0.0

    def ultimo_digito(self):
        digitos = ''.join(c for c in self.placa if c.isdigit())

        return int(digitos[-1]) if digitos else None

    def elegible_hoy(self, dia_semana):
        """RN-003."""
        digito = self.ultimo_digito()

        if digito is None:
            return True

        return digito not in MTC_NO_CIRCULA.get(dia_semana, set())


class Conductor:
    __slots__ = (
        'id_conductor', 'id_usuario', 'nombre_completo', 'horas_max',
        'horas_acumuladas', 'latitud', 'longitud',
        'disponibilidad_inicio', 'disponibilidad_fin',
        'categorias_licencia', 'indice', 'sale_del_local',
    )

    def __init__(self, fila, base):
        self.id_conductor = fila['id_conductor']
        self.id_usuario = fila['id_usuario']
        self.nombre_completo = (
            f"{fila['nombre']} {fila['apellido']}".strip()
        )

        # Posición dentro de ProblemaVRPTW.conductores. La usa el
        # índice de la matriz de distancias por calzada para saber
        # desde dónde parte la ruta de este conductor.
        self.indice = -1

        # True si hoy es su primer reparto: entonces sale del local.
        self.sale_del_local = False

        # Licencias vigentes y no vencidas: determinan a qué
        # vehículos puede subir (app/core/licencias.py).
        self.categorias_licencia = list(
            fila.get('categorias_licencia') or []
        )
        self.horas_max = min(
            float(fila['horas_max_conduccion'] or P.HORAS_MAX_JORNADA),
            P.HORAS_MAX_JORNADA,
        )
        self.horas_acumuladas = float(
            fila['horas_conduccion_acumuladas'] or 0
        )

        hi = C.a_hora(fila['hora_disponibilidad_inicio'])
        hf = C.a_hora(fila['hora_disponibilidad_fin'])

        self.disponibilidad_inicio = (
            max(hi[0], P.HORA_OPERATIVA_INICIO) if hi
            else P.HORA_OPERATIVA_INICIO
        ) * 60

        self.disponibilidad_fin = (
            min(hf[0], P.HORA_OPERATIVA_FIN) if hf
            else P.HORA_OPERATIVA_FIN
        ) * 60

        # RN-022: parte del conductor; si no tiene, la base operativa
        latitud_inicio = fila.get('latitud_inicio')
        longitud_inicio = fila.get('longitud_inicio')

        if latitud_inicio is not None and longitud_inicio is not None:
            self.latitud = float(latitud_inicio)
            self.longitud = float(longitud_inicio)
        elif fila.get('ubicacion_inicio'):
            self.latitud = float(fila['ubicacion_inicio'].y)
            self.longitud = float(fila['ubicacion_inicio'].x)
        else:
            self.latitud = base['latitud']
            self.longitud = base['longitud']

    def horas_libres(self):
        """RN-004."""
        return max(
            0.0,
            min(self.horas_max, P.HORAS_MAX_JORNADA)
            - self.horas_acumuladas,
        )


class Ruta:
    """Ruta asignada a un vehículo y un conductor."""

    __slots__ = (
        'vehiculo', 'conductor', 'secuencia', 'distancia_km',
        'minutos', 'costo_total', 'co2_kg', 'penalizacion',
        'minutos_conduccion', 'minutos_espera', 'minutos_servicio',
        'requiere_descanso', 'posiciones_descanso', 'cumplimiento_pct',
        'puede_ordenar_por_ventana',
    )

    def __init__(self, vehiculo, conductor):
        self.vehiculo = vehiculo
        self.conductor = conductor
        self.secuencia = []

        # El reordenado por ventana de tiempo solo se usa al construir
        # la solución inicial. En cuanto se ha hecho, el orden pasa a
        # ser del optimizador.
        self.puede_ordenar_por_ventana = True
        self.distancia_km = 0.0
        self.minutos = 0.0
        self.minutos_conduccion = 0.0
        self.minutos_espera = 0.0
        self.minutos_servicio = 0.0
        self.costo_total = 0.0
        self.co2_kg = 0.0
        self.penalizacion = 0.0
        self.requiere_descanso = False
        self.posiciones_descanso = []
        self.cumplimiento_pct = None

    def recalcular_carga(self):
        self.vehiculo.reiniciar()

        for c in self.secuencia:
            self.vehiculo.agregar(c)


class ProblemaVRPTW:
    """Construye y evalúa soluciones de VRPTW con componente ambiental."""

    def __init__(
        self, pedidos, vehiculos, conductores, base, fecha,
        trafico=None, incidentes=None, obstaculos=None,
        primera_ruta=None,
    ):
        self.base = base
        self.fecha = fecha
        # isoweekday ya devuelve 1=lunes ... 7=domingo, que es
        # exactamente la convención de MTC_NO_CIRCULA.
        self.dia_semana = fecha.isoweekday()

        self.clientes = [
            Cliente(i, p) for i, p in enumerate(pedidos)
        ]
        self.vehiculos = [Vehiculo(v) for v in vehiculos]
        self.conductores = [Conductor(c, base) for c in conductores]
        self.trafico = list(trafico or [])
        self.incidentes = list(incidentes or [])
        self.obstaculos = list(obstaculos or [])

        # Conductores que hoy todavía no han salido: de ellos sale
        # el primer reparto desde el local.
        self.primera_ruta = (
            set(primera_ruta) if primera_ruta is not None else None
        )

        # Puntos que el recorrido tiene que esquivar por completo:
        # el cono que puso un conductor y los incidentes de nivel
        # alto. Se guardan aparte del tráfico porque aquí no se
        # "paga más": se penaliza, pero el objetivo de la ruta no
        # cambia por igual que el tráfico.
        self._puntos_a_esquivar = []

        for o in self.obstaculos:
            if not o.get("resuelto", False):
                self._puntos_a_esquivar.append({
                    "latitud": float(o["latitud"]),
                    "longitud": float(o["longitud"]),
                    "peso": 1.0,
                    "que": o.get("descripcion") or "obstáculo",
                })

        for i in self.incidentes:
            if i.get("nivel") != "ALTO":
                continue

            self._puntos_a_esquivar.append({
                "latitud": float(i["latitud"]),
                "longitud": float(i["longitud"]),
                "peso": 0.6,
                "que": i.get("descripcion") or "incidente",
            })

        for i, cond in enumerate(self.conductores):
            cond.indice = i

        # Rutas que no pudieron tener conductor, con el motivo.
        # Lo llena asignar_conductores().
        self.sin_conductor = []

        # La matriz de distancias cubre también los puntos de
        # partida, no solo las paradas. Una ruta sale del local o de
        # donde esté el conductor, y ese primer tramo también tiene
        # que medirse por calle.
        #
        #   índices 0 .. len(origenes)-1        puntos de partida
        #   índices len(origenes) .. fin        paradas de los pedidos
        #
        # El primer punto es siempre el local de la empresa.
        self._origenes = [(self.base['latitud'], self.base['longitud'])]

        # De dónde sale cada conductor.
        #
        #   - Si hoy todavía no tiene ruta, sale del local: el
        #     vehículo estaba ahí antes de empezar el día.
        #   - Si ya tiene ruta, sale de donde esté, que es lo que
        #     evita el viaje en vacío entre reparto y reparto.
        #
        # Se guardan como índices y no como offsets fijos porque un
        # conductor cuya primera parada sea el local comparte punto
        # con el índice 0: si se metiera su propia fila, la matriz
        # tendría dos filas con las mismas coordenadas y el cálculo
        # se Lepsafearía.
        self._indice_origen_por_conductor = {}

        for cond in self.conductores:
            desde_local = (
                self.primera_ruta is not None
                and cond.id_conductor in self.primera_ruta
            )

            cond.sale_del_local = desde_local

            if desde_local:
                self._indice_origen_por_conductor[cond.id_conductor] = 0

                continue

            punto = (cond.latitud, cond.longitud)

            indice = self._buscar_o_agregar_origen(punto)

            self._indice_origen_por_conductor[cond.id_conductor] = indice

        self._coordenadas = self._origenes + [
            (c.latitud, c.longitud) for c in self.clientes
        ]

        self._total = len(self._coordenadas)

        self._usar_calles_reales = False
        self._minutos_reales = None

        # El motor de rutas devuelve la matriz entera en una sola
        # petición; si no está disponible se cae a la estimación por
        # factor de rodeo y se avisa.
        km_reales, minutos_reales = R.matriz_distancias(
            self._coordenadas
        )

        if km_reales is not None:
            self._dist = km_reales
            self._minutos_reales = minutos_reales
            self._usar_calles_reales = True

        else:
            self._dist = [
                [0.0] * self._total for _ in range(self._total)
            ]

            for i in range(self._total):
                lat_i, lon_i = self._coordenadas[i]

                for j in range(i + 1, self._total):
                    lat_j, lon_j = self._coordenadas[j]

                    d = C.distancia_via_km(lat_i, lon_i, lat_j, lon_j)

                    self._dist[i][j] = d
                    self._dist[j][i] = d

    # ---------------- matriz de distancias ----------------

    def _buscar_o_agregar_origen(self, punto):
        """Índice de un punto de partida, reutilizando si ya existe."""
        for i, existente in enumerate(self._origenes):
            if existente == punto:
                return i

        self._origenes.append(punto)

        return len(self._origenes) - 1

    def _idx_origen(self, conductor):
        """Índice del punto del que sale la ruta de ese conductor.

        El local es siempre el 0. Un conductor que hoy hace su primer
        reparto también sale de ahí; el resto, de donde esté.
        """
        if conductor is None:
            return 0

        return self._indice_origen_por_conductor.get(
            conductor.id_conductor, 0
        )

    def _idx_retorno(self, conductor, hora_fin_minutos):
        """Índice del punto al que vuelve el vehículo al terminar.

        De noche el vehículo vuelve al local: no se queda el
        conductor en la calle. De día regresa al punto del que
        salió, que es lo que evita el viaje en vacío.
        """
        if conductor is None:
            return 0

        if hora_fin_minutos >= P.HORA_RETORNO_LOCAL * 60:
            return 0

        return self._idx_origen(conductor)

    def _idx_parada(self, cliente):
        """Índice de una parada dentro de la matriz."""
        return len(self._origenes) + cliente.indice

    def _distancia(self, indice_a, indice_b):
        """Distancia por calzada entre dos puntos de la matriz.

        Con el motor disponible sale de la matriz real. Sin él cae a
        la estimación por factor de rodeo, que es lo que se usaba
        antes de consultar el motor.
        """
        return self._dist[indice_a][indice_b]

    # ---------------- utilidades ----------------

    def _factor_tramo(self, cliente, minuto_absoluto):
        """Factor de tiempo por tráfico, neblina y obstáculos."""
        hora = int(minuto_absoluto // 60)

        factor = C.factor_congestion(
            cliente.latitud, cliente.longitud, self.trafico
        )

        if C.es_franja_neblina(self.fecha, hora):
            factor *= 1 + P.PENALIZACION_NEBLINA

        factor *= self._factor_obstaculo(cliente.latitud, cliente.longitud)

        return factor

    def _factor_obstaculo(self, latitud, longitud):
        """Cuánto encarece pasar por un cono o un incidente grave.

        Los obstáculos de la calzada (el cono, una obra, un árbol
        caído) no se esquivan con un rodeo pequeño como el tráfico:
        están en el punto exacto. Por eso el multiplicador es alto,
        para que el optimizador reúna las paradas de un lado y las
        del otro antes que pasar por el punto bloqueado.

        Un obstáculo a más de RADIO_OBSTACULO_KM no afecta: el
        conductor tiene margen para esquivarlo sin penalización.
        """
        peor = 1.0

        for punto in self._puntos_a_esquivar:
            d = C.haversine_km(
                latitud, longitud,
                punto["latitud"], punto["longitud"],
            )

            if d > RADIO_OBSTACULO_KM:
                continue

            # Cuanto más cerca del punto, peor. A 200 m el tramo está
            # prácticamente sobre el cono.
            cercania = 1.0 - (d / RADIO_OBSTACULO_KM)

            peso = punto["peso"] * (1.0 + 3.0 * cercania)

            peor = max(peor, 1.0 + peso)

        return peor

    def _tipos(self, ruta):
        return {c.tipo_producto for c in ruta.secuencia}

    def _compatible(self, ruta, cliente):
        """RN-008: perecedero y químico no comparten vehículo."""
        tipos = self._tipos(ruta)

        if cliente.tipo_producto in tipos:
            return True

        incompatibles = P.TIPOS_INCOMPATIBLES.get(
            cliente.tipo_producto, set()
        )

        return not (tipos & incompatibles)

    # ---------------- evaluación ----------------

    def evaluar_ruta(self, ruta, guardar_horas=False):
        """Calcula distancia, tiempos, costo, CO2 y penalización.

        `guardar_horas` deja en cada parada la hora a la que se llega,
        con todo el modelo aplicado: velocidad según la hora del día,
        tráfico, incidentes, conos, esperas por ventana y descanso.

        Quien guarda el recorrido en la base debe pedirlo. Si cada uno
        se calculara las horas por su cuenta, el mismo recorrido
        llegaría a horas distintas según quién preguntara, y la
        penalización de una fila podría contradecir a la hora de esa
        misma fila.
        """
        self._evaluar_geomeria(ruta)

        if not ruta.secuencia:
            self._asignar_vacios(ruta)
            return self.costo_ruta(ruta)

        cond = ruta.conductor

        if cond is not None:
            indice_ori = self._idx_origen(cond)
            minuto = cond.disponibilidad_inicio
        else:
            indice_ori = self._idx_origen(None)
            minuto = P.HORA_OPERATIVA_INICIO * 60

        distancia = 0.0
        minutos_cond = 0.0
        minutos_espera = 0.0
        minutos_serv = 0.0
        penalizacion = 0.0
        tiempos = []
        minutos_continuos = 0.0
        posiciones_descanso = []
        descanso_pendiente = 0.0

        for c in ruta.secuencia:
            indice_dest = self._idx_parada(c)
            tramo = self._distancia(indice_ori, indice_dest)
            distancia += tramo

            factor = self._factor_tramo(c, minuto)
            velocidad = C.velocidad_referencia(int(minuto // 60))
            t_tramo = C.minutos_de_conduccion(
                tramo, velocidad, factor
            )
            minutos_cond += t_tramo
            minutos_continuos += t_tramo
            minuto += t_tramo

            # RN-004: descanso de 1 h tras 4 h continuas
            if (
                minutos_continuos
                >= P.HORAS_MAX_CONTINUAS * 60
            ):
                descanso_pendiente += P.DESCANSO_OBLIGATORIO_HORAS * 60
                minutos_continuos = 0.0
                posiciones_descanso.append(len(tiempos))
                minuto += P.DESCANSO_OBLIGATORIO_HORAS * 60

            # RN-005: espera por ventana
            if minuto < c.ventana_inicio:
                espera = c.ventana_inicio - minuto
                minutos_espera += espera
                c.tiempo_espera = espera
                minuto = c.ventana_inicio
            else:
                c.tiempo_espera = 0.0

            limite = c.ventana_fin + c.tolerancia
            if minuto > limite:
                c.penalizacion = C.minutos_penalidad_ventana(
                    minuto - limite, c.penalizacion_minuto
                )
            else:
                c.penalizacion = 0.0

            penalizacion += c.penalizacion

            minutos_serv += C.minutos_de_servicio()
            minutos_continuos += C.minutos_de_servicio()
            minuto += C.minutos_de_servicio()

            tiempos.append(minuto)

            indice_ori = indice_dest

        # Retorno al origen (RN-022)
        if ruta.secuencia:
            ultimo = ruta.secuencia[-1]
            # RN-022 y cierre de día: de noche el vehículo vuelve al
            # local en vez de quedarse donde esté el conductor.
            # El tramo de vuelta se mide hasta donde realmente
            # acaba, que es lo que cambia el total.
            destino_vuelta = self._idx_retorno(
                cond, minuto + minutos_espera + minutos_serv
            )

            tramo = self._distancia(indice_ori, destino_vuelta)
            distancia += tramo
            factor = self._factor_tramo(ultimo, minuto)
            minutos_cond += C.minutos_de_conduccion(
                tramo,
                C.velocidad_referencia(int(minuto // 60)),
                factor,
            )
            minuto += C.minutos_de_conduccion(
                tramo,
                C.velocidad_referencia(int(minuto // 60)),
                factor,
            )

        ruta.distancia_km = round(distancia, P.REDONDEO)
        ruta.minutos_conduccion = round(minutos_cond, P.REDONDEO)
        ruta.minutos_espera = round(minutos_espera, P.REDONDEO)
        ruta.minutos_servicio = round(minutos_serv, P.REDONDEO)
        ruta.minutos = round(minutos_cond + minutos_espera + minutos_serv, P.REDONDEO)
        ruta.penalizacion = round(penalizacion, P.REDONDEO)
        ruta.requiere_descanso = bool(posiciones_descanso)
        ruta.posiciones_descanso = posiciones_descanso

        tco = C.calcular_tco(ruta.distancia_km, ruta.vehiculo.datos)
        ruta.costo_total = tco['costo_total']
        ruta.co2_kg = tco['co2_kg']

        ruta.recalcular_carga()

        # RN-005: cumplimiento de ventanas de tiempo
        aTiempo = sum(
            1 for c in ruta.secuencia if c.penalizacion == 0
        )
        ruta.cumplimiento_pct = round(
            100.0 * aTiempo / len(ruta.secuencia), P.REDONDEO
        ) if ruta.secuencia else None

        if guardar_horas:
            for c, t in zip(ruta.secuencia, tiempos):
                c.hora_llegada = t

        return self.costo_ruta(ruta)

    def _evaluar_geomeria(self, ruta):
        """Ordena las paradas por ventana de tiempo (RN-005).

        Se hace ANTES de que el recocido simulado empiece a buscar,
        una sola vez, para que la solución inicial sea sensata: primero
        las entregas cuya ventana se cierra antes.

        Lo que no puede hacer esta función es reordenar en cada
        evaluación. Si lo hiciera, el recocido no podría decidir el
        orden: por muchas permutaciones que probara, todas se
        convertirían en el mismo orden y el optimizador no tendría
        nada que mejorar.

        Por eso este reordenado solo ocurre en la solución inicial
        (una vez) y en la reoptimización, que parte del orden que ya
        tiene la ruta y no lo toca. El indicador
        `puede_ordenar_por_ventana` se pone en False en cuanto se ha
        usado, de modo que a partir de ahí el orden es del
        optimizador.
        """
        if not ruta.puede_ordenar_por_ventana:
            return

        ruta.secuencia.sort(key=lambda c: (
            c.ventana_inicio, -c.peso_prioridad, c.id_pedido
        ))

        ruta.puede_ordenar_por_ventana = False

    def _asignar_vacios(self, ruta):
        ruta.distancia_km = 0.0
        ruta.minutos = 0.0
        ruta.minutos_conduccion = 0.0
        ruta.minutos_espera = 0.0
        ruta.minutos_servicio = 0.0
        ruta.costo_total = 0.0
        ruta.co2_kg = 0.0
        ruta.penalizacion = 0.0
        ruta.requiere_descanso = False
        ruta.posiciones_descanso = []
        ruta.cumplimiento_pct = None
        ruta.recalcular_carga()

    def costo_ruta(self, ruta):
        """Función objetivo: distancia + tiempo + costo + CO2 + penalización."""
        if not ruta.secuencia:
            return 0.0

        peso = sum(c.peso_prioridad for c in ruta.secuencia)

        objetivo = (
            ruta.distancia_km * 1.0
            + ruta.minutos * 0.35
            + ruta.costo_total * 0.10
            + ruta.co2_kg * 0.20
            + ruta.penalizacion * 2.0
        )

        objetivo /= max(1.0, peso)

        # RN-004: exceder jornada disponible penaliza
        if ruta.conductor is not None:
            horas = ruta.minutos / 60.0
            libres = ruta.conductor.horas_libres()
            if horas > libres:
                objetivo += (horas - libres) * 200

        # RN-008: perecedero fuera de las primeras 4 h
        limite = P.HORAS_MAX_PERECEDERO * 60
        acumulado = 0.0

        for pos, c in enumerate(ruta.secuencia):
            if pos == 0:
                acumulado = c.tiempo_espera
            else:
                acum_tramo = C.minutos_de_conduccion(
                    self._distancia(
                        self._idx_parada(ruta.secuencia[pos - 1]),
                        self._idx_parada(c),
                    ),
                    C.velocidad_referencia(8),
                    1.0,
                )
                acumulado += acum_tramo + C.minutos_de_servicio()
                acumulado += c.tiempo_espera

            if c.es_perecedero() and acumulado > limite:
                objetivo += 400

        return round(objetivo, P.REDONDEO)

    def coste_total(self, rutas):
        return round(sum(self.costo_ruta(r) for r in rutas), P.REDONDEO)

    # ---------------- construcción inicial ----------------

    def _vehiculos_elegibles(self):
        return [
            v for v in self.vehiculos
            if v.elegible_hoy(self.dia_semana)
        ]

    def solucion_inicial(self):
        """Savings: asigna cada pedido al vehículo con menor carga.

        Un vehículo no puede atender dos rutas a la vez, así que una
        ruta nueva sólo puede crearse con un vehículo libre.
        """
        vehiculos = self._vehiculos_elegibles()
        rutas = []

        if not vehiculos:
            return rutas

        for cliente in self.clientes:
            # Intento 1: añadir a una ruta ya abierta
            candidatas = [
                r for r in rutas
                if r.vehiculo.cabe(cliente)
                and self._compatible(r, cliente)
            ]

            if candidatas:
                mejor = min(
                    candidatas,
                    key=lambda r: r.vehiculo.carga_kg,
                )
                mejor.secuencia.append(cliente)
                mejor.vehiculo.agregar(cliente)
                continue

            # Intento 2: abrir ruta con un vehículo libre
            en_uso = {r.vehiculo.id_vehiculo for r in rutas}

            libres = [
                v for v in vehiculos
                if v.id_vehiculo not in en_uso and v.cabe(cliente)
            ]

            if not libres:
                # Ningún vehículo libre con capacidad (RN-006)
                continue

            vehiculo = min(
                libres,
                key=lambda v: v.carga_kg / v.capacidad_kg,
            )

            ruta = Ruta(vehiculo, None)
            ruta.secuencia.append(cliente)
            vehiculo.agregar(cliente)
            rutas.append(ruta)

        for r in rutas:
            self.evaluar_ruta(r)

        return [r for r in rutas if r.secuencia]

    # ---------------- recocido simulado ----------------

    def optimizar(self, semilla=None, iteraciones=250, rng=None):
        """SA sobre la solución inicial."""
        rng = rng or random.Random(semilla if semilla is not None else 42)

        rutas = self.solucion_inicial()

        if not rutas:
            return []

        actual = [self._clonar(r) for r in rutas]
        actual_costo = self.coste_total(actual)

        mejor = [self._clonar(r) for r in actual]
        mejor_costo = actual_costo

        T0, Tf = 40.0, 0.5
        enfriamiento = (Tf / T0) ** (1.0 / max(1, iteraciones))
        T = T0

        for _ in range(iteraciones):
            movimiento = self._vecino(actual, rng)

            if movimiento is None:
                T *= enfriamiento
                continue

            self._deshacer(actual, movimiento)

            self._evaluar_todas(actual)
            nuevo_costo = self.coste_total(actual)

            if nuevo_costo < actual_costo:
                actual_costo = nuevo_costo
            elif rng.random() < math.exp(
                -(nuevo_costo - actual_costo) / max(0.01, T)
            ):
                pass  # acepta
            else:
                self._rehacer(actual, movimiento)
                self._evaluar_todas(actual)
                actual_costo = self.coste_total(actual)

            if actual_costo < mejor_costo:
                mejor_costo = actual_costo
                mejor = [self._clonar(r) for r in actual]

            T *= enfriamiento

        for r in mejor:
            self.evaluar_ruta(r)

        return mejor

    # ---------------- reoptimización de una ruta ----------------

    def fijar_secuencia(self, vehiculo, conductor, orden):
        """Arma una ruta con un orden dado, sin reordenar nada.

        Comprueba que los pedidos existan, que no estén repetidos y
        que quepan en el vehículo (RN-006), y calcula distancia,
        tiempos, esperas y penalizaciones de esa secuencia tal cual.

        Es lo que usan tanto la reoptimización como el adelante de un
        pedido. La diferencia está en lo que se hace después:

          - reoptimizar_secuencia parte de aquí y busca un orden mejor
          - quien llama a esto fija el orden y lo respeta

        Existe separada por un motivo concreto: si al adelantar un
        pedido se pasara por aquí y luego por el recocido simulado, el
        optimizador podría deshacer el adelanto que el usuario acaba
        de confirmar. Lo que el usuario confirma se queda.

        Devuelve (ruta, None) o (None, motivo).
        """
        por_id = {c.id_pedido: c for c in self.clientes}

        secuencia = []

        for id_pedido in orden:
            cliente = por_id.get(id_pedido)

            if cliente is None:
                return None, (
                    f"El pedido {id_pedido} ya no está disponible "
                    f"para planificar"
                )

            secuencia.append(cliente)

        if not secuencia:
            return None, "La ruta no tiene pedidos que reoptimizar"

        if len({c.id_pedido for c in secuencia}) != len(secuencia):
            return None, "La ruta tiene pedidos repetidos"

        # RN-006: los pedidos tienen que caber en el vehículo que ya
        # tiene. No se cambia de vehículo, así que si no caben no hay
        # reoptimización posible.
        total_kg = sum(c.peso for c in secuencia)
        total_m3 = sum(c.volumen for c in secuencia)

        if total_kg > vehiculo.capacidad_kg:
            return None, (
                f"Los pedidos suman {total_kg:.0f} kg y el vehículo "
                f"{vehiculo.placa} solo admite "
                f"{vehiculo.capacidad_kg:.0f} kg"
            )

        if total_m3 > vehiculo.capacidad_m3:
            return None, (
                f"Los pedidos suman {total_m3:.1f} m³ y el vehículo "
                f"{vehiculo.placa} solo admite "
                f"{vehiculo.capacidad_m3:.1f} m³"
            )

        ruta = Ruta(vehiculo, conductor)
        ruta.secuencia = list(secuencia)
        ruta.recalcular_carga()

        # El reordenado automático por ventana de tiempo es para
        # cuando se empieza de cero. Una ruta que ya existe tiene un
        # orden hecho por el sistema y por el conductor, y aquí ese
        # orden es el que se quiere.
        ruta.puede_ordenar_por_ventana = False

        self.evaluar_ruta(ruta)

        return ruta, None

    def reoptimizar_secuencia(
        self, vehiculo, conductor, orden_actual,
        semilla=None, iteraciones=250, rng=None,
    ):
        """Recorre mejor las paradas de UNA ruta, sin cambiar de unidad.

        Es lo que hace la reoptimización de HU-08. La ruta ya existe
        con su vehículo y su conductor asignados, y ambos se quedan
        como están: lo que se corrige es el orden de visita, a la luz
        del tráfico del momento y del resto de factores de la
        consigna (ventanas de tiempo, perecederos, jornada, neblina).

        No se reparten pedidos entre otros vehículos ni se buscan
        otros conductores. Si con esta unidad ya no se pueden atender
        todos sus pedidos, no se inventa nada: se devuelve el motivo
        para que la interfaz lo muestre.

        Devuelve (ruta_optimizada, motivo). Si motivo no es None, la
        ruta no se modificó.
        """
        inicial, motivo = self.fijar_secuencia(
            vehiculo, conductor, orden_actual
        )

        if inicial is None:
            return None, motivo

        if len(inicial.secuencia) < 2:
            # Con una sola parada no hay orden que corregir.
            return inicial, None

        rng = rng or random.Random(
            semilla if semilla is not None else 42
        )

        actual = self._clonar(inicial)

        self.evaluar_ruta(actual)
        actual_costo = self.costo_ruta(actual)

        mejor = self._clonar(actual)
        mejor_costo = actual_costo

        T0, Tf = 40.0, 0.5
        enfriamiento = (Tf / T0) ** (1.0 / max(1, iteraciones))
        T = T0

        for _ in range(iteraciones):
            movimiento = self._vecino_interno(actual, rng)

            if movimiento is None:
                T *= enfriamiento
                continue

            # El movimiento ya viene aplicado sobre la ruta. Se
            # guarda la secuencia previa por si hay que rechazarlo.
            _, (cual, anterior) = movimiento

            self.evaluar_ruta(actual)
            nuevo_costo = self.costo_ruta(actual)

            if nuevo_costo < actual_costo:
                actual_costo = nuevo_costo
            elif rng.random() < math.exp(
                -(nuevo_costo - actual_costo) / max(0.01, T)
            ):
                pass  # acepta
            else:
                # El movimiento no mejora nada: se devuelve la
                # secuencia que había justo antes de aplicarlo.
                actual.secuencia = list(anterior)

                self.evaluar_ruta(actual)
                actual_costo = self.costo_ruta(actual)

            if actual_costo < mejor_costo:
                mejor_costo = actual_costo
                mejor = self._clonar(actual)

            T *= enfriamiento

        # El guardado final recalcula todo con los valores definitivos
        self.evaluar_ruta(mejor)

        return mejor, None

    def _vecino_interno(self, ruta, rng):
        """Aplica un movimiento de reordenación dentro de una ruta.

        Devuelve el estado ANTERIOR de la secuencia, listo para
        devolverla tal cual en caso de que el movimiento se rechace.
        Guardar el estado previo en vez de intentar deducir el
        inverso es lo que garantiza que la ruta vuelva exactamente
        como estaba: no hay forma de que un movimiento mal invertido
        deje paradas cambiadas de sitio sin querer.

        Los tres operadores son los habituales dentro de una ruta:

          intercambiar  dos paradas cambian de lugar
          reubicar     una parada se mueve a otra posición
          segmento      dos o tres paradas consecutivas se trasladan
                        juntas, sin dar la vuelta al resto
        """
        n = len(ruta.secuencia)

        if n < 2:
            return None

        anterior = list(ruta.secuencia)
        dado = rng.random()

        if dado < 0.35:
            i = rng.randrange(n)
            j = rng.randrange(n)

            if i == j:
                return None

            ruta.secuencia[i], ruta.secuencia[j] = (
                ruta.secuencia[j], ruta.secuencia[i]
            )

            tipo = ('intercambio', i, j)

        elif dado < 0.75:
            i = rng.randrange(n)
            destino = rng.randrange(n)

            if i == destino:
                return None

            ruta.secuencia.insert(
                destino, ruta.secuencia.pop(i)
            )

            tipo = ('reubicar', i, destino)

        else:
            largo = 2 if (n < 3 or rng.random() < 0.6) else 3

            if n <= largo:
                return None

            i = rng.randrange(n - largo + 1)

            segmento = ruta.secuencia[i:i + largo]
            resto = ruta.secuencia[:i] + ruta.secuencia[i + largo:]

            destino = rng.randrange(len(resto) + 1)

            ruta.secuencia = resto[:destino] + segmento + resto[destino:]

            tipo = ('segmento', i, largo, destino)

        ruta.recalcular_carga()

        return ('reoptimizar', (tipo, anterior))

    def _evaluar_todas(self, rutas):
        for r in rutas:
            self.evaluar_ruta(r)

    def _clonar(self, ruta):
        nueva = Ruta(ruta.vehiculo, ruta.conductor)
        nueva.secuencia = list(ruta.secuencia)
        nueva.distancia_km = ruta.distancia_km
        nueva.minutos = ruta.minutos
        nueva.minutos_conduccion = ruta.minutos_conduccion
        nueva.minutos_espera = ruta.minutos_espera
        nueva.minutos_servicio = ruta.minutos_servicio
        nueva.costo_total = ruta.costo_total
        nueva.co2_kg = ruta.co2_kg
        nueva.penalizacion = ruta.penalizacion
        nueva.requiere_descanso = ruta.requiere_descanso
        nueva.posiciones_descanso = list(ruta.posiciones_descanso)
        nueva.cumplimiento_pct = ruta.cumplimiento_pct
        nueva.puede_ordenar_por_ventana = ruta.puede_ordenar_por_ventana

        return nueva

    # ---- movimientos y reversión (simétricos) ----

    def _vecino(self, rutas, rng):
        """Aplica un movimiento y devuelve la descripción para poder deshacerlo."""
        candidatas = [r for r in rutas if r.secuencia]

        if not candidatas:
            return None

        # 50%: reordenar dentro de la misma ruta
        if rng.random() < 0.5:
            rutas_con_varios = [
                r for r in candidatas if len(r.secuencia) >= 2
            ]

            if rutas_con_varios:
                r = rng.choice(rutas_con_varios)
                i = rng.randrange(len(r.secuencia))
                j = rng.randrange(len(r.secuencia))

                if i != j:
                    r.secuencia[i], r.secuencia[j] = (
                        r.secuencia[j], r.secuencia[i]
                    )
                    r.vehiculo.reiniciar()
                    for c in r.secuencia:
                        r.vehiculo.agregar(c)
                    return ('intercambio', r, i, j)

            return None

        # 50%: mover un pedido de una ruta a otra
        origen = rng.choice(candidatas)

        if len(origen.secuencia) < 2:
            return None

        pos = rng.randrange(len(origen.secuencia))
        cliente = origen.secuencia[pos]

        destinos = [
            r for r in candidatas
            if r.vehiculo.cabe(cliente)
            and self._compatible(r, cliente)
            and len(r.secuencia) >= 1
            and (
                r.vehiculo is not origen.vehiculo
                or len(origen.secuencia) >= 2
            )
        ]

        if not destinos:
            return None

        destino = rng.choice(destinos)
        nueva_pos = rng.randrange(len(destino.secuencia) + 1)

        origen.secuencia.pop(pos)
        origen.vehiculo.quitar(cliente)

        destino.secuencia.insert(nueva_pos, cliente)
        destino.vehiculo.agregar(cliente)

        return ('mover', origen, destino, pos, nueva_pos, cliente)

    def _rehacer(self, rutas, movimiento):
        tipo = movimiento[0]

        # La reoptimización no necesita invertir el movimiento: el
        # estado anterior viene guardado en el propio movimiento. Por
        # eso solo se atiende aquí lo que devuelve la reoptimización,
        # para que el movimiento se pueda rechazar sin deducir nada.

        if tipo == 'reoptimizar':
            _, (cual, anterior) = movimiento

            ruta = rutas[0]
            ruta.secuencia = list(anterior)
            ruta.recalcular_carga()

            return

        if tipo == 'intercambio':
            _, r, i, j = movimiento
            r.secuencia[i], r.secuencia[j] = (
                r.secuencia[j], r.secuencia[i]
            )
            r.vehiculo.reiniciar()
            for c in r.secuencia:
                r.vehiculo.agregar(c)
            return

        if tipo == 'mover':
            _, origen, destino, pos, nueva_pos, cliente = movimiento
            destino.secuencia.remove(cliente)
            destino.vehiculo.quitar(cliente)
            origen.secuencia.insert(pos, cliente)
            origen.vehiculo.agregar(cliente)
            return

    def _deshacer(self, rutas, movimiento):
        self._rehacer(rutas, movimiento)

    # ---------------- asignación de conductores ----------------

    def asignar_conductores(self, rutas):
        """Asigna conductores respetando jornada (RN-004) y licencia.

        El vehículo de cada ruta ya está elegido, así que aquí se
        exige que el conductor tenga una licencia vigente que
        habilite ese tipo de vehículo (app/core/licencias.py).
        """
        disponibles = list(self.conductores)
        asignados = []
        # Rutas que se quedaron sin conductor, con el motivo. Se
        # informa en la respuesta para que el operador sepa por qué
        # no se pudo completar la asignación.
        sin_conductor = []

        for ruta in sorted(
            rutas, key=lambda r: -r.minutos
        ):
            tipo = getattr(ruta.vehiculo, 'tipo_nombre', None)

            eleccion = None

            for cond in disponibles:
                horas = ruta.minutos / 60.0
                # RN-004: no superar la jornada disponible
                if horas > cond.horas_libres():
                    continue

                if cond.disponibilidad_fin <= cond.disponibilidad_inicio:
                    continue

                # Licencia habilitante para este tipo de vehículo
                if not LIC.habilita_alguno(
                    cond.categorias_licencia, tipo
                ):
                    continue

                eleccion = cond
                break

            # Nadie con licencia habilitante queda libre: antes se
            # recurría a cualquiera, aunque no pudiera manejar ese
            # vehículo. Ahora se prefiere uno que sí pueda y sólo se
            # cae al resto si no queda nadie.
            if eleccion is None and disponibles:
                for cond in sorted(
                    disponibles,
                    key=lambda c: -c.horas_libres(),
                ):
                    if cond.disponibilidad_fin > cond.disponibilidad_inicio:
                        eleccion = cond
                        break

            if eleccion is not None:
                ruta.conductor = eleccion
                disponibles.remove(eleccion)
                asignados.append(eleccion)
            else:
                sin_conductor.append({
                    'placa': getattr(ruta.vehiculo, 'placa', None),
                    'tipo_vehiculo': tipo,
                    'motivo': 'No hay conductores disponibles',
                })

        self.sin_conductor = sin_conductor

        return rutas