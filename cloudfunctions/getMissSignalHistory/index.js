const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
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

exports.main = async () => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      return {
        success: true,
        records: []
      }
    }

    const signalRes = await db.collection(MISS_SIGNAL_COLLECTION).where({
      coupleId: currentUser.coupleId
    }).get()

    return {
      success: true,
      records: signalRes.data || []
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'get_miss_signal_history_failed'
    }
  }
}
