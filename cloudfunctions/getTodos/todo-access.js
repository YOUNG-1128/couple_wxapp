function canAccessTodo(todo = {}, currentUserId = '') {
  return todo.ownerType === 'couple' || todo.ownerUserId === currentUserId
}

module.exports = {
  canAccessTodo
}
