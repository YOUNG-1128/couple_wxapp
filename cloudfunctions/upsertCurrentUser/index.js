const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const LEGACY_USER_IDS = ['me', 'partner']

function createUserId(openId) {
  const digest = crypto.createHash('sha256').update(String(openId)).digest('hex')

  return `usr_${digest.slice(0, 24)}`
}

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
    const generatedUserId = createUserId(openId)
    const existingUserId = existing && existing.userId ? existing.userId : ''

    if (existing && existing.coupleId && LEGACY_USER_IDS.includes(existingUserId)) {
      return {
        success: false,
        errorMessage: 'legacy_identity_migration_required'
      }
    }

    const normalizedUserId = existingUserId && !LEGACY_USER_IDS.includes(existingUserId)
      ? existingUserId
      : generatedUserId
    const data = {
      userId: normalizedUserId,
      openId,
      nickName: profile.nickName || (existing && existing.nickName) || '微信用户',
      avatarUrl: profile.avatarUrl || (existing && existing.avatarUrl) || '',
      role: (existing && existing.role) || 'member',
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
        userId: data.userId,
        user: data
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
      userId: data.userId,
      user: {
        ...data,
        createdAt: now
      }
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'upsert_user_failed'
    }
  }
}
