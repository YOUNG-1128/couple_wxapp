const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const FOOTPRINT_COLLECTION = 'footprints'
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

exports.main = async () => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      return {
        success: true,
        footprints: [],
        posts: []
      }
    }

    const [footprintRes, postRes] = await Promise.all([
      db.collection(FOOTPRINT_COLLECTION).where({
        coupleId: currentUser.coupleId
      }).get(),
      db.collection(POST_COLLECTION).where({
        coupleId: currentUser.coupleId,
        status: 'published'
      }).get()
    ])

    return {
      success: true,
      footprints: footprintRes.data || [],
      posts: postRes.data || []
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'get_footprint_page_data_failed'
    }
  }
}
