const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const POST_COLLECTION = 'posts'

function createCommentId() {
  return `comment_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    throw new Error('openid_missing')
  }

  const userRes = await db.collection(USER_COLLECTION).where({
    openId: OPENID
  }).limit(1).get()
  const user = userRes.data && userRes.data[0]

  if (!user || !user.userId) {
    throw new Error('user_not_found')
  }

  return user
}

exports.main = async (event) => {
  const postId = event && event.postId ? event.postId : ''
  const content = String((event && event.content) || '').trim()

  if (!postId) {
    return {
      success: false,
      errorMessage: 'post_id_required'
    }
  }

  if (!content) {
    return {
      success: false,
      errorMessage: 'comment_content_required'
    }
  }

  try {
    const currentUser = await getCurrentUser()
    const postRes = await db.collection(POST_COLLECTION).where({
      postId,
      coupleId: currentUser.coupleId,
      status: 'published'
    }).limit(1).get()
    const post = postRes.data && postRes.data[0]

    if (!post || !post._id) {
      return {
        success: false,
        errorMessage: 'post_not_found'
      }
    }

    const now = new Date().toISOString()
    const comment = {
      commentId: createCommentId(),
      postId,
      userId: currentUser.userId,
      userName: currentUser.nickName || '我',
      userAvatar: currentUser.avatarUrl || '',
      content,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'cloud'
    }

    const comments = Array.isArray(post.comments) ? post.comments.slice() : []
    comments.push(comment)

    await db.collection(POST_COLLECTION).doc(post._id).update({
      data: {
        comments,
        updatedAt: now
      }
    })

    return {
      success: true,
      post: {
        ...post,
        comments,
        updatedAt: now
      }
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'add_post_comment_failed'
    }
  }
}
