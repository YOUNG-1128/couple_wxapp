const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID
  const profile = event && event.profile ? event.profile : {}

  if (!openId) {
    return {
      success: false,
      errorMessage: 'openid_missing'
    }
  }

  try {
    const userRes = await db.collection(USER_COLLECTION).where({
      openId
    }).limit(1).get()

    const existing = userRes.data && userRes.data[0]
    const now = new Date().toISOString()
    const normalizedUserId = profile.userId || `user_${String(openId).slice(-8)}`
    const data = {
      userId: existing ? (existing.userId || normalizedUserId) : normalizedUserId,
      openId,
      nickName: profile.nickName || (existing && existing.nickName) || '微信用户',
      avatarUrl: profile.avatarUrl || (existing && existing.avatarUrl) || '',
      role: profile.role || (existing && existing.role) || 'member',
      coupleId: existing && existing.coupleId ? existing.coupleId : '',
      updatedAt: now
    }

    if (existing && existing._id) {
      await db.collection(USER_COLLECTION).doc(existing._id).update({
        data
      })

      return {
        success: true,
        recordId: existing._id,
        userId: data.userId
      }
    }

    const addRes = await db.collection(USER_COLLECTION).add({
      data: {
        ...data,
        createdAt: now
      }
    })

    return {
      success: true,
      recordId: addRes._id,
      userId: data.userId
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'upsert_user_failed'
    }
  }
}
