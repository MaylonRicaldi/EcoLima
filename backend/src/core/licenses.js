const classes = Object.freeze({
  'A-I': 'A',
  'A-IIA': 'A',
  'A-IIB': 'A',
  'A-IIIA': 'A',
  'A-IIIB': 'A',
  'A-IIIC': 'A',
  'B-I': 'B',
  'B-IIA': 'B',
  'B-IIB': 'B',
  'B-IIC': 'B',
})

const rank = Object.freeze({
  'A-I': 1,
  'A-IIA': 2,
  'A-IIB': 3,
  'A-IIIA': 4,
  'A-IIIB': 5,
  'A-IIIC': 6,
  'B-I': 1,
  'B-IIA': 2,
  'B-IIB': 3,
  'B-IIC': 4,
})

const descriptions = Object.freeze({
  'A-I': 'A-I · autos particulares',
  'A-IIA': 'A-IIa · autos y transporte público de pasajeros',
  'A-IIB': 'A-IIb · combis, microbuses y camiones pequeños',
  'A-IIIA': 'A-IIIa · buses interprovinciales y articulados',
  'A-IIIB': 'A-IIIb · carga pesada, trailers y plataformas',
  'A-IIIC': 'A-IIIc · máxima categoría de la clase A',
  'B-I': 'B-I · vehículos no motorizados o baja cilindrada',
  'B-IIA': 'B-IIa · bicimotos y motos de reparto adaptadas',
  'B-IIB': 'B-IIb · motos lineales de dos ruedas (delivery)',
  'B-IIC': 'B-IIc · mototaxis y trimotos de tres ruedas',
})

const requiredClass = Object.freeze({
  MOTO: 'B',
  CAMIONETA: 'A',
  FURGON: 'A',
})

const minimumCategory = Object.freeze({
  MOTO: 'B-IIB',
  CAMIONETA: 'A-I',
  FURGON: 'A-I',
})

const normalizeType = (type) => type == null ? null : String(type).trim().toUpperCase()

export function isValidCategory(category) {
  return Object.hasOwn(classes, category)
}

export function officialName(category) {
  return (descriptions[category] ?? category).split('·')[0].trim()
}

export function classOf(category) {
  return classes[category] ?? null
}

export function enablesCategory(vehicleType, category) {
  const type = normalizeType(vehicleType)
  if (!type || !isValidCategory(category)) return false
  const required = requiredClass[type]
  return Boolean(required)
    && classes[category] === required
    && rank[category] >= rank[minimumCategory[type]]
}

export function enablesAny(categories, vehicleType) {
  return (categories ?? []).some((category) => enablesCategory(vehicleType, category))
}

export function blockingReason(category, vehicleType) {
  const type = normalizeType(vehicleType)
  if (!isValidCategory(category)) return 'No tiene licencia registrada'
  if (!type) return 'El vehículo no tiene tipo asignado'
  if (!requiredClass[type]) {
    return `No hay requisito de licencia definido para el tipo de vehículo ${type}`
  }
  if (enablesCategory(type, category)) return ''

  const minimum = minimumCategory[type]
  if (classes[category] !== requiredClass[type]) {
    const vehicleClass = classes[category] === 'A' ? 'autos y camiones' : 'motos y mototaxis'
    return `Una licencia ${officialName(category)} no sirve para un ${type}: los brevetes de esa clase habilitan para ${vehicleClass} y un ${type} necesita ${officialName(minimum)}`
  }
  if (rank[category] > rank[minimum]) {
    return `No habilita para manejar un ${type}: se necesita ${officialName(minimum)} o una categoría menor`
  }
  return `Necesita licencia ${officialName(minimum)} para manejar un ${type} y tiene ${officialName(category)}`
}

export function bestCategory(categories) {
  const valid = (categories ?? []).filter(isValidCategory)
  if (!valid.length) return null
  return valid.reduce((best, category) => rank[category] > rank[best] ? category : best)
}

export function bestCategoryFor(categories, vehicleType) {
  const type = normalizeType(vehicleType)
  if (!type || !requiredClass[type]) return bestCategory(categories)
  const valid = (categories ?? []).filter(
    (category) => isValidCategory(category) && classes[category] === requiredClass[type]
  )
  if (!valid.length) return null
  return valid.reduce((best, category) => rank[category] > rank[best] ? category : best)
}
