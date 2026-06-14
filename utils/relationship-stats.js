const { toDateKey } = require('./time')

const CATEGORIES = ['highlight', 'recent', 'countdown']

function buildRelationshipStatPool(data = {}, today = new Date()) {
  const todayKey = toDateKey(toLocalDate(today))
  const weekRecords = (records, field) => filterCurrentWeek(records, field, todayKey)
  const statusRecords = data.statusRecords || []
  const currentWeekStatuses = weekRecords(statusRecords, 'date')
  const posts = data.posts || []
  const letters = data.letters || []
  const todos = data.todos || []
  const footprints = data.footprints || []
  const bucketList = data.bucketList || []
  const capsules = data.capsules || []
  const questions = data.questionDailyRecords || []
  const anniversaries = data.anniversaries || []
  const sentLetters = letters.filter((item) => item.status !== 'draft')
  const completedQuestions = questions.filter((item) => item.myAnswered && item.partnerAnswered)
  const comments = posts.reduce((list, post) => list.concat(post.comments || []), [])
  const photoCount = posts.reduce((count, post) => count + (post.images || []).length, 0)
    + footprints.reduce((count, item) => count + (item.images || []).length, 0)
  const happyDays = uniqueCount(currentWeekStatuses.filter((item) => item.status === 'happy'), 'date')
  const statusMatchDays = countMatchingStatusDays(currentWeekStatuses)
  const completedBucketItems = bucketList.filter((item) => item.completed)
  const pendingTodos = todos.filter((item) => !item.completed)
  const lockedCapsules = capsules.filter((item) => item.status === 'locked' || item.isOpened === false)
  const scheduledLetters = letters.filter((item) => item.status === 'scheduled')
  const nextAnniversary = findNextAnniversary(anniversaries, todayKey)
  const nextCapsule = findNextDate(capsules, 'openAt', todayKey)

  return [
    stat('relationship-days', 'highlight', relationshipDays(data.relationshipStartDate, todayKey), '一起走过的天数', '从关系开始那天算起'),
    stat('letters-total', 'highlight', sentLetters.length, '互寄信件总数', '写给彼此的认真话语'),
    stat('posts-total', 'highlight', posts.length, '共同动态总数', '被好好保存的日常'),
    stat('photos-total', 'highlight', photoCount, '收藏照片总数', '来自动态与共同足迹'),
    stat('footprint-cities', 'highlight', uniqueCityCount(footprints), '一起去过的城市', '共同足迹点亮的地方'),
    stat('footprints-total', 'highlight', footprints.length, '共同足迹总数', '一起抵达过的地点'),
    stat('bucket-completed', 'highlight', completedBucketItems.length, '完成的共同愿望', `距离 100 件事还差 ${Math.max(0, bucketList.length - completedBucketItems.length)} 件`),
    stat('questions-completed', 'highlight', completedQuestions.length, '共同回答的问题', '认真了解彼此的次数'),
    stat('comments-total', 'highlight', comments.length, '动态互动总数', '留在彼此动态下的话'),

    stat('happy-days-week', 'recent', happyDays, '本周开心天数', '来自首页每日状态'),
    stat('status-records-week', 'recent', currentWeekStatuses.length, '本周状态记录', '两个人留下的每日状态'),
    stat('status-match-days-week', 'recent', statusMatchDays, '本周默契状态', '同一天选择相同状态'),
    stat('miss-signals-week', 'recent', (data.missHistory || []).filter((item) => item.weekTag === 'current').length, '本周想你次数', '包含发出和收到的想你信号'),
    stat('todos-completed-week', 'recent', weekRecords(todos.filter((item) => item.completed), 'completedAt').length, '本周完成待办', '一起完成的小目标'),
    stat('posts-week', 'recent', weekRecords(posts, 'createdAt').length, '本周新增动态', '这周留下的新回忆'),
    stat('comments-week', 'recent', weekRecords(comments, 'createdAt').length, '本周评论互动', '在动态里回应彼此'),
    stat('letters-week', 'recent', weekRecords(sentLetters, 'sentAt').length, '本周互寄信件', '这周写给彼此的信'),
    stat('questions-week', 'recent', weekRecords(completedQuestions, 'date').length, '本周共同回答', '双方都完成的每日问答'),

    stat('next-anniversary-days', 'countdown', nextAnniversary ? nextAnniversary.days : 0, '距离下个纪念日', nextAnniversary ? nextAnniversary.title : '还没有设置纪念日', '天'),
    stat('locked-capsules', 'countdown', lockedCapsules.length, '等待开启的胶囊', '留给未来的悄悄话'),
    stat('next-capsule-days', 'countdown', nextCapsule ? nextCapsule.days : 0, '距离胶囊开启', nextCapsule ? '最近一颗记忆胶囊' : '还没有等待开启的胶囊', '天'),
    stat('scheduled-letters', 'countdown', scheduledLetters.length, '等待送达的信', '将在未来抵达的心意'),
    stat('pending-todos', 'countdown', pendingTodos.length, '等待完成的待办', '一起慢慢完成'),
    stat('bucket-remaining', 'countdown', Math.max(0, bucketList.length - completedBucketItems.length), '距离完成 100 件事', '还有这些愿望等着一起完成', '件')
  ]
}

function selectDailyStats(pool = [], today = new Date()) {
  const seed = dateSeed(today)

  return CATEGORIES.map((category, categoryIndex) => {
    const categoryItems = pool.filter((item) => item.category === category)
    const positiveItems = categoryItems.filter((item) => Number(item.value) > 0)
    const candidates = positiveItems.length ? positiveItems : categoryItems

    return candidates[(seed + categoryIndex) % candidates.length]
  }).filter(Boolean)
}

function stat(id, category, value, title, desc, suffix = '') {
  return { id, category, value, title, desc, suffix }
}

function filterCurrentWeek(records = [], field, today) {
  const range = getWeekRange(today)

  return records.filter((item) => {
    const dateKey = getDateKey(item[field])

    return dateKey && dateKey >= range.start && dateKey <= range.end
  })
}

function getWeekRange(today) {
  const currentDate = toLocalDate(today)
  const day = currentDate.getDay() || 7
  const start = new Date(currentDate)
  const end = new Date(currentDate)

  start.setDate(currentDate.getDate() - day + 1)
  end.setDate(start.getDate() + 6)

  return {
    start: toDateKey(start),
    end: toDateKey(end)
  }
}

function countMatchingStatusDays(records) {
  const byDate = {}

  records.forEach((record) => {
    byDate[record.date] = byDate[record.date] || []
    byDate[record.date].push(record)
  })

  return Object.keys(byDate).filter((date) => {
    const statuses = byDate[date].map((item) => item.status)

    return statuses.length >= 2 && new Set(statuses).size === 1
  }).length
}

function uniqueCount(records, field) {
  return new Set(records.map((item) => item[field]).filter(Boolean)).size
}

function uniqueCityCount(footprints) {
  return new Set(footprints.map((item) => item.city && item.city.name).filter(Boolean)).size
}

function relationshipDays(startDate, today) {
  if (!startDate) {
    return 0
  }

  return Math.max(0, daysBetween(startDate, today) + 1)
}

function findNextAnniversary(anniversaries, today) {
  const todayDate = toLocalDate(today)
  const candidates = anniversaries.map((item) => {
    const source = toLocalDate(item.date)
    let target = new Date(source)

    if (item.repeatType === 'yearly') {
      target = new Date(todayDate.getFullYear(), source.getMonth(), source.getDate())
      if (target < todayDate) {
        target.setFullYear(target.getFullYear() + 1)
      }
    }

    return {
      title: item.title,
      days: daysBetween(todayDate, target),
      date: target
    }
  }).filter((item) => item.days >= 0).sort((a, b) => a.days - b.days)

  return candidates[0] || null
}

function findNextDate(records, field, today) {
  return records.map((item) => ({
    days: daysBetween(today, item[field])
  })).filter((item) => item.days >= 0).sort((a, b) => a.days - b.days)[0] || null
}

function daysBetween(from, to) {
  const start = toLocalDate(from)
  const end = toLocalDate(to)

  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

function getDateKey(input) {
  if (!input) {
    return ''
  }

  return toDateKey(toLocalDate(String(input).slice(0, 10)))
}

function toLocalDate(input) {
  if (input instanceof Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate())
  }

  const parts = String(input).slice(0, 10).split('-').map(Number)

  return new Date(parts[0], parts[1] - 1, parts[2])
}

function dateSeed(today) {
  const date = toLocalDate(today)

  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000)
}

module.exports = {
  buildRelationshipStatPool,
  selectDailyStats
}
