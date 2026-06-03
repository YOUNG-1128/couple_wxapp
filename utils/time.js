function pad(value) {
  return String(value).padStart(2, '0')
}

function toDateObj(input) {
  return input instanceof Date ? input : new Date(input)
}

function toDateKey(input) {
  const date = toDateObj(input)

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatFullDateTime(input) {
  const date = toDateObj(input)

  return `${toDateKey(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatPostTime(input) {
  const date = toDateObj(input)
  const now = new Date()

  if (toDateKey(date) === toDateKey(now)) {
    return `今天 ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  return formatFullDateTime(date)
}

function formatCommentTime(input) {
  return formatFullDateTime(input)
}

module.exports = {
  toDateKey,
  formatPostTime,
  formatCommentTime
}
