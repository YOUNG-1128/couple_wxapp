function normalizeUpdatePayload(event = {}) {
  const postId = String(event.postId || '').trim()
  const content = String(event.content || '').trim().slice(0, 500)
  const images = Array.isArray(event.images)
    ? event.images.filter((item) => typeof item === 'string' && item).slice(0, 4)
    : []

  if (!postId) {
    throw new Error('post_id_required')
  }

  if (!content && !images.length) {
    throw new Error('post_content_required')
  }

  return {
    postId: postId.slice(0, 100),
    content,
    images,
    location: event.location && typeof event.location === 'object' ? event.location : {},
    shouldCreateFootprint: event.shouldCreateFootprint === true
  }
}

module.exports = {
  normalizeUpdatePayload
}
