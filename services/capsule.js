const { getState, updateState } = require('./local-state')
const relationshipService = require('./relationship')
const { toDateKey } = require('../utils/time')

function canUseCloudCapsules() {
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
  return wx.cloud.callFunction({ name, data }).then((res) => (res && res.result) || {})
}

function getTodayKey(date = new Date()) {
  return toDateKey(date)
}

function getDefaultOpenDate(date = new Date()) {
  const nextWeek = new Date(date)
  nextWeek.setDate(nextWeek.getDate() + 7)
  return getTodayKey(nextWeek)
}

function normalizeCapsule(item = {}) {
  return {
    ...item,
    id: item.id || item.capsuleId || item._id
  }
}

function syncCloudCapsulesToLocal(items = []) {
  const normalized = items.map(normalizeCapsule)

  updateState('capsule', (data) => {
    data.capsules.splice(0, data.capsules.length, ...normalized)
  })

  return normalized
}

function getCapsuleData() {
  const capsuleData = getState('capsule')

  capsuleData.capsules.forEach(updateCapsuleStatus)

  return capsuleData
}

function getCapsuleDataAsync() {
  if (!canUseCloudCapsules()) {
    return Promise.resolve(getCapsuleData())
  }

  return callCloudFunction('getCapsules')
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_capsules_failed')
      }

      syncCloudCapsulesToLocal(result.capsules || [])
      return getCapsuleData()
    })
    .catch(() => getCapsuleData())
}

function createCapsule(payload) {
  const today = getTodayKey()
  const capsule = {
    id: `capsule-${Date.now()}`,
    title: payload.title,
    content: payload.content,
    createdAt: today,
    openAt: payload.openAt,
    type: payload.type,
    isOpened: false,
    status: getStatus(payload.openAt, false, today),
    ownerRole: 'me',
    visibility: 'couple'
  }

  const capsuleData = updateState('capsule', (data) => {
    data.capsules.unshift(capsule)
  })

  return {
    capsule,
    capsules: capsuleData.capsules
  }
}

function createCapsuleAsync(payload) {
  if (!canUseCloudCapsules()) {
    return Promise.resolve(createCapsule(payload))
  }

  return callCloudFunction('createCapsule', payload).then((result) => {
    if (result.success !== true || !result.capsule) {
      throw new Error(result.errorMessage || 'create_capsule_failed')
    }

    const capsule = normalizeCapsule(result.capsule)
    updateState('capsule', (data) => {
      data.capsules.unshift(capsule)
    })
    return {
      capsule,
      capsules: getCapsuleData().capsules
    }
  })
}

function openCapsule(id) {
  const capsuleData = updateState('capsule', (data) => {
    const capsule = data.capsules.find((item) => item.id === id)

    if (!capsule || capsule.status === 'locked') {
      return
    }

    capsule.isOpened = true
    capsule.status = 'opened'
  })

  return capsuleData.capsules.find((item) => item.id === id)
}

function openCapsuleAsync(id) {
  if (!canUseCloudCapsules()) {
    return Promise.resolve(openCapsule(id))
  }

  return callCloudFunction('openCapsule', { capsuleId: id }).then((result) => {
    if (result.success !== true || !result.capsule) {
      throw new Error(result.errorMessage || 'open_capsule_failed')
    }

    const capsule = normalizeCapsule(result.capsule)
    updateState('capsule', (data) => {
      const index = data.capsules.findIndex((item) => item.id === capsule.id)
      if (index >= 0) {
        data.capsules.splice(index, 1, capsule)
      }
    })
    return capsule
  })
}

function getStatus(openAt, isOpened, today = getTodayKey()) {
  if (isOpened) {
    return 'opened'
  }

  return openAt <= today ? 'available' : 'locked'
}

function updateCapsuleStatus(capsule) {
  capsule.status = getStatus(capsule.openAt, capsule.isOpened)
}

module.exports = {
  getCapsuleData,
  getCapsuleDataAsync,
  createCapsule,
  createCapsuleAsync,
  openCapsule,
  openCapsuleAsync,
  getStatus,
  getDefaultOpenDate
}
