const { createTempId } = require('./id')
const { toDateKey } = require('./time')

const OVERVIEW_MAP_SCALE = 4
const CITY_MAP_SCALE = 9
const FOOTPRINT_MAP_SCALE = 12

function normalizeCity(city, fallback = {}) {
  if (city && typeof city === 'object' && !Array.isArray(city)) {
    return {
      code: city.code || fallback.code || '',
      name: city.name || fallback.name || fallback.city || '',
      province: city.province || fallback.province || '',
      country: city.country || fallback.country || '中国',
      latitude: typeof city.latitude === 'number' ? city.latitude : fallback.latitude,
      longitude: typeof city.longitude === 'number' ? city.longitude : fallback.longitude,
      source: city.source || fallback.source || 'manual'
    }
  }

  return {
    code: fallback.code || '',
    name: city || fallback.name || fallback.city || '',
    province: fallback.province || '',
    country: fallback.country || '中国',
    latitude: fallback.latitude,
    longitude: fallback.longitude,
    source: fallback.source || 'manual'
  }
}

function decorateFootprint(item) {
  const cityInfo = normalizeCity(item.city, {
    latitude: item.latitude,
    longitude: item.longitude
  })

  return {
    ...item,
    cityInfo,
    city: cityInfo.name,
    latitude: typeof cityInfo.latitude === 'number' ? cityInfo.latitude : item.latitude,
    longitude: typeof cityInfo.longitude === 'number' ? cityInfo.longitude : item.longitude,
    province: cityInfo.province,
    country: cityInfo.country
  }
}

function sortFootprintsByDateDesc(list) {
  return [...list].map(decorateFootprint).sort((a, b) => {
    if (a.date !== b.date) {
      return a.date > b.date ? -1 : 1
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

function groupFootprintsByCity(footprints) {
  return footprints.reduce((acc, item) => {
    const decorated = decorateFootprint(item)

    if (!acc[decorated.city]) {
      acc[decorated.city] = []
    }

    acc[decorated.city].push(decorated)

    return acc
  }, {})
}

function getCityCount(footprints) {
  return Object.keys(groupFootprintsByCity(footprints)).length
}

function buildMapMarkers(footprints, activeCity = '') {
  const groups = groupFootprintsByCity(footprints)
  const cities = Object.keys(groups)
  const markerCityMap = {}

  const markers = cities.map((city, index) => {
    const cityFootprints = sortFootprintsByDateDesc(groups[city])
    const top = cityFootprints[0]
    const markerId = index + 1
    const isActive = city === activeCity

    markerCityMap[markerId] = city

    return {
      id: markerId,
      latitude: top.latitude,
      longitude: top.longitude,
      width: isActive ? 34 : 28,
      height: isActive ? 34 : 28,
      callout: {
        content: `${city} · ${cityFootprints.length} 条足迹`,
        display: 'BYCLICK',
        color: isActive ? '#c84f67' : '#6a4f58',
        bgColor: isActive ? '#ffe2e8' : '#fff0f3',
        borderRadius: 14,
        padding: 8,
        fontSize: 12
      }
    }
  })

  return {
    markers,
    markerCityMap
  }
}

function buildMapSelectionState(footprints, footprintId) {
  const decoratedFootprints = sortFootprintsByDateDesc(footprints || [])
  const selectedFootprint = decoratedFootprints.find((item) => item.footprintId === footprintId)

  if (!selectedFootprint) {
    return {
      activeCity: '',
      selectedFootprintId: '',
      center: null
    }
  }

  return {
    activeCity: selectedFootprint.city,
    selectedFootprintId: selectedFootprint.footprintId,
    center: {
      latitude: selectedFootprint.latitude,
      longitude: selectedFootprint.longitude,
      scale: FOOTPRINT_MAP_SCALE
    }
  }
}

function buildMapCityViewport(footprints, activeCity = '') {
  const decoratedFootprints = sortFootprintsByDateDesc(footprints || [])

  if (!activeCity) {
    const firstFootprint = decoratedFootprints[0]

    if (!firstFootprint) {
      return {
        latitude: 31.2304,
        longitude: 121.4737,
        scale: OVERVIEW_MAP_SCALE
      }
    }

    return {
      latitude: firstFootprint.latitude,
      longitude: firstFootprint.longitude,
      scale: OVERVIEW_MAP_SCALE
    }
  }

  const cityFootprint = decoratedFootprints.find((item) => item.city === activeCity)

  if (!cityFootprint) {
    return {
      latitude: 31.2304,
      longitude: 121.4737,
      scale: OVERVIEW_MAP_SCALE
    }
  }

  return {
    latitude: cityFootprint.latitude,
    longitude: cityFootprint.longitude,
    scale: CITY_MAP_SCALE
  }
}

function searchCityOrPlace(keyword, places) {
  const value = (keyword || '').trim().toLowerCase()

  if (!value) {
    return []
  }

  return places.filter((item) => {
    const city = (item.city || '').toLowerCase()
    const placeName = (item.placeName || '').toLowerCase()
    const address = (item.address || '').toLowerCase()

    return city.includes(value) || placeName.includes(value) || address.includes(value)
  })
}

function searchCities(keyword, cities) {
  const value = (keyword || '').trim().toLowerCase()

  if (!value) {
    return []
  }

  return cities.filter((item) => {
    const name = (item.name || '').toLowerCase()
    const province = (item.province || '').toLowerCase()
    const country = (item.country || '').toLowerCase()

    return name.includes(value) || province.includes(value) || country.includes(value)
  })
}

function toRadians(value) {
  return (value * Math.PI) / 180
}

function getDistanceInKm(from, to) {
  if (!from || !to) {
    return Infinity
  }

  const lat1 = typeof from.latitude === 'number' ? from.latitude : NaN
  const lng1 = typeof from.longitude === 'number' ? from.longitude : NaN
  const lat2 = typeof to.latitude === 'number' ? to.latitude : NaN
  const lng2 = typeof to.longitude === 'number' ? to.longitude : NaN

  if ([lat1, lng1, lat2, lng2].some(Number.isNaN)) {
    return Infinity
  }

  const earthRadiusKm = 6371
  const deltaLat = toRadians(lat2 - lat1)
  const deltaLng = toRadians(lng2 - lng1)
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2)
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
    * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function resolveNearestCity(location, cities) {
  if (!location || !Array.isArray(cities) || !cities.length) {
    return null
  }

  const normalizedLocation = {
    latitude: location.latitude,
    longitude: location.longitude
  }

  let nearestCity = null
  let nearestDistance = Infinity

  cities.forEach((item) => {
    const distance = getDistanceInKm(normalizedLocation, item)

    if (distance < nearestDistance) {
      nearestCity = item
      nearestDistance = distance
    }
  })

  if (!nearestCity) {
    return null
  }

  return {
    ...nearestCity,
    matchDistanceKm: Number(nearestDistance.toFixed(1))
  }
}

function createFootprintFromPost(post) {
  if (!post || !post.location || post.location.enabled !== true) {
    return null
  }

  if (post.shouldCreateFootprint !== true) {
    return null
  }

  const location = post.location || {}
  const cityInfo = normalizeCity(location.city, {
    latitude: location.latitude,
    longitude: location.longitude
  })

  if (!cityInfo.name || typeof cityInfo.latitude !== 'number' || typeof cityInfo.longitude !== 'number') {
    return null
  }

  const content = (post.content || '').trim()

  return {
    footprintId: createTempId('fp'),
    sourceType: 'post',
    sourceId: post.postId,
    title: content ? content.slice(0, 16) : '来自朋友圈的足迹',
    city: cityInfo,
    placeName: location.placeName,
    address: location.address || '',
    date: toDateKey(post.createdAt || new Date()),
    note: content,
    images: Array.isArray(post.images) ? post.images : [],
    createdAt: new Date().toISOString()
  }
}

module.exports = {
  getCityCount,
  buildMapMarkers,
  buildMapCityViewport,
  buildMapSelectionState,
  sortFootprintsByDateDesc,
  groupFootprintsByCity,
  searchCityOrPlace,
  searchCities,
  resolveNearestCity,
  createFootprintFromPost,
  normalizeCity,
  decorateFootprint
}
