const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const USER_COLLECTION = 'users'
const MISS_SIGNAL_COLLECTION = 'missSignals'

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

    if (!currentUser.coupleId) {
      return {
        success: true,
        updatedCount: 0
      }
    }

    const signalId = event && event.signalId ? event.signalId : ''
    const now = new Date().toISOString()
    const query = {
      coupleId: currentUser.coupleId,
      receiverUserId: currentUser.userId,
      readStatus: 'unread'
    }

    if (signalId) {
      query.signalId = signalId
    }

    const updateRes = await db.collection(MISS_SIGNAL_COLLECTION).where(query).update({
      data: {
        readStatus: 'read',
        readAt: now,
        updatedAt: now
      }
    })

    return {
      success: true,
      updatedCount: updateRes.stats ? updateRes.stats.updated : 0
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'mark_miss_signal_as_read_failed'
    }
  }
}
