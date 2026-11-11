import { roadDistanceKm } from './calculations.js'

const OSRM_BASE = 'https://router.project-osrm.org'
const MAX_COORDINATES_PER_BATCH = 80
const REQUEST_TIMEOUT_MS = 25_000
const round5 = (value) => Number(Number(value).toFixed(5))
const cacheKey = (coordinates) => JSON.stringify(
  coordinates.map(([lat, lon]) => [round5(lat), round5(lon)])
)

export function createRoadsService({
  fetchImpl = globalThis.fetch,
  baseUrl = OSRM_BASE,
  timeoutMs = REQUEST_TIMEOUT_MS,
  maxCoordinates = MAX_COORDINATES_PER_BATCH,
  fallbackDistance = roadDistanceKm,
} = {}) {
  const matrices = new Map()
  const segments = new Map()
  let consecutiveFailures = 0
  let available = true

  function noteFailure() {
    consecutiveFailures += 1
    if (consecutiveFailures >= 3) available = false
  }

  function noteSuccess() {
    consecutiveFailures = 0
    available = true
  }

  async function request(path) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      headers: { 'User-Agent': 'EcoLogisticaLima/1.0' },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) {
      throw new Error(`OSRM respondió HTTP ${response.status}`)
    }
    return response.json()
  }

  async function requestMatrixBlock(coordinates) {
    const path = coordinates
      .map(([lat, lon]) => `${Number(lon)},${Number(lat)}`)
      .join(';')
    const result = await request(
      `/table/v1/driving/${path}?annotations=distance,duration`
    )
    const size = coordinates.length
    const km = Array.from({ length: size }, () => Array(size).fill(0))
    const minutes = Array.from({ length: size }, () => Array(size).fill(0))

    for (let i = 0; i < size; i += 1) {
      for (let j = 0; j < size; j += 1) {
        const meters = result.distances?.[i]?.[j]
        const seconds = result.durations?.[i]?.[j]
        if (meters == null) continue
        km[i][j] = meters / 1000
        minutes[i][j] = (seconds ?? 0) / 60
      }
    }
    return { km, minutes }
  }

  async function matrix(coordinatesInput) {
    const coordinates = [...coordinatesInput]
    const size = coordinates.length
    if (size < 2) return { km: null, minutes: null }

    const key = cacheKey(coordinates)
    if (matrices.has(key)) return matrices.get(key)
    if (!available) return { km: null, minutes: null }

    const km = Array.from({ length: size }, () => Array(size).fill(0))
    const minutes = Array.from({ length: size }, () => Array(size).fill(0))
    try {
      for (let start = 0; start < size; start += maxCoordinates) {
        const batch = coordinates.slice(start, start + maxCoordinates)
        const result = await requestMatrixBlock(batch)
        for (let i = 0; i < batch.length; i += 1) {
          for (let j = 0; j < batch.length; j += 1) {
            km[start + i][start + j] = result.km[i][j]
            minutes[start + i][start + j] = result.minutes[i][j]
          }
        }
      }
      noteSuccess()
    } catch (error) {
      noteFailure()
      console.error('[roads] OSRM matrix request failed:', error.message)
      return { km: null, minutes: null }
    }

    for (let i = 0; i < size; i += 1) {
      for (let j = 0; j < size; j += 1) {
        if (i !== j && km[i][j] <= 0) {
          km[i][j] = fallbackDistance(
            coordinates[i][0], coordinates[i][1],
            coordinates[j][0], coordinates[j][1]
          )
        }
      }
    }
    const result = { km, minutes }
    matrices.set(key, result)
    return result
  }

  async function segment(lat1, lon1, lat2, lon2) {
    const key = JSON.stringify([lat1, lon1, lat2, lon2].map(round5))
    if (segments.has(key)) return segments.get(key)
    if (!available) return null

    try {
      const result = await request(
        `/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`
      )
      const coordinates = result.routes?.[0]?.geometry?.coordinates
      if (!coordinates) return null
      const points = coordinates
        .filter((coordinate) => coordinate.length >= 2)
        .map(([lon, lat]) => [lat, lon])
      noteSuccess()
      segments.set(key, points)
      return points
    } catch (error) {
      noteFailure()
      console.error('[roads] OSRM geometry request failed:', error.message)
      return null
    }
  }

  async function routeTrace(stops) {
    const coordinates = stops.map((stop) => [
      Number(stop.latitud), Number(stop.longitud),
    ])
    if (coordinates.length < 2) return coordinates
    const complete = []

    for (let i = 0; i < coordinates.length - 1; i += 1) {
      const [lat1, lon1] = coordinates[i]
      const [lat2, lon2] = coordinates[i + 1]
      const points = await segment(lat1, lon1, lat2, lon2)
      if (points?.length) {
        complete.push(...(complete.length ? points.slice(1) : points))
      } else {
        if (!complete.length) complete.push([lat1, lon1])
        complete.push([lat2, lon2])
      }
    }
    const final = coordinates.at(-1)
    const last = complete.at(-1)
    if (complete.length && (last[0] !== final[0] || last[1] !== final[1])) {
      complete.push(final)
    }
    return complete
  }

  async function distanceKm(lat1, lon1, lat2, lon2) {
    const result = await matrix([[lat1, lon1], [lat2, lon2]])
    return result.km?.[0]?.[1] > 0
      ? result.km[0][1]
      : fallbackDistance(lat1, lon1, lat2, lon2)
  }

  return {
    matrix,
    segment,
    routeTrace,
    distanceKm,
    isAvailable: () => available,
    stats: () => ({
      disponible: available,
      fallos_consecutivos: consecutiveFailures,
      matrices_en_cache: matrices.size,
      tramos_en_cache: segments.size,
    }),
    clearCache: () => {
      matrices.clear()
      segments.clear()
    },
  }
}
