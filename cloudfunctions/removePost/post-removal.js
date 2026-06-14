function normalizePostId(event = {}) {
  const postId = String(event.postId || '').trim()

  if (!postId) {
    throw new Error('post_id_required')
  }

  return postId.slice(0, 100)
}

module.exports = {
  normalizePostId
}
