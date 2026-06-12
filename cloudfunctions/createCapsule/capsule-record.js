const ALLOWED_TYPES = ['week_later', 'birthday', 'anniversary', 'custom']

function normalizeCapsuleInput(event = {}, today) {
  const title = String(event.title || '').trim().slice(0, 60)
  const content = String(event.content || '').trim().slice(0, 1000)
  const openAt = String(event.openAt || '')
  const type = ALLOWED_TYPES.includes(event.type) ? event.type : 'custom'

  if (!title) {
    throw new Error('title_required')
  }

  if (!content) {
    throw new Error('content_required')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(openAt) || Number.isNaN(new Date(`${openAt}T00:00:00`).getTime())) {
    throw new Error('open_at_invalid')
  }

  if (openAt < today) {
    throw new Error('open_at_in_past')
  }

  return { title, content, openAt, type }
}

function redactLockedCapsule(capsule) {
  if (capsule.isOpened || capsule.status === 'opened') {
    return capsule
  }

  return {
    ...capsule,
    content: '',
    contentLocked: true
  }
}

module.exports = {
  normalizeCapsuleInput,
  redactLockedCapsule
}
