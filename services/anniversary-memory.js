const momentsService = require('./moments')
const mailboxService = require('./mailbox')
const { toDateKey } = require('../utils/time')
const { solarToLunar } = require('../utils/lunar')

function matchesAnniversaryDate(anniversary, input) {
  if (!input) {
    return false
  }

  const dateKey = toDateKey(input)

  if (anniversary.calendarType === 'lunar') {
    const lunar = solarToLunar(dateKey)

    return Boolean(
      lunar
      && lunar.month === Number(anniversary.lunarMonth)
      && lunar.day === Number(anniversary.lunarDay)
      && lunar.isLeapMonth === (anniversary.lunarIsLeapMonth === true)
    )
  }

  return dateKey.slice(5, 10) === String(anniversary.date || '').slice(5, 10)
}

function buildAnniversaryTimeline(anniversary, posts = [], letters = []) {
  const items = []

  posts.forEach((post) => {
    if (!matchesAnniversaryDate(anniversary, post.createdAt)) {
      return
    }

    items.push({
      id: post.postId,
      type: 'post',
      typeLabel: '共同动态',
      title: post.content || '一条属于你们的动态',
      content: post.content || '',
      images: Array.isArray(post.images) ? post.images : [],
      occurredAt: post.createdAt
    })
  })

  letters.forEach((letter) => {
    const occurredAt = letter.sentAt || letter.createdAt

    if (letter.status === 'draft' || letter.visible === false || !matchesAnniversaryDate(anniversary, occurredAt)) {
      return
    }

    items.push({
      id: letter.letterId,
      type: 'letter',
      typeLabel: '一封信',
      title: letter.title || '写给彼此的一封信',
      content: letter.content || '',
      images: Array.isArray(letter.images) ? letter.images : [],
      occurredAt
    })
  })

  const groups = {}
  items
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .forEach((item) => {
      const dateKey = toDateKey(item.occurredAt)
      const year = dateKey.slice(0, 4)

      if (!groups[year]) {
        groups[year] = []
      }

      groups[year].push({
        ...item,
        dateKey,
        dateLabel: dateKey.replace(/-/g, '.')
      })
    })

  return Object.keys(groups)
    .sort((a, b) => Number(b) - Number(a))
    .map((year) => ({
      year,
      items: groups[year]
    }))
}

function getAnniversaryTimelineAsync(anniversary) {
  return Promise.all([
    momentsService.getMomentsFeedAsync({}),
    mailboxService.getMailboxPageDataAsync()
  ]).then(([posts, mailbox]) => buildAnniversaryTimeline(anniversary, posts, mailbox.history || []))
}

module.exports = {
  buildAnniversaryTimeline,
  getAnniversaryTimelineAsync
}
