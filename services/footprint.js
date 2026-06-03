const { getState, updateState } = require('./local-state')
const relationshipService = require('./relationship')
const { formatPostTime } = require('../utils/time')
const {
  getCityCount,
  buildMapMarkers,
  sortFootprintsByDateDesc,
  groupFootprintsByCity,
  searchCities,
  normalizeCity,
  resolveNearestCity
} = require('../utils/footprint')
const { createTempId } = require('../utils/id')

const DEFAULT_REGION = {
  latitude: 31.2304,
  longitude: 121.4737,
  scale: 4
}

function getSession() {
  return getState('session') || {}
}

function canUseCloudFootprints() {
  const session = getSession()
  const relationship = relationshipService.getRelationshipContext()

  return Boolean(
    typeof wx !== 'undefined'
    && wx.cloud
    && typeof wx.cloud.callFunction === 'function'
    && session.isCloudLoggedIn === true
    && relationship.isBound
    && relationship.coupleId
  )
}

function getPostsByCity(cityName = '') {
  if (!cityName) {
    return []
  }

  return (getState('posts') || [])
    .filter((post) => {
      const location = post.location || {}
      const city = normalizeCity(location.city, {
        latitude: location.latitude,
        longitude: location.longitude
      })

      return location.enabled === true && city.name === cityName
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((post) => {
      const location = post.location || {}
      const city = normalizeCity(location.city, {
        latitude: location.latitude,
        longitude: location.longitude
      })

      return {
        postId: post.postId,
        authorId: post.authorId,
        authorName: post.authorName || '',
        content: post.content || '',
        images: Array.isArray(post.images) ? post.images : [],
        createdAt: post.createdAt,
        displayTime: formatPostTime(post.createdAt),
        linkedFootprintId: post.linkedFootprintId || null,
        city: city.name,
        province: city.province,
        placeName: location.placeName || ''
      }
    })
}

function getPostsByCityFromList(posts = [], cityName = '') {
  if (!cityName) {
    return []
  }

  return posts
    .filter((post) => {
      const location = post.location || {}
      const city = normalizeCity(location.city, {
        latitude: location.latitude,
        longitude: location.longitude
      })

      return location.enabled === true && city.name === cityName
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((post) => {
      const location = post.location || {}
      const city = normalizeCity(location.city, {
        latitude: location.latitude,
        longitude: location.longitude
      })

      return {
        postId: post.postId,
        authorId: post.authorId,
        authorName: post.authorName || '',
        content: post.content || '',
        images: Array.isArray(post.images) ? post.images : [],
        createdAt: post.createdAt,
        displayTime: formatPostTime(post.createdAt),
        linkedFootprintId: post.linkedFootprintId || null,
        city: city.name,
        province: city.province,
        placeName: location.placeName || ''
      }
    })
}

function buildPageData(allFootprints = [], allPosts = [], activeCity = '') {
  const sortedFootprints = sortFootprintsByDateDesc(allFootprints || [])
  const { markers, markerCityMap } = buildMapMarkers(sortedFootprints)
  const cityCount = getCityCount(sortedFootprints)
  const footprintCount = sortedFootprints.length
  const grouped = groupFootprintsByCity(sortedFootprints)
  const filteredFootprints = activeCity ? (grouped[activeCity] || []) : sortedFootprints
  const relatedPosts = getPostsByCityFromList(allPosts, activeCity)
  const center = markers.length
    ? { latitude: markers[0].latitude, longitude: markers[0].longitude, scale: 4 }
    : DEFAULT_REGION

  return {
    allFootprints: sortedFootprints,
    footprints: filteredFootprints,
    cityCount,
    footprintCount,
    markers,
    markerCityMap,
    activeCity,
    listTitle: activeCity ? `${activeCity}的足迹` : '全部足迹',
    relatedPosts,
    relatedPostsTitle: activeCity ? `${activeCity}的朋友圈` : '',
    center
  }
}

function getFootprintPageData(activeCity = '') {
  return buildPageData(getState('footprints') || [], getState('posts') || [], activeCity)
}

function callCloudFunction(name, data = {}) {
  return wx.cloud.callFunction({
    name,
    data
  }).then((res) => (res && res.result) || {})
}

function syncCloudFootprintsToLocal(footprints = []) {
  updateState('footprints', (list) => {
    list.splice(0, list.length, ...footprints)
  })

  return footprints
}

function syncCloudPostsToLocal(posts = []) {
  updateState('posts', (list) => {
    list.splice(0, list.length, ...posts)
  })

  return posts
}

function getFootprintPageDataAsync(activeCity = '') {
  if (!canUseCloudFootprints()) {
    return Promise.resolve(getFootprintPageData(activeCity))
  }

  return callCloudFunction('getFootprintPageData')
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_footprint_page_data_failed')
      }

      syncCloudFootprintsToLocal(result.footprints || [])
      syncCloudPostsToLocal(result.posts || [])

      return buildPageData(result.footprints || [], result.posts || [], activeCity)
    })
    .catch(() => getFootprintPageData(activeCity))
}

function searchCitiesByKeyword(keyword) {
  return searchCities(keyword, getState('cities') || [])
}

function resolveCityFromCoordinates(location) {
  return resolveNearestCity(location, getState('cities') || [])
}

function createFootprint(payload) {
  const now = new Date().toISOString()
  const cityInfo = normalizeCity(payload.city, {
    code: payload.cityCode,
    name: payload.cityName,
    province: payload.province,
    country: payload.country,
    latitude: payload.latitude,
    longitude: payload.longitude,
    source: payload.citySource || payload.sourceType || 'manual'
  })
  const item = {
    footprintId: createTempId('fp'),
    sourceType: payload.sourceType || 'manual',
    sourceId: payload.sourceId || '',
    title: payload.title || '',
    city: cityInfo,
    placeName: payload.placeName || '',
    address: payload.address || '',
    date: payload.date || '',
    note: payload.note || '',
    images: payload.images || [],
    createdAt: now
  }

  updateState('footprints', (list) => {
    list.unshift(item)
  })

  return item
}

function createFootprintAsync(payload) {
  if (!canUseCloudFootprints()) {
    return Promise.resolve(createFootprint(payload))
  }

  return callCloudFunction('createFootprintManual', payload)
    .then((result) => {
      if (result.success !== true || !result.footprint) {
        throw new Error(result.errorMessage || 'create_footprint_manual_failed')
      }

      const footprint = result.footprint

      updateState('footprints', (list) => {
        list.unshift(footprint)
      })

      return footprint
    })
}

module.exports = {
  canUseCloudFootprints,
  getFootprintPageData,
  getFootprintPageDataAsync,
  searchCitiesByKeyword,
  resolveCityFromCoordinates,
  createFootprint,
  createFootprintAsync,
  DEFAULT_REGION
}
