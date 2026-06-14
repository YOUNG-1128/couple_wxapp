const DAY_MS = 24 * 60 * 60 * 1000

function parseDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''))

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function isValidRelationshipDate(dateKey, todayKey) {
  const date = parseDateKey(dateKey)
  const today = parseDateKey(todayKey)

  return Boolean(date && today && date.getTime() <= today.getTime())
}

function calculateLoveDays(startDate, todayKey) {
  const start = parseDateKey(startDate)
  const today = parseDateKey(todayKey)

  if (!start || !today || start.getTime() > today.getTime()) {
    return 0
  }

  return Math.floor((today.getTime() - start.getTime()) / DAY_MS) + 1
}

function formatRelationshipDate(dateKey) {
  return String(dateKey || '').replace(/-/g, '.')
}

function getOpeningMode(options = {}) {
  if (options.status === 'pending') {
    return 'inviting'
  }

  if (options.status !== 'bound') {
    return 'solo'
  }

  if (options.justConnected === true) {
    return 'just-connected'
  }

  return options.relationshipStartDate ? 'story' : 'choose-start-date'
}

module.exports = {
  calculateLoveDays,
  formatRelationshipDate,
  getOpeningMode,
  isValidRelationshipDate
}
