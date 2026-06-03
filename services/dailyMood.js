const { getState, updateState } = require('./local-state')
const { createTempId } = require('../utils/id')
const { toDateKey } = require('../utils/time')

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

function upsertTodayStatus(payload) {
  const today = toDateKey(new Date())
  const now = new Date().toISOString()
  let result = null

  updateState('statusRecords', (records) => {
    result = records.find((item) => item.userId === payload.userId && item.date === today)

    if (result) {
      result.status = payload.status
      result.note = payload.note || ''
      result.updatedAt = now
      return
    }

    result = {
      id: createTempId('status'),
      userId: payload.userId,
      date: today,
      status: payload.status,
      note: payload.note || '',
      createdAt: now,
      updatedAt: now
    }

    records.unshift(result)
  })

  return result
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
  upsertTodayStatus,
  getTodayMood,
  saveTodayMood
}
