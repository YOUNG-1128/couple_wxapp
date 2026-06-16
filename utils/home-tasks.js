function buildTodoTask(todo) {
  return {
    id: `todo-${todo.todoId}`,
    type: 'todo',
    title: todo.title,
    subtitle: todo.dueDate ? `今日待办 · ${todo.dueDate}` : '今日待办',
    actionText: '去完成',
    targetPage: '/pages/todo/todo'
  }
}

function buildInteractiveTask(item) {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    subtitle: item.subtitle,
    actionText: item.actionText || '去处理',
    targetPage: item.targetPage,
    targetSection: item.targetSection || ''
  }
}

function mergeHomeTasks(options = {}) {
  const interactiveTasks = (options.pendingActions || []).map(buildInteractiveTask)
  const duplicateTodoIds = new Set(
    interactiveTasks
      .filter((item) => item.type === 'partner_couple_todo')
      .map((item) => String(item.id || '').replace('partner-couple-todo-', ''))
      .filter(Boolean)
  )

  const todoTasks = (options.todos || [])
    .filter((todo) => !duplicateTodoIds.has(todo.todoId))
    .map(buildTodoTask)

  return [...interactiveTasks, ...todoTasks]
}

module.exports = {
  mergeHomeTasks
}
