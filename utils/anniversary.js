const { toDateKey } = require('./time')

function atStartOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function parseDate(dateStr) {
  if (!dateStr) {
    return null
  }

  const date = new Date(`${dateStr}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  return `${y}-${m}-${d}`
}

function formatMonthDay(dateInput) {
  const date = dateInput instanceof Date ? dateInput : parseDate(dateInput)

  if (!date || Number.isNaN(date.getTime())) {
    return ''
  }

  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  return `${m}.${d}`
}

function getNextOccurrence(item, today = atStartOfDay(new Date())) {
  const baseDate = parseDate(item.date)

  if (!baseDate) {
    return null
  }

  const todayStart = atStartOfDay(today)

  if (item.repeatType !== 'yearly') {
    return baseDate
  }

  const month = baseDate.getMonth()
  const day = baseDate.getDate()
  let next = new Date(todayStart.getFullYear(), month, day)

  if (atStartOfDay(next).getTime() < todayStart.getTime()) {
    next = new Date(todayStart.getFullYear() + 1, month, day)
  }

  return next
}

function getDaysUntil(targetDate, today = atStartOfDay(new Date())) {
  if (!targetDate) {
    return Number.MAX_SAFE_INTEGER
  }

  const todayStart = atStartOfDay(today)
  const targetStart = atStartOfDay(targetDate)
  const diff = targetStart.getTime() - todayStart.getTime()

  return Math.floor(diff / (24 * 60 * 60 * 1000))
}

function sortAnniversariesByUpcoming(list, today = new Date()) {
  return [...list].sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) {
      return a.daysUntil - b.daysUntil
    }

    return (a.title || '').localeCompare(b.title || '', 'zh-Hans-CN')
  })
}

function getUpcomingWithinDays(list, days = 30, today = new Date()) {
  return list.filter((item) => item.daysUntil >= 0 && item.daysUntil <= days)
}

function decorateAnniversary(item, today = new Date()) {
  const nextDateObj = getNextOccurrence(item, today)
  const daysUntil = getDaysUntil(nextDateObj, today)

  return {
    ...item,
    nextDate: nextDateObj ? formatDate(nextDateObj) : '',
    nextDateShort: nextDateObj ? formatMonthDay(nextDateObj) : '',
    daysUntil,
    countdownText: daysUntil === 0 ? '就是今天' : `还有 ${daysUntil} 天`,
    isToday: daysUntil === 0,
    displayDate: item.date
  }
}

module.exports = {
  getNextOccurrence,
  getDaysUntil,
  sortAnniversariesByUpcoming,
  getUpcomingWithinDays,
  decorateAnniversary,
  toDateKey
}
