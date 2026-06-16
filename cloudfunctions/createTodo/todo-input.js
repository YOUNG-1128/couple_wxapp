function normalizeText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function normalizeCreateTodoInput(event = {}, currentUserId = '') {
  const title = normalizeText(event.title, 40)

  if (!title) {
    throw new Error('title_required')
  }

  const ownerType = event.ownerType === 'couple' ? 'couple' : 'user'

  return {
    title,
    note: normalizeText(event.note, 200),
    dueDate: normalizeText(event.dueDate, 10),
    ownerType,
    ownerUserId: ownerType === 'user' ? currentUserId : ''
  }
}

module.exports = {
  normalizeCreateTodoInput
}
