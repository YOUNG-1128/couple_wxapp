const cloud = require('wx-server-sdk')
const {
  normalizeCommentRemovalInput,
  canRemoveComment
} = require('./comment-removal')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    throw new Error('openid_missing')
  }

  const userRes = await db.collection('users').where({ openId: OPENID }).limit(1).get()
  const user = userRes.data && userRes.data[0]

  if (!user || !user.userId) {
    throw new Error('user_not_found')
  }

  return user
}

exports.main = async (event) => {
  try {
    const { postId, commentId } = normalizeCommentRemovalInput(event)
    const currentUser = await getCurrentUser()
    const postRes = await db.collection('posts').where({
      postId,
      coupleId: currentUser.coupleId,
      status: 'published'
    }).limit(1).get()
    const post = postRes.data && postRes.data[0]

    if (!post || !post._id) {
      throw new Error('post_not_found')
    }

    const comments = Array.isArray(post.comments) ? post.comments.slice() : []
    const index = comments.findIndex((comment) => comment.commentId === commentId)
    const comment = comments[index]

    if (index < 0 || !comment) {
      throw new Error('comment_not_found')
    }

    if (!canRemoveComment(post, comment, currentUser.userId)) {
      throw new Error('comment_remove_forbidden')
    }

    comments.splice(index, 1)
    const updatedAt = new Date().toISOString()

    await db.collection('posts').doc(post._id).update({
      data: {
        comments,
        updatedAt
      }
    })

    return {
      success: true,
      post: {
        ...post,
        comments,
        updatedAt
      }
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'remove_post_comment_failed'
    }
  }
}
