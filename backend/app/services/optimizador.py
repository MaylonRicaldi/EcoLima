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
"""
import math
import random

from app.core import parametros as P
from app.services import calculos as C

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
        'datos', 'carga_kg', 'carga_m3',
    )

    def __init__(self, fila):
        self.id_vehiculo = fila['id_vehiculo']
        self.placa = fila['placa']
        self.capacidad_kg = float(fila['capacidad_kg'])
        self.capacidad_m3 = float(fila['capacidad_m3'])
        self.consumo_km_l = float(fila['consumo_km_l'])
        self.factor_co2_kg_km = float(fila['factor_co2_kg_km'])
        self.tipo_combustible = fila['tipo_combustible']
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
    )

    def __init__(self, fila, base):
        self.id_conductor = fila['id_conductor']
        self.id_usuario = fila['id_usuario']
        self.nombre_completo = (
            f"{fila['nombre']} {fila['apellido']}".strip()
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
        if fila['ubicacion_inicio']:
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
    )

    def __init__(self, vehiculo, conductor):
        self.vehiculo = vehiculo
        self.conductor = conductor
        self.secuencia = []
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
        trafico=None, incidentes=None,
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

        n = len(self.clientes)
        self._dist = [[0.0] * n for _ in range(n)]

        for i in range(n):
            ci = self.clientes[i]
            for j in range(i + 1, n):
                cj = self.clientes[j]
                d = C.distancia_via_km(
                    ci.latitud, ci.longitud, cj.latitud, cj.longitud
                )
                self._dist[i][j] = d
                self._dist[j][i] = d

    # ---------------- utilidades ----------------

    def _factor_tramo(self, cliente, minuto_absoluto):
        """Factor de tiempo por tráfico y neblina."""
        hora = int(minuto_absoluto // 60)

        factor = C.factor_congestion(
            cliente.latitud, cliente.longitud, self.trafico
        )

        if C.es_franja_neblina(self.fecha, hora):
            factor *= 1 + P.PENALIZACION_NEBLINA

        return factor

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
        """Calcula distancia, tiempos, costo, CO2 y penalización."""
        self._evaluar_geomeria(ruta)

        if not ruta.secuencia:
            self._asignar_vacios(ruta)
            return self.costo_ruta(ruta)

        cond = ruta.conductor

        if cond is not None:
            lat_ori, lon_ori = cond.latitud, cond.longitud
            minuto = cond.disponibilidad_inicio
        else:
            lat_ori = self.base['latitud']
            lon_ori = self.base['longitud']
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
            tramo = C.distancia_via_km(
                lat_ori, lon_ori, c.latitud, c.longitud
            )
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

            lat_ori, lon_ori = c.latitud, c.longitud

        # Retorno al origen (RN-022)
        if ruta.secuencia:
            ultimo = ruta.secuencia[-1]
            tramo = C.distancia_via_km(
                ultimo.latitud, ultimo.longitud, lat_ori, lon_ori
            )
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
        ruta.secuencia.sort(key=lambda c: (
            c.ventana_inicio, -c.peso_prioridad, c.id_pedido
        ))

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
                    self._dist[
                        ruta.secuencia[pos - 1].indice
                    ][c.indice],
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
        """Asigna conductores respetando jornada y capacidad (RN-004)."""
        disponibles = list(self.conductores)
        asignados = []

        for ruta in sorted(
            rutas, key=lambda r: -r.minutos
        ):
            eleccion = None

            for cond in disponibles:
                horas = ruta.minutos / 60.0
                # RN-004: no superar la jornada disponible
                if horas > cond.horas_libres():
                    continue

                if cond.disponibilidad_fin <= cond.disponibilidad_inicio:
                    continue

                eleccion = cond
                break

            if eleccion is None and disponibles:
                # Sin conductor libre: se asigna el de más horas
                libres = max(
                    disponibles, key=lambda c: c.horas_libres()
                )
                eleccion = libres

            if eleccion is not None:
                ruta.conductor = eleccion
                disponibles.remove(eleccion)
                asignados.append(eleccion)

        return rutas