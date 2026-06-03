const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const LETTER_COLLECTION = 'letters'

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
  const letterId = event && event.letterId ? event.letterId : ''

  if (!letterId) {
    return {
      success: false,
      errorMessage: 'letter_id_required'
    }
  }

  try {
    const currentUser = await getCurrentUser()
    const existingRes = await db.collection(LETTER_COLLECTION).where({
      letterId,
      coupleId: currentUser.coupleId,
      fromUserId: currentUser.userId,
      status: 'draft'
    }).limit(1).get()
    const existing = existingRes.data && existingRes.data[0]

    if (!existing || !existing._id) {
      return {
        success: false,
        errorMessage: 'draft_not_found'
      }
    }

    await db.collection(LETTER_COLLECTION).doc(existing._id).remove()

    return {
      success: true
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'remove_draft_failed'
    }
  }
}
