import { adminApi, createToolsPool, requireApply } from './shared.js'

const vehicles = [
  {
    id_tipo_vehiculo: 1, placa: 'ZSE-241', marca: 'Toyota', modelo: 'Hilux',
    anio_fabricacion: 2019, capacidad_kg: 1200, capacidad_m3: 5.5,
    consumo_km_l: 9.5, factor_co2_kg_km: 0.892, tipo_combustible: 'DIESEL',
    costo_adquisicion: 85000, valor_actual: 52000, depreciacion_anual: 17000,
    costo_soat_anual: 480, costo_seguro_anual: 1600, estado: 'ACTIVO',
  },
  {
    id_tipo_vehiculo: 2, placa: 'ABC-257', marca: 'Mercedes', modelo: 'Sprinter',
    anio_fabricacion: 2021, capacidad_kg: 1800, capacidad_m3: 11,
    consumo_km_l: 11, factor_co2_kg_km: 1.05, tipo_combustible: 'DIESEL',
    costo_adquisicion: 145000, valor_actual: 110000, depreciacion_anual: 29000,
    costo_soat_anual: 520, costo_seguro_anual: 2200, estado: 'ACTIVO',
  },
  {
    id_tipo_vehiculo: 3, placa: 'PQR-263', marca: 'Honda', modelo: 'XR150',
    anio_fabricacion: 2022, capacidad_kg: 30, capacidad_m3: 0.2,
    consumo_km_l: 35, factor_co2_kg_km: 0.22, tipo_combustible: 'GASOLINA',
    costo_adquisicion: 15000, valor_actual: 9000, depreciacion_anual: 3000,
    costo_soat_anual: 320, costo_seguro_anual: 600, estado: 'ACTIVO',
  },
]

if (await requireApply('crear flota de demostración')) {
  const pool = createToolsPool()
  try {
    const api = await adminApi(pool)
    const [status, current] = await api.get('/vehiculos')
    if (status !== 200 || !Array.isArray(current)) throw new Error(`GET /vehiculos devolvió ${status}`)
    const plates = new Set(current.map((vehicle) => vehicle.placa))
    for (const vehicle of vehicles) {
      if (plates.has(vehicle.placa)) {
        console.log(`  ya existe: ${vehicle.placa}`)
        continue
      }
      const [createdStatus, body] = await api.post('/vehiculos', vehicle)
      if (createdStatus === 201) console.log(`  creado: ${vehicle.placa} (${vehicle.marca} ${vehicle.modelo})`)
      else console.log(`  ERROR ${createdStatus}: ${vehicle.placa} -> ${JSON.stringify(body)}`)
    }
    const [, finalFleet] = await api.get('/vehiculos')
    console.log(`\n  total vehículos: ${(finalFleet ?? []).length}`)
    const digits = [...new Set((finalFleet ?? [])
      .filter((vehicle) => vehicle.estado === 'ACTIVO')
      .map((vehicle) => vehicle.placa.replace(/\D/g, '').at(-1)))].sort()
    console.log(`  dígitos finales activos: ${digits.join(', ')}`)
  } finally {
    await pool.end()
  }
}
