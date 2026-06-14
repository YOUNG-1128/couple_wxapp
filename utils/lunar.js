const MONTH_LABELS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '腊月']
const MONTH_ALIASES = {
  正月: 1,
  一月: 1,
  二月: 2,
  三月: 3,
  四月: 4,
  五月: 5,
  六月: 6,
  七月: 7,
  八月: 8,
  九月: 9,
  十月: 10,
  冬月: 11,
  十一月: 11,
  腊月: 12,
  十二月: 12
}
const DAY_LABELS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
]
const solarCache = {}
const lunarCache = {}
let formatterCache

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatSolarDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function getFormatter() {
  if (formatterCache !== undefined) {
    return formatterCache
  }

  try {
    formatterCache = typeof Intl !== 'undefined'
      ? new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric'
        })
      : null
  } catch (error) {
    formatterCache = null
  }

  return formatterCache
}

function isLunarSupported() {
  const formatter = getFormatter()

  return Boolean(formatter && typeof formatter.formatToParts === 'function')
}

function parseLunarMonthValue(value) {
  const rawValue = String(value || '').trim()
  const isLeapMonth = rawValue.startsWith('闰')
  const normalizedValue = isLeapMonth ? rawValue.slice(1) : rawValue
  const numericMatch = normalizedValue.match(/^(\d{1,2})月?$/)
  const parsedMonth = numericMatch
    ? Number(numericMatch[1])
    : Number(MONTH_ALIASES[normalizedValue] || 0)
  const month = parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : 0

  return {
    month,
    isLeapMonth
  }
}

function solarToLunar(dateInput) {
  const dateKey = typeof dateInput === 'string' ? dateInput.slice(0, 10) : formatSolarDate(dateInput)

  if (lunarCache[dateKey]) {
    return { ...lunarCache[dateKey] }
  }

  const date = new Date(`${dateKey}T12:00:00`)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const formatter = getFormatter()

  if (!formatter || typeof formatter.formatToParts !== 'function') {
    return null
  }

  const parts = formatter.formatToParts(date)
  const yearPart = parts.find((part) => part.type === 'relatedYear')
  const monthPart = parts.find((part) => part.type === 'month')
  const dayPart = parts.find((part) => part.type === 'day')
  const monthValue = monthPart ? monthPart.value : ''
  const lunarMonth = parseLunarMonthValue(monthValue)
  const lunar = {
    year: Number(yearPart && yearPart.value),
    month: lunarMonth.month,
    day: Number(dayPart && dayPart.value),
    isLeapMonth: lunarMonth.isLeapMonth
  }

  if (!lunar.year || !lunar.month || !lunar.day) {
    return null
  }

  lunarCache[dateKey] = lunar
  return { ...lunar }
}

function lunarToSolar(year, month, day, isLeapMonth = false) {
  const cacheKey = `${year}-${month}-${day}-${isLeapMonth ? 1 : 0}`

  if (solarCache[cacheKey]) {
    return solarCache[cacheKey]
  }

  const start = new Date(year, 0, 15)
  const end = new Date(year + 1, 2, 1)

  for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
    const lunar = solarToLunar(date)

    if (
      lunar
      && lunar.year === Number(year)
      && lunar.month === Number(month)
      && lunar.day === Number(day)
      && lunar.isLeapMonth === Boolean(isLeapMonth)
    ) {
      const result = formatSolarDate(date)
      solarCache[cacheKey] = result
      return result
    }
  }

  return ''
}

function formatLunarDate(month, day, isLeapMonth = false) {
  const monthLabel = MONTH_LABELS[Number(month) - 1] || ''
  const dayLabel = DAY_LABELS[Number(day) - 1] || ''

  return monthLabel && dayLabel ? `农历${isLeapMonth ? '闰' : ''}${monthLabel}${dayLabel}` : ''
}

function getLunarPickerRange(startYear = 1940, endYear = new Date().getFullYear()) {
  const years = []

  for (let year = endYear; year >= startYear; year -= 1) {
    years.push(String(year))
  }

  return [
    years,
    MONTH_LABELS.map((label) => label),
    DAY_LABELS.map((label) => label)
  ]
}

module.exports = {
  lunarToSolar,
  solarToLunar,
  formatLunarDate,
  getLunarPickerRange,
  isLunarSupported
}
