const { getState, updateState } = require('./local-state')
const relationshipService = require('./relationship')
const { createTempId } = require('../utils/id')
const { toDateKey } = require('../utils/time')

function canUseCloudStatusRecords() {
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

function normalizeStatusRecord(item = {}) {
  return {
    ...item,
    id: item.id || item.statusRecordId || item._id || createTempId('status')
  }
}

function syncCloudStatusRecordsToLocal(items = []) {
  const normalized = items.map(normalizeStatusRecord)

  updateState('statusRecords', (records) => {
    records.splice(0, records.length, ...normalized)
  })

  return normalized
}

function getTodayStatusByUser(userId) {
  const today = toDateKey(new Date())

  return getState('statusRecords').find((item) => item.userId === userId && item.date === today) || null
}

function getTodayStatusMap() {
  const today = toDateKey(new Date())
  const records = getState('statusRecords').filter((item) => item.date === today)
  const map = {}

  records.forEach((item) => {
    map[item.userId] = item
  })

  return map
}

function getStatusRecords() {
  return getState('statusRecords') || []
}

function getStatusRecordsAsync() {
  if (!canUseCloudStatusRecords()) {
    return Promise.resolve(getStatusRecords())
  }

  return callCloudFunction('getStatusRecords')
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_status_records_failed')
      }

      return syncCloudStatusRecordsToLocal(result.statusRecords || [])
    })
    .catch(() => getStatusRecords())
}

function getTodayStatusMapAsync() {
  return getStatusRecordsAsync().then(() => getTodayStatusMap())
}

function upsertTodayStatus(payload) {
  const today = toDateKey(new Date())
  const now = new Date().toISOString()
  let result = null

  updateState('statusRecords', (records) => {
    result = records.find((item) => item.userId === payload.userId && item.date === today)

    if (result) {
      result.status = payload.status || payload.mood
      result.note = payload.note || ''
      result.updatedAt = now
      return
    }

    result = {
      id: createTempId('status'),
      userId: payload.userId,
      date: today,
      status: payload.status || payload.mood,
      note: payload.note || '',
      createdAt: now,
      updatedAt: now
    }

    records.unshift(result)
  })

  return result
}

function saveTodayStatusAsync(payload) {
  const status = payload.status || payload.mood

  if (!canUseCloudStatusRecords()) {
    return Promise.resolve(upsertTodayStatus({ ...payload, status }))
  }

  return callCloudFunction('upsertStatusRecord', {
    status,
    note: payload.note || ''
  }).then((result) => {
    if (result.success !== true || !result.statusRecord) {
      throw new Error(result.errorMessage || 'save_status_record_failed')
    }

    const record = normalizeStatusRecord(result.statusRecord)
    updateState('statusRecords', (records) => {
      const index = records.findIndex((item) => item.id === record.id
        || (item.userId === record.userId && item.date === record.date))

      if (index >= 0) {
        records.splice(index, 1, record)
        return
      }

      records.unshift(record)
    })
    return record
  })
}

// compatibility wrappers
function getTodayMood(userId) {
  return getTodayStatusByUser(userId)
}

function saveTodayMood(payload) {
  return upsertTodayStatus(payload)
}

module.exports = {
  getTodayStatusByUser,
  getTodayStatusMap,
  getTodayStatusMapAsync,
  getStatusRecords,
  getStatusRecordsAsync,
  upsertTodayStatus,
  saveTodayStatusAsync,
  getTodayMood,
  saveTodayMood
}
