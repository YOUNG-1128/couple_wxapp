const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const ANNIVERSARY_COLLECTION = 'anniversaries'

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    throw new Error('openid_missing')
  }

  const userRes = await db.collection(USER_COLLECTION).where({ openId: OPENID }).limit(1).get()
  const user = userRes.data && userRes.data[0]

  if (!user || !user.userId) {
    throw new Error('user_not_found')
  }

  return user
}

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()
    const anniversaryId = String((event && event.anniversaryId) || '')

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    if (!anniversaryId) {
      throw new Error('anniversary_id_required')
    }

    const existingRes = await db.collection(ANNIVERSARY_COLLECTION).where({
      coupleId: currentUser.coupleId,
      anniversaryId
    }).limit(1).get()
    const existing = existingRes.data && existingRes.data[0]

    if (!existing || !existing._id) {
      throw new Error('anniversary_not_found')
    }

    await db.collection(ANNIVERSARY_COLLECTION).doc(existing._id).remove()

    return {
      success: true,
      anniversaryId
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'remove_anniversary_failed'
    }
  }
}
