const cloud = require('wx-server-sdk')

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

exports.main = async (event) => {
  const draftId = event && event.draftId ? event.draftId : ''

  if (!draftId) {
    return {
      success: false,
      errorMessage: 'draft_id_required'
    }
  }

  try {
    const currentUser = await getCurrentUser()
    const draftRes = await db.collection(POST_COLLECTION).where({
      draftId,
      authorId: currentUser.userId,
      status: 'draft'
    }).limit(1).get()
    const draft = draftRes.data && draftRes.data[0]

    return {
      success: true,
      draft: draft || null
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'get_moment_draft_failed'
    }
  }
}
