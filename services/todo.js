const { getState, updateState } = require('./local-state')
const relationshipService = require('./relationship')
const { createTempId } = require('../utils/id')
const {
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
} = require('../utils/todo')
const { toDateKey } = require('../utils/time')

function getTodoContext() {
  const users = getState('users')
  const session = getState('session')
  const currentUser = getUserById(users, session.currentUserId) || users[0]
  const partnerUser = users.find((user) => user.userId !== currentUser.userId) || null

  return {
    users,
    currentUser,
    partnerUser
  }
}

function getSession() {
  return getState('session') || {}
}

function canUseCloudTodos() {
  const session = getSession()
  const relationship = relationshipService.getRelationshipContext()

  return Boolean(
    typeof wx !== 'undefined'
    && wx.cloud
    && typeof wx.cloud.callFunction === 'function'
    && session.isCloudLoggedIn === true
    && relationship.isBound
    && relationship.coupleId
  )
}

function normalizeCloudTodo(todo = {}, context = getTodoContext()) {
  const isCouple = todo.ownerType === 'couple'
  const ownerId = isCouple ? null : (todo.ownerUserId || null)
  const participants = isCouple
    ? [context.currentUser && context.currentUser.userId, context.partnerUser && context.partnerUser.userId].filter(Boolean)
    : [ownerId].filter(Boolean)

  return {
    todoId: todo.todoId,
    title: todo.title || '',
    note: todo.note || '',
    type: isCouple ? 'couple' : 'personal',
    ownerId,
    participants,
    dueDate: todo.dueDate || '',
    completed: todo.status === 'done',
    completedAt: todo.completedAt || null,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt || todo.createdAt
  }
}

function decorateTodo(todo, context) {
  const avatarUsers = getTodoAvatarUsers(todo, context.users)
  const dateState = getTodoDateState(todo)
  const isOverdue = dateState === 'overdue'
  const isDueToday = dateState === 'today'
  const statusLabel = todo.completed ? '已完成' : (isOverdue ? '已逾期' : '未完成')
  const statusVariant = todo.completed ? 'done' : (isOverdue ? 'overdue' : 'pending')

  return {
    ...todo,
    avatarMode: todo.type === 'couple' ? 'couple' : 'single',
    avatarUsers,
    typeLabel: getTodoTypeLabel(todo, context.currentUser.userId, context.partnerUser ? context.partnerUser.userId : ''),
    statusLabel,
    statusVariant,
    isOverdue,
    isDueToday,
    dueDateLabel: formatDueDateLabel(todo.dueDate),
    dueHint: isDueToday ? '今天截止' : ''
  }
}

function getTodoPageData(filterKey = 'all') {
  const context = getTodoContext()
  const allTodos = getState('todos')
  const visibleTodos = allTodos.filter((todo) => !todo.completed)
  const todos = visibleTodos
    .filter((todo) => matchTodoFilter(todo, filterKey, context.currentUser.userId, context.partnerUser ? context.partnerUser.userId : ''))
    .map((todo) => decorateTodo(todo, context))

  const sorted = sortTodos(todos)

  return {
    users: context.users,
    currentUser: context.currentUser,
    partnerUser: context.partnerUser,
    todos: sorted,
    todayPendingCount: countTodayPending(allTodos),
    totalPendingCount: countPendingTodos(allTodos),
    couplePendingCount: countCouplePending(allTodos),
    latestPendingTodos: sortTodos(visibleTodos).slice(0, 2)
  }
}

function createTodo(payload) {
  const now = new Date().toISOString()

  const todo = {
    todoId: createTempId('todo'),
    title: payload.title,
    note: payload.note || '',
    type: payload.type,
    ownerId: payload.type === 'personal' ? payload.ownerId : null,
    participants: payload.type === 'couple' ? getState('users').map((user) => user.userId) : [payload.ownerId],
    dueDate: payload.dueDate || '',
    completed: false,
    completedAt: null,
    createdAt: now
  }

  updateState('todos', (todos) => {
    todos.unshift(todo)
  })

  return todo
}

function toggleTodo(todoId) {
  let updated = null

  updateState('todos', (todos) => {
    const todo = todos.find((item) => item.todoId === todoId)

    if (!todo) {
      return
    }

    todo.completed = !todo.completed
    todo.completedAt = todo.completed ? new Date().toISOString() : null
    updated = todo
  })

  return updated
}

function getTodayPendingTodos(limit = 3) {
  const today = toDateKey(new Date())

  return sortTodos(getState('todos').filter((todo) => !todo.completed && todo.dueDate === today)).slice(0, limit)
}

function syncCloudTodosToLocal(todos = []) {
  const context = getTodoContext()
  const normalized = todos.map((todo) => normalizeCloudTodo(todo, context))

  updateState('todos', (stateTodos) => {
    stateTodos.splice(0, stateTodos.length, ...normalized)
  })

  return normalized
}

function callCloudFunction(name, data = {}) {
  return wx.cloud.callFunction({
    name,
    data
  }).then((res) => (res && res.result) || {})
}

function getTodosAsync(filterKey = 'all') {
  if (!canUseCloudTodos()) {
    return Promise.resolve(getTodoPageData(filterKey))
  }

  return callCloudFunction('getTodos')
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_todos_failed')
      }

      syncCloudTodosToLocal(result.todos || [])
      return getTodoPageData(filterKey)
    })
    .catch(() => getTodoPageData(filterKey))
}

function createTodoAsync(payload) {
  if (!canUseCloudTodos()) {
    return Promise.resolve(createTodo(payload))
  }

  const ownerType = payload.type === 'couple' ? 'couple' : 'user'
  const ownerUserId = ownerType === 'user' ? payload.ownerId : ''

  return callCloudFunction('createTodo', {
    title: payload.title,
    note: payload.note || '',
    dueDate: payload.dueDate || '',
    ownerType,
    ownerUserId
  }).then((result) => {
    if (result.success !== true || !result.todo) {
      throw new Error(result.errorMessage || 'create_todo_failed')
    }

    syncCloudTodosToLocal([result.todo, ...getState('todos')])
    return normalizeCloudTodo(result.todo)
  })
}

function toggleTodoStatusAsync(todoId, nextStatus) {
  if (!canUseCloudTodos()) {
    return Promise.resolve(toggleTodo(todoId))
  }

  return callCloudFunction('toggleTodoStatus', {
    todoId,
    nextStatus
  }).then((result) => {
    if (result.success !== true || !result.todo) {
      throw new Error(result.errorMessage || 'toggle_todo_status_failed')
    }

    updateState('todos', (todos) => {
      const normalized = normalizeCloudTodo(result.todo)
      const target = todos.find((item) => item.todoId === todoId)

      if (target) {
        Object.assign(target, normalized)
      }
    })

    return normalizeCloudTodo(result.todo)
  })
}

function removeTodo(todoId) {
  updateState('todos', (todos) => {
    const index = todos.findIndex((todo) => todo.todoId === todoId)

    if (index >= 0) {
      todos.splice(index, 1)
    }
  })
}

function removeTodoAsync(todoId) {
  if (!canUseCloudTodos()) {
    removeTodo(todoId)
    return Promise.resolve(true)
  }

  return callCloudFunction('removeTodo', {
    todoId
  }).then((result) => {
    if (result.success !== true) {
      throw new Error(result.errorMessage || 'remove_todo_failed')
    }

    removeTodo(todoId)
    return true
  })
}

function getTodayPendingTodosAsync(limit = 3) {
  if (!canUseCloudTodos()) {
    return Promise.resolve(getTodayPendingTodos(limit))
  }

  return callCloudFunction('getTodos')
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_todos_failed')
      }

      const normalized = syncCloudTodosToLocal(result.todos || [])
      const today = toDateKey(new Date())

      return sortTodos(normalized.filter((todo) => !todo.completed && todo.dueDate === today)).slice(0, limit)
    })
    .catch(() => getTodayPendingTodos(limit))
}

module.exports = {
  getTodoPageData,
  createTodo,
  toggleTodo,
  getTodayPendingTodos,
  canUseCloudTodos,
  getTodosAsync,
  createTodoAsync,
  toggleTodoStatusAsync,
  removeTodoAsync,
  getTodayPendingTodosAsync
}
