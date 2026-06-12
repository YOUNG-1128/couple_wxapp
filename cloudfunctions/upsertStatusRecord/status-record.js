const ALLOWED_STATUSES = ['happy', 'normal', 'tired', 'miss', 'busy', 'hug']

function getHongKongDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const map = {}

  parts.forEach((part) => {
    map[part.type] = part.value
  })

  return `${map.year}-${map.month}-${map.day}`
}

function normalizeStatusPayload(event = {}) {
  const status = String(event.status || '')

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error('status_invalid')
  }

  return {
    status,
    note: String(event.note || '').trim().slice(0, 120)
  }
}

module.exports = {
  ALLOWED_STATUSES,
  getHongKongDateKey,
  normalizeStatusPayload
}
