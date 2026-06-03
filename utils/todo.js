const { toDateKey } = require('./time')

function getUserById(users, userId) {
  return users.find((user) => user.userId === userId) || null
}

function getTodoTypeLabel(todo, currentUserId, partnerUserId) {
  if (todo.type === 'couple') {
    return '情侣待办'
  }

  if (todo.ownerId === currentUserId) {
    return '我的待办'
  }

  if (todo.ownerId === partnerUserId) {
    return 'TA 的待办'
  }

  return '个人待办'
}

function getTodoAvatarUsers(todo, users) {
  if (todo.type === 'couple') {
    return (todo.participants || [])
      .map((userId) => getUserById(users, userId))
      .filter(Boolean)
      .slice(0, 2)
  }

  const owner = getUserById(users, todo.ownerId)

  return owner ? [owner] : []
}

function matchTodoFilter(todo, filterKey, currentUserId, partnerUserId) {
  if (filterKey === 'all') {
    return true
  }

  if (filterKey === 'me') {
    return todo.type === 'personal' && todo.ownerId === currentUserId
  }

  if (filterKey === 'partner') {
    return todo.type === 'personal' && todo.ownerId === partnerUserId
  }

  if (filterKey === 'couple') {
    return todo.type === 'couple'
  }

  return true
}

function sortTodos(todos) {
  const today = toDateKey(new Date())

  return [...todos].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1
    }

    if (!a.completed && !b.completed) {
      const aRank = getPendingPriority(a, today)
      const bRank = getPendingPriority(b, today)

      if (aRank !== bRank) {
        return aRank - bRank
      }

      const aDue = a.dueDate || '9999-99-99'
      const bDue = b.dueDate || '9999-99-99'

      if (aDue !== bDue) {
        return aDue < bDue ? -1 : 1
      }
    }

    if (a.completed && b.completed) {
      const aDone = a.completedAt || ''
      const bDone = b.completedAt || ''

      if (aDone !== bDone) {
        return aDone > bDone ? -1 : 1
      }
    }

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

function getPendingPriority(todo, today) {
  if (!todo.dueDate) {
    return 3
  }

  if (todo.dueDate < today) {
    return 0
  }

  if (todo.dueDate === today) {
    return 1
  }

  return 2
}

function getTodoDateState(todo, today = toDateKey(new Date())) {
  if (todo.completed) {
    return 'done'
  }

  if (!todo.dueDate) {
    return 'normal'
  }

  if (todo.dueDate < today) {
    return 'overdue'
  }

  if (todo.dueDate === today) {
    return 'today'
  }

  return 'upcoming'
}

function formatDueDateLabel(dueDate) {
  if (!dueDate) {
    return '未设置截止日期'
  }

  return dueDate.slice(5)
}

function countPendingTodos(todos) {
  return todos.filter((todo) => !todo.completed).length
}

function countCouplePending(todos) {
  return todos.filter((todo) => !todo.completed && todo.type === 'couple').length
}

function countTodayPending(todos) {
  const today = toDateKey(new Date())

  return todos.filter((todo) => !todo.completed && todo.dueDate && todo.dueDate === today).length
}

module.exports = {
  getUserById,
  getTodoTypeLabel,
  getTodoAvatarUsers,
  matchTodoFilter,
  sortTodos,
  countTodayPending,
  getTodoDateState,
  formatDueDateLabel,
  countPendingTodos,
  countCouplePending
}
