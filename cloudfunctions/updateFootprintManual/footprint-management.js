function normalizeText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function normalizeFootprintId(event = {}) {
  const footprintId = normalizeText(event.footprintId, 100)

  if (!footprintId) {
    throw new Error('footprint_id_required')
  }

  return footprintId
}

function normalizeManualFootprintInput(event = {}) {
  const footprintId = normalizeFootprintId(event)
  const city = event.city && typeof event.city === 'object' ? event.city : {}
  const cityName = normalizeText(city.name, 40)

  if (!cityName) {
    throw new Error('city_required')
  }

  return {
    footprintId,
    title: normalizeText(event.title, 40),
    city: {
      code: normalizeText(city.code, 40),
      name: cityName,
      province: normalizeText(city.province, 40),
      country: normalizeText(city.country || '中国', 40),
      latitude: typeof city.latitude === 'number' ? city.latitude : null,
      longitude: typeof city.longitude === 'number' ? city.longitude : null,
      source: 'manual'
    },
    placeName: normalizeText(event.placeName, 40),
    address: normalizeText(event.address, 120),
    date: normalizeText(event.date, 10),
    note: normalizeText(event.note, 200),
    images: Array.isArray(event.images)
      ? event.images.filter((item) => typeof item === 'string' && item).slice(0, 4)
      : []
  }
}

module.exports = {
  normalizeFootprintId,
  normalizeManualFootprintInput
}
