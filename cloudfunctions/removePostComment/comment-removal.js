function normalizeCommentRemovalInput(event = {}) {
  const postId = String(event.postId || '').trim()
  const commentId = String(event.commentId || '').trim()

  if (!postId) {
    throw new Error('post_id_required')
  }

  if (!commentId) {
    throw new Error('comment_id_required')
  }

  return { postId, commentId }
}

function canRemoveComment(post, comment, currentUserId) {
  return Boolean(
    post
    && comment
    && currentUserId
    && (post.authorId === currentUserId || comment.userId === currentUserId)
  )
}

module.exports = {
  normalizeCommentRemovalInput,
  canRemoveComment
}
