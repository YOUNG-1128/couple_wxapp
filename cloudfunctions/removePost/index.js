const cloud = require('wx-server-sdk')
const { normalizePostId } = require('./post-removal')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const POST_COLLECTION = 'posts'
const FOOTPRINT_COLLECTION = 'footprints'

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
  try {
    const currentUser = await getCurrentUser()
    const postId = normalizePostId(event)

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const postRes = await db.collection(POST_COLLECTION).where({
      coupleId: currentUser.coupleId,
      postId,
      authorId: currentUser.userId,
      status: 'published'
    }).limit(1).get()
    const post = postRes.data && postRes.data[0]

    if (!post || !post._id) {
      throw new Error('post_not_found_or_forbidden')
    }

    await db.collection(POST_COLLECTION).doc(post._id).remove()
    await db.collection(FOOTPRINT_COLLECTION).where({
      coupleId: currentUser.coupleId,
      sourceType: 'post',
      sourceId: postId
    }).remove()

    return {
      success: true,
      postId
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'remove_post_failed'
    }
  }
}
