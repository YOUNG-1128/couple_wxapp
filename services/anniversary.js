const { getState, updateState } = require('./local-state')
const relationshipService = require('./relationship')
const { createTempId } = require('../utils/id')
const {
  sortAnniversariesByUpcoming,
  getUpcomingWithinDays,
  decorateAnniversary
} = require('../utils/anniversary')

const ANNIVERSARY_TYPES = [
  '恋爱纪念日',
  '第一次见面',
  '第一次约会',
  '生日',
  '旅行',
  '节日',
  '自定义'
]

function getAnniversaryTypes() {
  return ANNIVERSARY_TYPES
}

function canUseCloudAnniversaries() {
  const session = getState('session') || {}
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

function callCloudFunction(name, data = {}) {
  return wx.cloud.callFunction({
    name,
    data
  }).then((res) => (res && res.result) || {})
}

function normalizeAnniversary(item = {}) {
  return {
    ...item,
    id: item.id || item.anniversaryId || item._id || createTempId('anniversary')
  }
}

function syncCloudAnniversariesToLocal(items = []) {
  const normalized = items.map(normalizeAnniversary)

  updateState('anniversaries', (list) => {
    list.splice(0, list.length, ...normalized)
  })

  return normalized
}

function getDecoratedList() {
  const raw = getState('anniversaries') || []
  const decorated = raw.map((item) => decorateAnniversary(item))

  return sortAnniversariesByUpcoming(decorated)
}

function getAnniversaryPageData() {
  const list = getDecoratedList()

  return {
    list,
    highlighted: list[0] || null,
    types: getAnniversaryTypes()
  }
}

function getAnniversaryPageDataAsync() {
  if (!canUseCloudAnniversaries()) {
    return Promise.resolve(getAnniversaryPageData())
  }

  return callCloudFunction('getAnniversaries')
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_anniversaries_failed')
      }

      syncCloudAnniversariesToLocal(result.anniversaries || [])
      return getAnniversaryPageData()
    })
    .catch(() => getAnniversaryPageData())
}

function getAnniversaryById(id) {
  const list = getDecoratedList()

  return list.find((item) => item.id === id) || null
}

function getAnniversaryByIdAsync(id) {
  return getAnniversaryPageDataAsync().then(() => getAnniversaryById(id))
}

function createAnniversary(payload) {
  const now = new Date().toISOString()
  const item = {
    id: createTempId('anniversary'),
    title: payload.title,
    date: payload.date,
    type: payload.type || '自定义',
    repeatType: payload.repeatType || 'none',
    note: payload.note || '',
    coverImage: payload.coverImage || '',
    createdAt: now,
    updatedAt: now
  }

  updateState('anniversaries', (list) => {
    list.unshift(item)
  })

  return item
}

function updateAnniversary(id, payload) {
  let updated = null

  updateState('anniversaries', (list) => {
    const target = list.find((item) => item.id === id)

    if (!target) {
      return
    }

    Object.assign(target, {
      title: payload.title,
      date: payload.date,
      type: payload.type || '自定义',
      repeatType: payload.repeatType || 'none',
      note: payload.note || '',
      coverImage: payload.coverImage || '',
      updatedAt: new Date().toISOString()
    })
    updated = target
  })

  return updated
}

function saveAnniversaryAsync(payload) {
  if (!canUseCloudAnniversaries()) {
    return Promise.resolve(payload.id ? updateAnniversary(payload.id, payload) : createAnniversary(payload))
  }

  return callCloudFunction('upsertAnniversary', {
    anniversaryId: payload.id || '',
    title: payload.title,
    date: payload.date,
    type: payload.type,
    repeatType: payload.repeatType,
    note: payload.note || '',
    coverImage: payload.coverImage || ''
  }).then((result) => {
    if (result.success !== true || !result.anniversary) {
      throw new Error(result.errorMessage || 'save_anniversary_failed')
    }

    const item = normalizeAnniversary(result.anniversary)
    updateState('anniversaries', (list) => {
      const index = list.findIndex((entry) => entry.id === item.id)

      if (index >= 0) {
        list.splice(index, 1, item)
        return
      }

      list.unshift(item)
    })
    return item
  })
}

function removeAnniversary(id) {
  updateState('anniversaries', (list) => {
    const index = list.findIndex((item) => item.id === id)

    if (index >= 0) {
      list.splice(index, 1)
    }
  })
}

function removeAnniversaryAsync(id) {
  if (!canUseCloudAnniversaries()) {
    removeAnniversary(id)
    return Promise.resolve(true)
  }

  return callCloudFunction('removeAnniversary', { anniversaryId: id })
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'remove_anniversary_failed')
      }

      removeAnniversary(id)
      return true
    })
}

function getUpcomingForHome(days = 30) {
  const list = getDecoratedList()

  return getUpcomingWithinDays(list, days).map((item) => ({
    id: item.id,
    title: item.title,
    date: item.nextDate,
    daysLeft: item.daysUntil,
    countdownText: item.countdownText
  }))
}

function getUpcomingForHomeAsync(days = 30) {
  return getAnniversaryPageDataAsync().then(() => getUpcomingForHome(days))
}

module.exports = {
  getAnniversaryPageData,
  getAnniversaryPageDataAsync,
  getAnniversaryById,
  getAnniversaryByIdAsync,
  createAnniversary,
  saveAnniversaryAsync,
  removeAnniversaryAsync,
  getUpcomingForHome,
  getUpcomingForHomeAsync,
  getAnniversaryTypes
}
