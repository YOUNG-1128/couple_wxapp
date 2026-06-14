const MOOD_OPTIONS = [
  { value: 'happy', label: '开心' },
  { value: 'normal', label: '一般' },
  { value: 'tired', label: '有点累' },
  { value: 'miss', label: '想你' },
  { value: 'busy', label: '忙碌' },
  { value: 'hug', label: '需要抱抱' }
]

function getRecentDateKeys(todayKey, dayCount) {
  const [year, month, day] = String(todayKey || '').split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const result = []

  for (let offset = 0; offset < dayCount; offset += 1) {
    const current = new Date(date.getTime() - offset * 24 * 60 * 60 * 1000)
    result.push(current.toISOString().slice(0, 10))
  }

  return result
}

function buildMoodTrend(records = [], userId, todayKey) {
  const recentDates = new Set(getRecentDateKeys(todayKey, 7))
  const recentRecords = records.filter((item) => {
    return item.userId === userId && recentDates.has(item.date)
  })
  const counts = {}

  recentRecords.forEach((item) => {
    counts[item.status] = (counts[item.status] || 0) + 1
  })

  const items = MOOD_OPTIONS.map((option) => {
    const count = counts[option.value] || 0

    return {
      ...option,
      count,
      percentage: recentRecords.length ? Math.round((count / recentRecords.length) * 100) : 0
    }
  })

  return {
    recordedDays: recentRecords.length,
    items,
    visibleItems: items.filter((item) => item.count > 0)
  }
}

module.exports = {
  MOOD_OPTIONS,
  buildMoodTrend
}
