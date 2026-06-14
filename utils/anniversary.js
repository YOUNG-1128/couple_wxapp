const { toDateKey } = require('./time')
const { lunarToSolar, formatLunarDate } = require('./lunar')

const SEMANTIC_TYPES = ['relationship', 'birthday', 'shared_memory', 'custom']
const LEGACY_TYPE_MAP = {
  恋爱纪念日: 'relationship',
  生日: 'birthday',
  第一次见面: 'shared_memory',
  第一次约会: 'shared_memory'
}

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

  if (item.calendarType === 'lunar' && item.repeatType === 'yearly') {
    const candidates = [
      todayStart.getFullYear() - 1,
      todayStart.getFullYear(),
      todayStart.getFullYear() + 1
    ].map((year) => parseDate(lunarToSolar(
        year,
        item.lunarMonth,
        item.lunarDay,
        item.lunarIsLeapMonth === true
      )))
      .filter((date) => date && atStartOfDay(date).getTime() >= todayStart.getTime())
      .sort((a, b) => a.getTime() - b.getTime())

    return candidates[0] || null
  }

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

function formatCountdownText(daysUntil) {
  if (daysUntil === 0) {
    return '就是今天'
  }

  if (daysUntil < 0) {
    return `已经过去 ${Math.abs(daysUntil)} 天`
  }

  return `还有 ${daysUntil} 天`
}

function getOccurrenceCount(item, nextDateObj) {
  const baseDate = parseDate(item.date)

  if (item.repeatType !== 'yearly' || !baseDate || !nextDateObj) {
    return 0
  }

  return Math.max(1, nextDateObj.getFullYear() - baseDate.getFullYear() + 1)
}

function normalizeSemanticType(type) {
  if (SEMANTIC_TYPES.includes(type)) {
    return type
  }

  return LEGACY_TYPE_MAP[type] || 'custom'
}

function getElapsedDays(item, today = new Date()) {
  const baseDate = parseDate(item.date)

  if (!baseDate) {
    return 0
  }

  const diff = atStartOfDay(today).getTime() - atStartOfDay(baseDate).getTime()

  return diff < 0 ? 0 : Math.floor(diff / (24 * 60 * 60 * 1000)) + 1
}

function getElapsedText(item, semanticType, today = new Date()) {
  const elapsedDays = getElapsedDays(item, today)

  if (elapsedDays <= 0) {
    return ''
  }

  if (semanticType === 'birthday') {
    return `已经来到世界 ${elapsedDays} 天`
  }

  if (semanticType === 'relationship') {
    return `我们已经一起走过 ${elapsedDays} 天`
  }

  return `这个日子已经过去 ${elapsedDays} 天`
}

function groupAnniversaries(list = []) {
  const upcoming = sortAnniversariesByUpcoming(list.filter((item) => item.daysUntil >= 0))
  const past = list
    .filter((item) => item.daysUntil < 0)
    .sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) {
        return b.daysUntil - a.daysUntil
      }

      return (a.title || '').localeCompare(b.title || '', 'zh-Hans-CN')
    })

  return {
    upcoming,
    past
  }
}

function decorateAnniversary(item, today = new Date()) {
  const nextDateObj = getNextOccurrence(item, today)
  const daysUntil = getDaysUntil(nextDateObj, today)
  const occurrenceCount = getOccurrenceCount(item, nextDateObj)
  const semanticType = normalizeSemanticType(item.type)

  return {
    ...item,
    nextDate: nextDateObj ? formatDate(nextDateObj) : '',
    nextDateShort: nextDateObj ? formatMonthDay(nextDateObj) : '',
    daysUntil,
    countdownText: formatCountdownText(daysUntil),
    occurrenceCount,
    occurrenceText: occurrenceCount > 0 && semanticType !== 'birthday'
      ? `这是我们一起纪念的第 ${occurrenceCount} 次`
      : '',
    semanticType,
    elapsedText: getElapsedText(item, semanticType, today),
    isToday: daysUntil === 0,
    displayDate: item.calendarType === 'lunar'
      ? formatLunarDate(item.lunarMonth, item.lunarDay, item.lunarIsLeapMonth === true)
      : item.date
  }
}

module.exports = {
  getNextOccurrence,
  getDaysUntil,
  sortAnniversariesByUpcoming,
  getUpcomingWithinDays,
  formatCountdownText,
  getOccurrenceCount,
  normalizeSemanticType,
  getElapsedDays,
  getElapsedText,
  groupAnniversaries,
  decorateAnniversary,
  toDateKey
}
