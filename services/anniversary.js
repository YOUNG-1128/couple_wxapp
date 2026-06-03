const { getState, updateState } = require('./local-state')
const { createTempId } = require('../utils/id')
const {
  sortAnniversariesByUpcoming,
  getUpcomingWithinDays,
  decorateAnniversary
} = require('../utils/anniversary')

const ANNIVERSARY_TYPES = [
  '恋爱纪念日',
  '第一次见面',
  '第一次约会',
  '生日',
  '旅行',
  '节日',
  '自定义'
]

function getAnniversaryTypes() {
  return ANNIVERSARY_TYPES
}

function getDecoratedList() {
  const raw = getState('anniversaries') || []
  const decorated = raw.map((item) => decorateAnniversary(item))

  return sortAnniversariesByUpcoming(decorated)
}

function getAnniversaryPageData() {
  const list = getDecoratedList()

  return {
    list,
    highlighted: list[0] || null,
    types: getAnniversaryTypes()
  }
}

function getAnniversaryById(id) {
  const list = getDecoratedList()

  return list.find((item) => item.id === id) || null
}

function createAnniversary(payload) {
  const now = new Date().toISOString()
  const item = {
    id: createTempId('anniversary'),
    title: payload.title,
    date: payload.date,
    type: payload.type || '自定义',
    repeatType: payload.repeatType || 'none',
    note: payload.note || '',
    coverImage: payload.coverImage || '',
    createdAt: now
  }

  updateState('anniversaries', (list) => {
    list.unshift(item)
  })

  return item
}

function getUpcomingForHome(days = 30) {
  const list = getDecoratedList()

  return getUpcomingWithinDays(list, days).map((item) => ({
    id: item.id,
    title: item.title,
    date: item.nextDate,
    daysLeft: item.daysUntil,
    countdownText: item.countdownText
  }))
}

module.exports = {
  getAnniversaryPageData,
  getAnniversaryById,
  createAnniversary,
  getUpcomingForHome,
  getAnniversaryTypes
}
