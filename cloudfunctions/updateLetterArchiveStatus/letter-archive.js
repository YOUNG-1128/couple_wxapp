function normalizeArchiveInput(event = {}) {
  const letterId = String(event.letterId || '').trim()

  if (!letterId) {
    throw new Error('letter_id_required')
  }

  if (typeof event.archived !== 'boolean') {
    throw new Error('archive_status_required')
  }

  return {
    letterId,
    archived: event.archived
  }
}

function updateArchivedUserIds(userIds = [], userId, archived) {
  const next = Array.isArray(userIds) ? userIds.slice() : []
  const index = next.indexOf(userId)

  if (archived && index < 0) {
    next.push(userId)
  }

  if (!archived && index >= 0) {
    next.splice(index, 1)
  }

  return next
}

module.exports = {
  normalizeArchiveInput,
  updateArchivedUserIds
}
