const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const QUESTION_COLLECTION = 'dailyQuestions'

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
    const recordId = event && event.recordId

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    if (!recordId) {
      throw new Error('record_id_required')
    }

    const recordRes = await db.collection(QUESTION_COLLECTION).where({
      coupleId: currentUser.coupleId,
      recordId
    }).limit(1).get()
    const record = recordRes.data && recordRes.data[0]

    if (!record || !record._id) {
      throw new Error('record_not_found')
    }

    const viewed = Array.isArray(record.resultViewedUserIds) ? [...record.resultViewedUserIds] : []
    if (!viewed.includes(currentUser.userId)) {
      viewed.push(currentUser.userId)
    }

    await db.collection(QUESTION_COLLECTION).doc(record._id).update({
      data: {
        resultViewedUserIds: viewed,
        updatedAt: new Date().toISOString()
      }
    })

    return {
      success: true,
      resultViewedUserIds: viewed
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'mark_daily_question_result_viewed_failed'
    }
  }
}
