function canManageTodo(todo = {}, currentUserId = '') {
  return todo.ownerType === 'couple' || todo.ownerUserId === currentUserId
}

module.exports = {
  canManageTodo
}
