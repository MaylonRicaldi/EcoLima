export const PARAMS = Object.freeze({
  fuelDieselPerGallon: 17.5,
  fuelGnvPerM3: 12.5,
  litersPerGallon: 3.785411784,
  maintenancePerKm: 1.2,
  annualDepreciationRate: 0.2,
  driverMonthlySalary: 1500,
  operatingDaysPerMonth: 30,
  penaltyPerMinute: 0.5,
  lateAlertThresholdMinutes: 30,
  priorityWeight: Object.freeze({ EXPRESS: 3, ESTANDAR: 1, ECONOMICO: 0.5 }),
  maxPerishableHours: 4,
  maxShiftHours: 8,
  maxContinuousHours: 4,
  mandatoryBreakHours: 1,
  operatingStartHour: 5,
  operatingEndHour: 22,
  returnToDepotHour: 21,
  fogMonths: Object.freeze([6, 7, 8, 9]),
  fogStartHour: 6,
  fogEndHour: 8,
  fogPenalty: 0.15,
  maxOrders: 150,
  maxVehicles: 15,
  maxOptimizationSeconds: 45,
  maxReoptimizationSeconds: 30,
  co2PerTreePerYearKg: 22,
  peakSpeedKmh: 25,
  normalSpeedKmh: 35,
  congestionFactor: Object.freeze({ VERDE: 1, AMARILLO: 1.35, ROJO: 1.8 }),
  detourFactor: 1.3,
  obstacleRadiusKm: 0.4,
  trafficInfluenceRadiusKm: 2,
  minimumFreeWindowMinutes: 30,
})

export function fuelPrice(type) {
  if (type === 'GNV') return { price: PARAMS.fuelGnvPerM3, unit: 'm3' }
  if (type === 'ELECTRICO') return { price: 0, unit: 'ninguno' }
  return { price: PARAMS.fuelDieselPerGallon, unit: 'galon' }
}

export const DEFAULT_DEPOT = Object.freeze({
  direccion: 'Puerto de Callao, Av. San Martín, Callao',
  latitud: -12.055,
  longitud: -77.143,
})
