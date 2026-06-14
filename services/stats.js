const companionService = require('./companion')
const dailyMoodService = require('./dailyMood')
const { toDateKey } = require('../utils/time')

function getRecentStatusStats() {
  const companionData = companionService.getCompanionData()
  return buildRecentStatusStats(
    dailyMoodService.getStatusRecords(),
    companionData.missHistory,
    new Date()
  )
}

function buildRecentStatusStats(statusRecords = [], missHistory = [], today = new Date()) {
  const currentWeekStatuses = getCurrentWeekRecords(statusRecords, today)
  const happyDays = getUniqueHappyDays(currentWeekStatuses).length
  const missCount = missHistory.filter((record) => record.weekTag === 'current').length

  return [
    {
      value: happyDays,
      title: '本周开心天数',
      desc: '来自首页每日状态'
    },
    {
      value: missCount,
      title: '本周想你次数',
      desc: '包含发出和收到的想你信号'
    },
    {
      value: currentWeekStatuses.length,
      title: '本周状态记录',
      desc: '来自首页每日状态'
    }
  ]
}

function getUniqueHappyDays(records) {
  const happyDays = {}

  records.forEach((record) => {
    if (record.status === 'happy') {
      happyDays[record.date] = true
    }
  })

  return Object.keys(happyDays)
}

function getCurrentWeekRecords(records, today) {
  const currentDate = toLocalDate(today)
  const day = currentDate.getDay() || 7
  const weekStart = new Date(currentDate)
  const weekEnd = new Date(currentDate)

  weekStart.setDate(currentDate.getDate() - day + 1)
  weekEnd.setDate(weekStart.getDate() + 6)

  const startKey = toDateKey(weekStart)
  const endKey = toDateKey(weekEnd)

  return records.filter((record) => record.date >= startKey && record.date <= endKey)
}

function toLocalDate(input) {
  if (input instanceof Date) {
    return new Date(input)
  }

  const parts = String(input).split('-').map(Number)

  return new Date(parts[0], parts[1] - 1, parts[2])
}

module.exports = {
  getRecentStatusStats,
  buildRecentStatusStats
}
