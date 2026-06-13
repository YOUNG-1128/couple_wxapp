function buildLinkedPostUrl(postId) {
  const value = String(postId || '').trim()

  if (!value) {
    return ''
  }

  return `/pages/album/album?postId=${encodeURIComponent(value)}`
}

module.exports = {
  buildLinkedPostUrl
}
