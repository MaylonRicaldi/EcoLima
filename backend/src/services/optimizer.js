import {
  calculateTco,
  drivingMinutes,
  haversineKm,
  isFogPeriod,
  referenceSpeed,
  roadDistanceKm,
  serviceMinutes,
  toHour,
  windowLatePenalty,
} from './calculations.js'
import { enablesAny } from '../core/licenses.js'
import { PARAMS } from '../core/parameters.js'

export const MTC_NO_CIRCULA = Object.freeze({
  1: new Set([0]),
  2: new Set([1]),
  3: new Set([2]),
  4: new Set([3]),
  5: new Set([4]),
  6: new Set([5]),
  7: new Set(),
})

const OBSTACLE_RADIUS_KM = 0.4
const round = (value) => Number(Number(value).toFixed(2))
const asNumber = (value, fallback = 0) => value == null ? fallback : Number(value)
const isoWeekday = (date) => {
  const dateText = date instanceof Date ? date.toISOString().slice(0, 10) : String(date).slice(0, 10)
  const day = new Date(`${dateText}T00:00:00Z`).getUTCDay()
  return day || 7
}
const minutesOf = (value, fallback) => {
  const time = toHour(value)
  return time ? time[0] * 60 + time[1] : fallback * 60
}

class SeededRandom {
  constructor(seed = 42) {
    this.state = (Number(seed) >>> 0) || 0x6d2b79f5
  }

  random() {
    let value = this.state += 0x6d2b79f5
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }

  randrange(end) {
    return Math.floor(this.random() * end)
  }

  choice(values) {
    return values[this.randrange(values.length)]
  }
}

export class Cliente {
  constructor(indice, fila) {
    this.indice = indice
    this.id_pedido = fila.id_pedido
    this.id_cliente = fila.id_cliente
    this.direccion = fila.direccion_entrega
    this.latitud = Number(fila.latitud)
    this.longitud = Number(fila.longitud)
    this.peso = Number(fila.peso_kg)
    this.volumen = Number(fila.volumen_m3)
    this.prioridad = fila.prioridad
    this.peso_prioridad = PARAMS.priorityWeight[fila.prioridad] ?? 1
    this.tipo_producto = fila.tipo_producto
    this.tolerancia = Number(fila.tolerancia_minutos ?? 0)
    this.penalizacion_minuto = Number(
      fila.penalizacion_por_minuto ?? PARAMS.penaltyPerMinute
    )
    const inicio = toHour(fila.hora_inicio)
    const fin = toHour(fila.hora_fin)
    const hInicio = Math.min(inicio?.[0] ?? PARAMS.operatingStartHour, PARAMS.operatingEndHour)
    const hFin = Math.max(fin?.[0] ?? PARAMS.operatingEndHour, hInicio)
    this.ventana_inicio = hInicio * 60
    this.ventana_fin = Math.min(hFin, PARAMS.operatingEndHour) * 60
    this.hora_llegada = null
    this.tiempo_espera = 0
    this.penalizacion = 0
  }

  es_perecedero() {
    return this.tipo_producto === 'PERECEDERO'
  }
}

export class Vehiculo {
  constructor(fila) {
    Object.assign(this, {
      id_vehiculo: fila.id_vehiculo,
      placa: fila.placa,
      capacidad_kg: Number(fila.capacidad_kg),
      capacidad_m3: Number(fila.capacidad_m3),
      consumo_km_l: Number(fila.consumo_km_l),
      factor_co2_kg_km: Number(fila.factor_co2_kg_km),
      tipo_combustible: fila.tipo_combustible,
      tipo_nombre: fila.tipo_nombre,
      datos: { ...fila },
      carga_kg: 0,
      carga_m3: 0,
    })
  }

  cabe(cliente) {
    return this.carga_kg + cliente.peso <= this.capacidad_kg
      && this.carga_m3 + cliente.volumen <= this.capacidad_m3
  }

  agregar(cliente) {
    this.carga_kg = Number((this.carga_kg + cliente.peso).toFixed(6))
    this.carga_m3 = Number((this.carga_m3 + cliente.volumen).toFixed(6))
  }

  quitar(cliente) {
    this.carga_kg = Number((this.carga_kg - cliente.peso).toFixed(6))
    this.carga_m3 = Number((this.carga_m3 - cliente.volumen).toFixed(6))
  }

  reiniciar() {
    this.carga_kg = 0
    this.carga_m3 = 0
  }

  ultimo_digito() {
    const digits = String(this.placa ?? '').replace(/\D/g, '')
    return digits ? Number(digits.at(-1)) : null
  }

  elegible_hoy(diaSemana) {
    const digit = this.ultimo_digito()
    return digit == null || !MTC_NO_CIRCULA[diaSemana]?.has(digit)
  }
}

export class Conductor {
  constructor(fila, base) {
    this.id_conductor = fila.id_conductor
    this.id_usuario = fila.id_usuario
    this.nombre_completo = `${fila.nombre} ${fila.apellido}`.trim()
    this.indice = -1
    this.sale_del_local = false
    this.categorias_licencia = [...(fila.categorias_licencia ?? [])]
    this.horas_max = Math.min(
      asNumber(fila.horas_max_conduccion, PARAMS.maxShiftHours) || PARAMS.maxShiftHours,
      PARAMS.maxShiftHours
    )
    this.horas_acumuladas = asNumber(fila.horas_conduccion_acumuladas)
    const inicio = toHour(fila.hora_disponibilidad_inicio)
    const fin = toHour(fila.hora_disponibilidad_fin)
    this.disponibilidad_inicio = Math.max(inicio?.[0] ?? PARAMS.operatingStartHour, PARAMS.operatingStartHour) * 60
    this.disponibilidad_fin = Math.min(fin?.[0] ?? PARAMS.operatingEndHour, PARAMS.operatingEndHour) * 60
    if (fila.latitud_inicio != null && fila.longitud_inicio != null) {
      this.latitud = Number(fila.latitud_inicio)
      this.longitud = Number(fila.longitud_inicio)
    } else if (fila.ubicacion_inicio?.coordinates) {
      this.longitud = Number(fila.ubicacion_inicio.coordinates[0])
      this.latitud = Number(fila.ubicacion_inicio.coordinates[1])
    } else if (fila.ubicacion_inicio?.x != null) {
      this.latitud = Number(fila.ubicacion_inicio.y)
      this.longitud = Number(fila.ubicacion_inicio.x)
    } else {
      this.latitud = Number(base.latitud)
      this.longitud = Number(base.longitud)
    }
  }

  horas_libres() {
    return Math.max(0, Math.min(this.horas_max, PARAMS.maxShiftHours) - this.horas_acumuladas)
  }
}

export class Ruta {
  constructor(vehiculo, conductor) {
    this.vehiculo = vehiculo
    this.conductor = conductor
    this.secuencia = []
    this.puede_ordenar_por_ventana = true
    this.distancia_km = 0
    this.minutos = 0
    this.minutos_conduccion = 0
    this.minutos_espera = 0
    this.minutos_servicio = 0
    this.costo_total = 0
    this.co2_kg = 0
    this.penalizacion = 0
    this.requiere_descanso = false
    this.posiciones_descanso = []
    this.cumplimiento_pct = null
  }

  recalcular_carga() {
    this.vehiculo.reiniciar()
    for (const cliente of this.secuencia) this.vehiculo.agregar(cliente)
  }
}

export class ProblemaVRPTW {
  constructor(pedidos, vehiculos, conductores, base, fecha, {
    trafico = [],
    incidentes = [],
    obstaculos = [],
    primera_ruta = null,
    roads = null,
  } = {}) {
    this.base = base
    this.fecha = fecha
    this.dia_semana = isoWeekday(fecha)
    this.clientes = pedidos.map((pedido, index) => new Cliente(index, pedido))
    this.vehiculos = vehiculos.map((vehiculo) => new Vehiculo(vehiculo))
    this.conductores = conductores.map((conductor) => new Conductor(conductor, base))
    this.trafico = [...trafico]
    this.incidentes = [...incidentes]
    this.obstaculos = [...obstaculos]
    this.primera_ruta = primera_ruta == null ? null : new Set(primera_ruta)
    this.roads = roads
    this._puntos_a_esquivar = [
      ...this.obstaculos.filter((item) => !item.resuelto).map((item) => ({
        latitud: Number(item.latitud), longitud: Number(item.longitud), peso: 1,
        que: item.descripcion || 'obstáculo',
      })),
      ...this.incidentes.filter((item) => item.nivel === 'ALTO').map((item) => ({
        latitud: Number(item.latitud), longitud: Number(item.longitud), peso: 0.6,
        que: item.descripcion || 'incidente',
      })),
    ]
    this.conductores.forEach((driver, index) => { driver.indice = index })
    this.sin_conductor = []
    this._origenes = [[Number(base.latitud), Number(base.longitud)]]
    this._indice_origen_por_conductor = new Map()
    for (const driver of this.conductores) {
      const fromDepot = this.primera_ruta?.has(driver.id_conductor) ?? false
      driver.sale_del_local = fromDepot
      const index = fromDepot ? 0 : this._buscar_o_agregar_origen([driver.latitud, driver.longitud])
      this._indice_origen_por_conductor.set(driver.id_conductor, index)
    }
    this._coordenadas = [
      ...this._origenes,
      ...this.clientes.map((customer) => [customer.latitud, customer.longitud]),
    ]
    this._total = this._coordenadas.length
    this._usar_calles_reales = false
    this._minutos_reales = null
    this._dist = Array.from({ length: this._total }, () => Array(this._total).fill(0))
    for (let i = 0; i < this._total; i += 1) {
      for (let j = i + 1; j < this._total; j += 1) {
        const [lat1, lon1] = this._coordenadas[i]
        const [lat2, lon2] = this._coordenadas[j]
        this._dist[i][j] = this._dist[j][i] = roadDistanceKm(lat1, lon1, lat2, lon2)
      }
    }
  }

  async preparar_distancias() {
    if (!this.roads || this._coordenadas.length < 2) return
    const result = await this.roads.matrix(this._coordenadas)
    if (!result?.km) return
    this._dist = result.km
    this._minutos_reales = result.minutes
    this._usar_calles_reales = true
  }

  _buscar_o_agregar_origen(point) {
    const found = this._origenes.findIndex(([lat, lon]) => lat === point[0] && lon === point[1])
    if (found >= 0) return found
    this._origenes.push(point)
    return this._origenes.length - 1
  }

  _idx_origen(driver) {
    return driver ? this._indice_origen_por_conductor.get(driver.id_conductor) ?? 0 : 0
  }

  _idx_retorno(driver, minute) {
    if (!driver || minute >= PARAMS.returnToDepotHour * 60) return 0
    return this._idx_origen(driver)
  }

  _idx_parada(customer) {
    return this._origenes.length + customer.indice
  }

  _distancia(from, to) {
    return this._dist[from]?.[to] ?? 0
  }

  _factor_tramo(customer, minute) {
    const hour = Math.floor(minute / 60)
    let factor = 1
    let greatest = 0
    const level = { VERDE: 0, AMARILLO: 1, ROJO: 2 }
    for (const report of this.trafico) {
      if (haversineKm(customer.latitud, customer.longitud, Number(report.latitud), Number(report.longitud)) > PARAMS.trafficInfluenceRadiusKm) continue
      const current = level[report.nivel_congestion] ?? 0
      if (current > greatest) {
        greatest = current
        factor = PARAMS.congestionFactor[report.nivel_congestion] ?? 1
      }
    }
    if (isFogPeriod(this.fecha, hour)) factor *= 1 + PARAMS.fogPenalty
    return factor * this._factor_obstaculo(customer.latitud, customer.longitud)
  }

  _factor_obstaculo(latitud, longitud) {
    let worst = 1
    for (const point of this._puntos_a_esquivar) {
      const distance = haversineKm(latitud, longitud, point.latitud, point.longitud)
      if (distance > OBSTACLE_RADIUS_KM) continue
      const proximity = 1 - distance / OBSTACLE_RADIUS_KM
      worst = Math.max(worst, 1 + point.peso * (1 + 3 * proximity))
    }
    return worst
  }

  _compatible(route, customer) {
    const incompatible = { PERECEDERO: ['QUIMICO'], QUIMICO: ['PERECEDERO'] }[customer.tipo_producto] ?? []
    return route.secuencia.every((existing) => !incompatible.includes(existing.tipo_producto))
  }

  evaluar_ruta(route, guardar_horas = false) {
    if (route.puede_ordenar_por_ventana) {
      route.secuencia.sort((a, b) => a.ventana_inicio - b.ventana_inicio
        || b.peso_prioridad - a.peso_prioridad
        || Number(a.id_pedido) - Number(b.id_pedido))
      route.puede_ordenar_por_ventana = false
    }
    if (!route.secuencia.length) {
      this._asignar_vacios(route)
      return 0
    }
    const driver = route.conductor
    let origin = this._idx_origen(driver)
    let minute = driver ? driver.disponibilidad_inicio : PARAMS.operatingStartHour * 60
    let distance = 0
    let driving = 0
    let waiting = 0
    let service = 0
    let penalty = 0
    let continuous = 0
    const restPositions = []
    const arrivalServiceEnds = []

    for (const customer of route.secuencia) {
      const destination = this._idx_parada(customer)
      const leg = this._distancia(origin, destination)
      distance += leg
      const travel = drivingMinutes(leg, referenceSpeed(Math.floor(minute / 60)), this._factor_tramo(customer, minute))
      driving += travel
      continuous += travel
      minute += travel
      if (continuous >= PARAMS.maxContinuousHours * 60) {
        restPositions.push(arrivalServiceEnds.length)
        minute += PARAMS.mandatoryBreakHours * 60
        continuous = 0
      }
      if (minute < customer.ventana_inicio) {
        customer.tiempo_espera = customer.ventana_inicio - minute
        waiting += customer.tiempo_espera
        minute = customer.ventana_inicio
      } else {
        customer.tiempo_espera = 0
      }
      const limit = customer.ventana_fin + customer.tolerancia
      customer.penalizacion = minute > limit
        ? windowLatePenalty(minute - limit, customer.penalizacion_minuto)
        : 0
      penalty += customer.penalizacion
      service += serviceMinutes()
      continuous += serviceMinutes()
      minute += serviceMinutes()
      arrivalServiceEnds.push(minute)
      origin = destination
    }

    const last = route.secuencia.at(-1)
    const returnIndex = this._idx_retorno(driver, minute + waiting + service)
    const returnDistance = this._distancia(origin, returnIndex)
    distance += returnDistance
    const returnTravel = drivingMinutes(returnDistance, referenceSpeed(Math.floor(minute / 60)), this._factor_tramo(last, minute))
    driving += returnTravel
    minute += returnTravel

    route.distancia_km = round(distance)
    route.minutos_conduccion = round(driving)
    route.minutos_espera = round(waiting)
    route.minutos_servicio = round(service)
    route.minutos = round(driving + waiting + service)
    route.penalizacion = round(penalty)
    route.requiere_descanso = restPositions.length > 0
    route.posiciones_descanso = restPositions
    const tco = calculateTco(route.distancia_km, route.vehiculo.datos)
    route.costo_total = tco.costo_total
    route.co2_kg = tco.co2_kg
    route.recalcular_carga()
    route.cumplimiento_pct = round(100 * route.secuencia.filter((customer) => customer.penalizacion === 0).length / route.secuencia.length)
    if (guardar_horas) route.secuencia.forEach((customer, i) => { customer.hora_llegada = arrivalServiceEnds[i] })
    return this.costo_ruta(route)
  }

  _asignar_vacios(route) {
    Object.assign(route, {
      distancia_km: 0, minutos: 0, minutos_conduccion: 0, minutos_espera: 0,
      minutos_servicio: 0, costo_total: 0, co2_kg: 0, penalizacion: 0,
      requiere_descanso: false, posiciones_descanso: [], cumplimiento_pct: null,
    })
    route.recalcular_carga()
  }

  costo_ruta(route) {
    if (!route.secuencia.length) return 0
    const priority = route.secuencia.reduce((sum, item) => sum + item.peso_prioridad, 0)
    let objective = (route.distancia_km + route.minutos * 0.35 + route.costo_total * 0.1
      + route.co2_kg * 0.2 + route.penalizacion * 2) / Math.max(1, priority)
    if (route.conductor) {
      const hours = route.minutos / 60
      if (hours > route.conductor.horas_libres()) objective += (hours - route.conductor.horas_libres()) * 200
    }
    let elapsed = 0
    route.secuencia.forEach((customer, index) => {
      if (index === 0) elapsed = customer.tiempo_espera
      else {
        const previous = route.secuencia[index - 1]
        elapsed += drivingMinutes(
          this._distancia(this._idx_parada(previous), this._idx_parada(customer)),
          referenceSpeed(8),
          1
        ) + serviceMinutes() + customer.tiempo_espera
      }
      if (customer.es_perecedero() && elapsed > PARAMS.maxPerishableHours * 60) objective += 400
    })
    return round(objective)
  }

  coste_total(routes) {
    return round(routes.reduce((sum, route) => sum + this.costo_ruta(route), 0))
  }

  solucion_inicial() {
    const vehicles = this.vehiculos.filter((vehicle) => vehicle.elegible_hoy(this.dia_semana))
    const routes = []
    for (const customer of this.clientes) {
      const candidates = routes.filter((route) => route.vehiculo.cabe(customer) && this._compatible(route, customer))
      if (candidates.length) {
        const best = candidates.reduce((a, b) => a.vehiculo.carga_kg <= b.vehiculo.carga_kg ? a : b)
        best.secuencia.push(customer)
        best.vehiculo.agregar(customer)
        continue
      }
      const inUse = new Set(routes.map((route) => route.vehiculo.id_vehiculo))
      const free = vehicles.filter((vehicle) => !inUse.has(vehicle.id_vehiculo) && vehicle.cabe(customer))
      if (!free.length) continue
      const vehicle = free.reduce((a, b) => a.carga_kg / a.capacidad_kg <= b.carga_kg / b.capacidad_kg ? a : b)
      const route = new Ruta(vehicle, null)
      route.secuencia.push(customer)
      vehicle.agregar(customer)
      routes.push(route)
    }
    for (const route of routes) this.evaluar_ruta(route)
    return routes.filter((route) => route.secuencia.length)
  }

  optimizar({ semilla = 42, iteraciones = 250, rng = new SeededRandom(semilla) } = {}) {
    const initial = this.solucion_inicial()
    if (!initial.length) return []
    let actual = initial.map((route) => this._clonar(route))
    let actualCost = this.coste_total(actual)
    let best = actual.map((route) => this._clonar(route))
    let bestCost = actualCost
    let temperature = 40
    const cooling = (0.5 / 40) ** (1 / Math.max(1, iteraciones))
    for (let i = 0; i < iteraciones; i += 1) {
      const move = this._vecino(actual, rng)
      if (!move) {
        temperature *= cooling
        continue
      }
      this._evaluar_todas(actual)
      const nextCost = this.coste_total(actual)
      if (nextCost < actualCost || rng.random() < Math.exp(-(nextCost - actualCost) / Math.max(0.01, temperature))) {
        actualCost = nextCost
      } else {
        this._rehacer(actual, move)
        this._evaluar_todas(actual)
        actualCost = this.coste_total(actual)
      }
      if (actualCost < bestCost) {
        bestCost = actualCost
        best = actual.map((route) => this._clonar(route))
      }
      temperature *= cooling
    }
    for (const route of best) this.evaluar_ruta(route)
    return best
  }

  fijar_secuencia(vehicle, driver, order) {
    const byId = new Map(this.clientes.map((customer) => [String(customer.id_pedido), customer]))
    const sequence = order.map((id) => byId.get(String(id)))
    const missing = order.findIndex((_id, index) => !sequence[index])
    if (missing >= 0) return [null, `El pedido ${order[missing]} ya no está disponible para planificar`]
    if (!sequence.length) return [null, 'La ruta no tiene pedidos que reoptimizar']
    if (new Set(sequence.map((customer) => String(customer.id_pedido))).size !== sequence.length) return [null, 'La ruta tiene pedidos repetidos']
    const kg = sequence.reduce((sum, customer) => sum + customer.peso, 0)
    const m3 = sequence.reduce((sum, customer) => sum + customer.volumen, 0)
    if (kg > vehicle.capacidad_kg) return [null, `Los pedidos suman ${kg.toFixed(0)} kg y el vehículo ${vehicle.placa} solo admite ${vehicle.capacidad_kg.toFixed(0)} kg`]
    if (m3 > vehicle.capacidad_m3) return [null, `Los pedidos suman ${m3.toFixed(1)} m³ y el vehículo ${vehicle.placa} solo admite ${vehicle.capacidad_m3.toFixed(1)} m³`]
    const route = new Ruta(vehicle, driver)
    route.secuencia = sequence
    route.puede_ordenar_por_ventana = false
    route.recalcular_carga()
    this.evaluar_ruta(route)
    return [route, null]
  }

  reoptimizar_secuencia(vehicle, driver, order, { semilla = 42, iteraciones = 250, rng = new SeededRandom(semilla) } = {}) {
    const [initial, error] = this.fijar_secuencia(vehicle, driver, order)
    if (error) return [null, error]
    if (initial.secuencia.length < 2) return [initial, null]
    let current = this._clonar(initial)
    let currentCost = this.evaluar_ruta(current)
    let best = this._clonar(current)
    let bestCost = currentCost
    let temperature = 40
    const cooling = (0.5 / 40) ** (1 / Math.max(1, iteraciones))
    for (let i = 0; i < iteraciones; i += 1) {
      const move = this._vecino_interno(current, rng)
      if (!move) {
        temperature *= cooling
        continue
      }
      const previous = move[1][1]
      const nextCost = this.evaluar_ruta(current)
      if (nextCost < currentCost || rng.random() < Math.exp(-(nextCost - currentCost) / Math.max(0.01, temperature))) {
        currentCost = nextCost
      } else {
        current.secuencia = previous
        current.recalcular_carga()
        currentCost = this.evaluar_ruta(current)
      }
      if (currentCost < bestCost) {
        bestCost = currentCost
        best = this._clonar(current)
      }
      temperature *= cooling
    }
    this.evaluar_ruta(best)
    return [best, null]
  }

  _vecino_interno(route, rng) {
    const length = route.secuencia.length
    if (length < 2) return null
    const previous = [...route.secuencia]
    const draw = rng.random()
    if (draw < 0.35) {
      const i = rng.randrange(length), j = rng.randrange(length)
      if (i === j) return null
      ;[route.secuencia[i], route.secuencia[j]] = [route.secuencia[j], route.secuencia[i]]
    } else if (draw < 0.75) {
      const i = rng.randrange(length), destination = rng.randrange(length)
      if (i === destination) return null
      route.secuencia.splice(destination, 0, route.secuencia.splice(i, 1)[0])
    } else {
      const size = length < 3 || rng.random() < 0.6 ? 2 : 3
      if (length <= size) return null
      const start = rng.randrange(length - size + 1)
      const segment = route.secuencia.splice(start, size)
      const destination = rng.randrange(route.secuencia.length + 1)
      route.secuencia.splice(destination, 0, ...segment)
    }
    route.recalcular_carga()
    return ['reoptimizar', [null, previous]]
  }

  _evaluar_todas(routes) {
    for (const route of routes) this.evaluar_ruta(route)
  }

  _clonar(route) {
    const copy = new Ruta(route.vehiculo, route.conductor)
    copy.secuencia = [...route.secuencia]
    for (const key of [
      'distancia_km', 'minutos', 'minutos_conduccion', 'minutos_espera',
      'minutos_servicio', 'costo_total', 'co2_kg', 'penalizacion',
      'requiere_descanso', 'cumplimiento_pct', 'puede_ordenar_por_ventana',
    ]) copy[key] = route[key]
    copy.posiciones_descanso = [...route.posiciones_descanso]
    return copy
  }

  _vecino(routes, rng) {
    const candidates = routes.filter((route) => route.secuencia.length)
    if (!candidates.length) return null
    if (rng.random() < 0.5) {
      const multi = candidates.filter((route) => route.secuencia.length >= 2)
      if (!multi.length) return null
      const route = rng.choice(multi)
      const i = rng.randrange(route.secuencia.length), j = rng.randrange(route.secuencia.length)
      if (i === j) return null
      ;[route.secuencia[i], route.secuencia[j]] = [route.secuencia[j], route.secuencia[i]]
      route.recalcular_carga()
      return ['intercambio', route, i, j, null, null]
    }
    const origin = rng.choice(candidates)
    if (origin.secuencia.length < 2) return null
    const position = rng.randrange(origin.secuencia.length)
    const customer = origin.secuencia[position]
    const destinations = candidates.filter((route) => route.vehiculo.cabe(customer)
      && this._compatible(route, customer) && route.secuencia.length >= 1)
    if (!destinations.length) return null
    const destination = rng.choice(destinations)
    const newPosition = rng.randrange(destination.secuencia.length + 1)
    origin.secuencia.splice(position, 1)
    origin.vehiculo.quitar(customer)
    destination.secuencia.splice(newPosition, 0, customer)
    destination.vehiculo.agregar(customer)
    return ['mover', origin, destination, position, newPosition, customer]
  }

  _rehacer(_routes, move) {
    if (move[0] === 'reoptimizar') {
      const route = _routes[0]
      route.secuencia = [...move[1][1]]
      route.recalcular_carga()
      return
    }
    if (move[0] === 'intercambio') {
      const [, route, i, j] = move
      ;[route.secuencia[i], route.secuencia[j]] = [route.secuencia[j], route.secuencia[i]]
      route.recalcular_carga()
      return
    }
    if (move[0] === 'mover') {
      const [, origin, destination, position, _newPosition, customer] = move
      const index = destination.secuencia.indexOf(customer)
      destination.secuencia.splice(index, 1)
      destination.vehiculo.quitar(customer)
      origin.secuencia.splice(position, 0, customer)
      origin.vehiculo.agregar(customer)
    }
  }

  asignar_conductores(routes) {
    const available = [...this.conductores]
    const without = []
    for (const route of [...routes].sort((a, b) => b.minutos - a.minutos)) {
      const type = route.vehiculo.tipo_nombre
      let selected = available.find((driver) =>
        route.minutos / 60 <= driver.horas_libres()
        && driver.disponibilidad_fin > driver.disponibilidad_inicio
        && enablesAny(driver.categorias_licencia, type)
      )
      if (!selected) {
        selected = [...available]
          .sort((a, b) => b.horas_libres() - a.horas_libres())
          .find((driver) => driver.disponibilidad_fin > driver.disponibilidad_inicio)
      }
      if (selected) {
        route.conductor = selected
        available.splice(available.indexOf(selected), 1)
      } else {
        without.push({
          placa: route.vehiculo.placa,
          tipo_vehiculo: type,
          motivo: 'No hay conductores disponibles',
        })
      }
    }
    this.sin_conductor = without
    return routes
  }
}

export { SeededRandom }
