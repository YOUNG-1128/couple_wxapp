const { decorateAnniversary } = require('./anniversary')

function toTime(value) {
  const time = new Date(value || '').getTime()
  return Number.isNaN(time) ? 0 : time
}

function getLatestVisibleAt(items = [], field = 'createdAt') {
  const validItems = items
    .map((item) => ({
      value: item && item[field],
      time: toTime(item && item[field])
    }))
    .filter((item) => item.time > 0)
    .sort((a, b) => b.time - a.time)

  return validItems[0] ? validItems[0].value : ''
}

function buildTodayAnniversaryActions(anniversaries = [], today = new Date()) {
  return anniversaries
    .map((item) => decorateAnniversary(item, today))
    .filter((item) => item.isToday)
    .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-Hans-CN'))
    .map((item) => ({
      id: `anniversary-today-${item.id}`,
      type: 'anniversary_today',
      title: `今天是${item.title}`,
      subtitle: item.occurrenceText || item.elapsedText || '一起记住这个特别的日子',
      status: 'pending',
      actionText: '去看看',
      targetPage: '/pages/anniversary/anniversary',
      createdAt: `${today}T00:00:00`
    }))
}

function buildPartnerPostActions(posts = [], currentUserId, lastSeenPostAt = '') {
  const lastSeenTime = toTime(lastSeenPostAt)
  const latestPost = posts
    .filter((post) => {
      return post
        && post.authorId
        && post.authorId !== currentUserId
        && toTime(post.createdAt) > lastSeenTime
    })
    .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))[0]

  if (!latestPost) {
    return []
  }

  return [{
    id: `partner-post-${latestPost.postId}`,
    type: 'partner_post',
    title: 'TA 发布了新动态',
    subtitle: latestPost.content || `${latestPost.authorName || 'TA'} 更新了一段回忆`,
    status: 'pending',
    actionText: '去查看',
    targetPage: '/pages/album/album',
    createdAt: latestPost.createdAt
  }]
}

function buildPartnerCoupleTodoActions(todos = [], currentUserId, lastSeenCoupleTodoAt = '') {
  const lastSeenTime = toTime(lastSeenCoupleTodoAt)
  const latestTodo = todos
    .filter((todo) => {
      return todo
        && todo.type === 'couple'
        && todo.completed !== true
        && todo.createdByUserId
        && todo.createdByUserId !== currentUserId
        && toTime(todo.createdAt) > lastSeenTime
    })
    .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))[0]

  if (!latestTodo) {
    return []
  }

  return [{
    id: `partner-couple-todo-${latestTodo.todoId}`,
    type: 'partner_couple_todo',
    title: 'TA 新建了情侣待办',
    subtitle: latestTodo.title,
    status: 'pending',
    actionText: '去完成',
    targetPage: '/pages/todo/todo',
    createdAt: latestTodo.createdAt
  }]
}

function buildHomePendingActions(options = {}) {
  const actions = [
    ...buildTodayAnniversaryActions(options.anniversaries || [], options.today || new Date()),
    ...buildPartnerCoupleTodoActions(
      options.todos || [],
      options.currentUserId || '',
      options.lastSeenCoupleTodoAt || ''
    ),
    ...buildPartnerPostActions(
      options.posts || [],
      options.currentUserId || '',
      options.lastSeenPostAt || ''
    )
  ]

  return actions.filter((item) => item && item.id)
}

module.exports = {
  buildHomePendingActions,
  getLatestVisibleAt
}
