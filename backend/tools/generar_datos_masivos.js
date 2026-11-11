import { Api, adminApi, createToolsPool, requireApply } from './shared.js'

const districts = [
  ['Miraflores', -12.1150, -77.0300], ['San Isidro', -12.0970, -77.0340],
  ['Lima Cercado', -12.0460, -77.0420], ['Surquillo', -12.1100, -77.0150],
  ['Barranco', -12.1460, -77.0200], ['La Molina', -12.0870, -76.9700],
  ['San Borja', -12.1060, -76.9940], ['Santiago de Surco', -12.1370, -76.9920],
  ['Jesús María', -12.0740, -77.0440], ['Pueblo Libre', -12.0720, -77.0620],
  ['Lince', -12.0880, -77.0540], ['Magdalena', -12.0930, -77.0690],
  ['San Miguel', -12.0760, -77.0820], ['Callao', -12.0480, -77.1150],
  ['Villa El Salvador', -12.1750, -76.9400], ['San Juan de Lurigancho', -11.9800, -77.0000],
  ['Los Olivos', -11.9600, -77.0700], ['Comas', -11.9450, -77.0600],
  ['Ate', -12.0400, -76.9200], ['La Victoria', -12.0600, -77.0100],
]
const streets = [
  'Av. Primavera', 'Av. Los Incas', 'Jr. Las Palmeras', 'Av. Metropolitana',
  'Av. Universitaria', 'Jr. Comercio', 'Av. El Sol', 'Pasaje Los Rosales',
  'Av. Circunvalación', 'Jr. Los Pinos',
]
const platePrefixes = ['ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQR', 'STU', 'VWX', 'ZSE', 'TGH', 'BNM', 'RCF']
const vehicleTemplates = [
  { id_tipo_vehiculo: 1, marca: 'Toyota', modelo: 'Hilux', anio_fabricacion: 2019, capacidad_kg: 1200, capacidad_m3: 5.5, consumo_km_l: 9.5, factor_co2_kg_km: 0.892, tipo_combustible: 'DIESEL', costo_adquisicion: 85000, valor_actual: 52000, depreciacion_anual: 17000, costo_soat_anual: 480, costo_seguro_anual: 1600, estado: 'ACTIVO' },
  { id_tipo_vehiculo: 2, marca: 'Mercedes', modelo: 'Sprinter', anio_fabricacion: 2021, capacidad_kg: 1800, capacidad_m3: 11, consumo_km_l: 11, factor_co2_kg_km: 1.05, tipo_combustible: 'DIESEL', costo_adquisicion: 145000, valor_actual: 110000, depreciacion_anual: 29000, costo_soat_anual: 520, costo_seguro_anual: 2200, estado: 'ACTIVO' },
  { id_tipo_vehiculo: 3, marca: 'Honda', modelo: 'XR150', anio_fabricacion: 2022, capacidad_kg: 30, capacidad_m3: 0.2, consumo_km_l: 35, factor_co2_kg_km: 0.22, tipo_combustible: 'GASOLINA', costo_adquisicion: 15000, valor_actual: 9000, depreciacion_anual: 3000, costo_soat_anual: 320, costo_seguro_anual: 600, estado: 'ACTIVO' },
  { id_tipo_vehiculo: 2, marca: 'Ford', modelo: 'Transit', anio_fabricacion: 2020, capacidad_kg: 1400, capacidad_m3: 9, consumo_km_l: 10.5, factor_co2_kg_km: 1.01, tipo_combustible: 'DIESEL', costo_adquisicion: 120000, valor_actual: 78000, depreciacion_anual: 21000, costo_soat_anual: 500, costo_seguro_anual: 1900, estado: 'ACTIVO' },
]
const priorities = ['ESTANDAR', 'ESTANDAR', 'ECONOMICO', 'EXPRESS']
const products = ['NO_PERECEDERO', 'NO_PERECEDERO', 'PERECEDERO', 'QUIMICO']
const windows = [['08:00', '12:00'], ['09:00', '13:00'], ['13:00', '17:00'], ['14:00', '18:00'], ['10:00', '16:00']]
const random = (seed) => () => {
  let state = seed += 0x6d2b79f5
  state = Math.imul(state ^ state >>> 15, state | 1)
  state ^= state + Math.imul(state ^ state >>> 7, state | 61)
  return ((state ^ state >>> 14) >>> 0) / 4294967296
}

const [clientsCount = '40', vehiclesCount = '10', ordersCount = '200'] = process.argv.slice(2).filter((value) => value !== '--apply')
if (await requireApply('generar datos masivos de demostración')) {
  const pool = createToolsPool()
  try {
    const api = await adminApi(pool)
    const [healthStatus, health] = await new Api().get('/health')
    if (healthStatus !== 200) throw new Error(`Backend no disponible: HTTP ${healthStatus}`)
    console.log('Backend en línea:', health)
    const rng = random(20261030)
    const [windowStatus, availableWindows] = await api.get('/clientes/ventanas-tiempo/disponibles')
    const windowIds = windowStatus === 200 && availableWindows?.length
      ? availableWindows.map((window) => window.id_ventana)
      : []
    if (!windowIds.length) throw new Error('No hay ventanas disponibles; no se generan pedidos.')

    const [, existingClients] = await api.get('/clientes')
    const knownNames = new Set((existingClients ?? []).map((client) => client.nombre))
    let createdClients = 0
    for (let i = 0; i < Number(clientsCount); i += 1) {
      const [district, lat, lon] = districts[i % districts.length]
      const number = knownNames.size + i + 1
      const name = `Cliente Demo ${String(number).padStart(3, '0')} - ${district}`
      if (knownNames.has(name)) continue
      const jitter = () => (rng() * 0.04) - 0.02
      const [status] = await api.post('/clientes', {
        nombre: name,
        email: `demo${String(number).padStart(3, '0')}@ecolima.pe`,
        direccion: `${streets[i % streets.length]} ${100 + i}, ${district}`,
        latitud: Number((lat + jitter()).toFixed(6)),
        longitud: Number((lon + jitter()).toFixed(6)),
        estado: 'ACTIVO',
      })
      if ([200, 201].includes(status)) {
        createdClients += 1
        knownNames.add(name)
      } else {
        console.log(`  cliente rechazado (${status}): ${name}`)
      }
    }

    const [, clientList] = await api.get('/clientes')
    const clientIds = (clientList ?? []).filter((client) => client.estado === 'ACTIVO').map((client) => client.id_cliente)
    if (!clientIds.length) throw new Error('No hay clientes activos.')
    let createdVehicles = 0
    const [, fleet] = await api.get('/vehiculos')
    const plates = new Set((fleet ?? []).map((vehicle) => vehicle.placa))
    for (let i = 0; i < Number(vehiclesCount); i += 1) {
      const plate = `${platePrefixes[i % platePrefixes.length]}-${300 + i * 10 + (i % 10)}`
      if (plates.has(plate)) continue
      const [status] = await api.post('/vehiculos', {
        ...vehicleTemplates[i % vehicleTemplates.length],
        placa: plate,
      })
      if ([200, 201].includes(status)) createdVehicles += 1
      else console.log(`  vehículo rechazado (${status}): ${plate}`)
    }

    let createdOrders = 0
    let rejectedOrders = 0
    for (let i = 0; i < Number(ordersCount); i += 1) {
      const [district, lat, lon] = districts[Math.floor(rng() * districts.length)]
      const number = (max) => Math.floor(rng() * max)
      const jitter = (radius) => (rng() * 2 - 1) * radius
      const [status, response] = await api.post('/pedidos', {
        id_cliente: clientIds[number(clientIds.length)],
        id_ventana_tiempo: windowIds[number(windowIds.length)],
        direccion_entrega: `${streets[number(streets.length)]} ${50 + number(9950)}, ${district}`,
        latitud: Number((lat + jitter(0.03)).toFixed(6)),
        longitud: Number((lon + jitter(0.03)).toFixed(6)),
        peso_kg: Number((5 + rng() * 40).toFixed(1)),
        volumen_m3: Number((0.1 + rng() * 1.1).toFixed(2)),
        prioridad: priorities[number(priorities.length)],
        tipo_producto: products[number(products.length)],
      })
      if ([200, 201].includes(status)) createdOrders += 1
      else {
        rejectedOrders += 1
        if (rejectedOrders <= 5) console.log(`  pedido rechazado (${status}): ${JSON.stringify(response).slice(0, 180)}`)
      }
    }
    console.log(`\nGenerados: clientes=${createdClients}, vehículos=${createdVehicles}, pedidos=${createdOrders}, rechazados=${rejectedOrders}`)
  } finally {
    await pool.end()
  }
}
