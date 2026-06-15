const cloud = require('wx-server-sdk')
const { normalizePaginationInput } = require('./pagination')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const POST_COLLECTION = 'posts'

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

exports.main = async (event = {}) => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      return {
        success: true,
        posts: []
      }
    }

    let query = db.collection(POST_COLLECTION).where({
      coupleId: currentUser.coupleId,
      status: 'published'
    }).orderBy('createdAt', 'desc')

    if (!event.pageSize) {
      const postRes = await query.get()

      return {
        success: true,
        posts: postRes.data || []
      }
    }

    const { offset, pageSize } = normalizePaginationInput(event)
    const postRes = await query.skip(offset).limit(pageSize + 1).get()
    const posts = postRes.data || []
    const pageItems = posts.slice(0, pageSize)

    return {
      success: true,
      posts: pageItems,
      hasMore: posts.length > pageSize,
      nextOffset: offset + pageItems.length
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'get_posts_feed_failed'
    }
  }
}
