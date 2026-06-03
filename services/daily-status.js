const { getState, updateState } = require('./local-state')
const { createTempId } = require('../utils/id')
const { toDateKey } = require('../utils/time')

function getTodayStatusByUser(userId) {
  const today = toDateKey(new Date())

  return getState('dailyStatus').find((item) => item.userId === userId && item.date === today) || null
}

function setTodayStatus(user, status) {
  const today = toDateKey(new Date())
  const now = new Date().toISOString()
  let target = null

  updateState('dailyStatus', (list) => {
    target = list.find((item) => item.userId === user.userId && item.date === today)

    if (target) {
      target.status = status.value
      target.label = status.label
      target.createdAt = now
      return
    }

    target = {
      id: createTempId('daily-status'),
      userId: user.userId,
      date: today,
      status: status.value,
      label: status.label,
      createdAt: now
    }

    list.unshift(target)
  })

  return target
}

module.exports = {
  getTodayStatusByUser,
  setTodayStatus
}
