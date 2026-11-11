import { DEFAULT_DEPOT, PARAMS, fuelPrice } from '../core/parameters.js'

const EARTH_RADIUS_KM = 6371.0088
const round = (value, places = 2) => Number(Number(value).toFixed(places))

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => degrees * Math.PI / 180
  const firstLat = toRadians(Number(lat1))
  const secondLat = toRadians(Number(lat2))
  const deltaLat = secondLat - firstLat
  const deltaLon = toRadians(Number(lon2) - Number(lon1))
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(firstLat) * Math.cos(secondLat) * Math.sin(deltaLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

export function roadDistanceKm(lat1, lon1, lat2, lon2) {
  return haversineKm(lat1, lon1, lat2, lon2) * PARAMS.detourFactor
}

export function congestionFactor(latitude, longitude, reports = []) {
  let worst = 1
  let highestLevel = 0
  const levels = { VERDE: 0, AMARILLO: 1, ROJO: 2 }
  for (const report of reports ?? []) {
    const distance = haversineKm(
      latitude, longitude, Number(report.latitud), Number(report.longitud)
    )
    if (distance > PARAMS.trafficInfluenceRadiusKm) continue
    const level = levels[report.nivel_congestion] ?? 0
    if (level > highestLevel) {
      highestLevel = level
      worst = PARAMS.congestionFactor[report.nivel_congestion] ?? 1
    }
  }
  return worst
}

export function drivingMinutes(distanceKm, speedKmh, congestion = 1) {
  if (speedKmh <= 0) return 0
  return (distanceKm / speedKmh) * 60 * congestion
}

export function serviceMinutes() {
  return 10
}

export function windowLatePenalty(lateMinutes, costPerMinute = PARAMS.penaltyPerMinute) {
  return round(Math.max(0, lateMinutes) * costPerMinute)
}

export function calculateCo2(distanceKm, co2Factor) {
  return round(Number(distanceKm) * Number(co2Factor))
}

export function fuelCost(distanceKm, consumptionKmPerUnit, fuelType) {
  if (consumptionKmPerUnit <= 0 || fuelType === 'ELECTRICO') {
    return { cost: 0, consumed: 0 }
  }
  const unitsConsumed = distanceKm / consumptionKmPerUnit
  if (fuelType === 'GNV') {
    return { cost: round(unitsConsumed * fuelPrice(fuelType).price), consumed: round(unitsConsumed) }
  }
  const gallons = unitsConsumed / PARAMS.litersPerGallon
  return {
    cost: round(gallons * fuelPrice(fuelType).price),
    consumed: round(gallons),
  }
}

export function depreciationCost(vehicle) {
  const acquisition = Number(vehicle.costo_adquisicion ?? 0)
  if (acquisition <= 0) return 0
  return round(acquisition * PARAMS.annualDepreciationRate / PARAMS.operatingDaysPerMonth)
}

export function insuranceCost(vehicle) {
  return round(
    (Number(vehicle.costo_soat_anual ?? 0) + Number(vehicle.costo_seguro_anual ?? 0))
      / PARAMS.operatingDaysPerMonth
  )
}

export function driverCost() {
  return round(PARAMS.driverMonthlySalary / PARAMS.operatingDaysPerMonth)
}

export function calculateTco(distanceKm, vehicle) {
  const distance = Number(distanceKm)
  const fuel = fuelCost(
    distance,
    Number(vehicle.consumo_km_l),
    vehicle.tipo_combustible
  )
  const maintenance = round(distance * PARAMS.maintenancePerKm)
  const depreciation = depreciationCost(vehicle)
  const insurance = insuranceCost(vehicle)
  const driver = driverCost()
  return {
    combustible_litros: fuel.consumed,
    costo_combustible: fuel.cost,
    costo_mantenimiento: maintenance,
    costo_depreciacion: depreciation,
    costo_seguro: insurance,
    costo_conductor: driver,
    costo_total: round(fuel.cost + maintenance + depreciation + insurance + driver),
    co2_kg: calculateCo2(distance, Number(vehicle.factor_co2_kg_km)),
  }
}

export function equivalentTrees(co2Kg, kgPerTree = PARAMS.co2PerTreePerYearKg) {
  if (kgPerTree <= 0) return 0
  return round(co2Kg / kgPerTree)
}

export function toHour(value) {
  if (value == null) return null
  if (value instanceof Date) return [value.getHours(), value.getMinutes()]
  const parts = String(value).split(':')
  if (parts.length < 2) throw new TypeError(`Invalid time value: ${value}`)
  return [Number(parts[0]), Number(parts[1])]
}

export function minutesFromOperatingStart(hour, minute) {
  return hour * 60 + minute - PARAMS.operatingStartHour * 60
}

export function withinOperatingHours(hour, minute) {
  const minutes = hour * 60 + minute
  return minutes >= PARAMS.operatingStartHour * 60
    && minutes <= PARAMS.operatingEndHour * 60
}

export function isPeakHour(hour) {
  return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20)
}

export function referenceSpeed(hour) {
  return isPeakHour(hour) ? PARAMS.peakSpeedKmh : PARAMS.normalSpeedKmh
}

export function isFogPeriod(date, hour) {
  const month = date instanceof Date ? date.getMonth() + 1 : new Date(date).getMonth() + 1
  return PARAMS.fogMonths.includes(month)
    && hour >= PARAMS.fogStartHour
    && hour < PARAMS.fogEndHour
}

export function minutesFromMidnight(hour, minute) {
  return hour * 60 + minute
}

export function defaultDepot() {
  return { ...DEFAULT_DEPOT }
}
