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
    const letterRes = await db.collection(LETTER_COLLECTION).where({
      letterId,
      coupleId: currentUser.coupleId,
      fromUserId: currentUser.userId
    }).limit(1).get()
    const letter = letterRes.data && letterRes.data[0]

    if (!letter || !letter._id) {
      return {
        success: false,
        errorMessage: 'letter_not_found'
      }
    }

    await db.collection(LETTER_COLLECTION).doc(letter._id).update({
      data: {
        noticeStatus: event && event.noticeStatus ? event.noticeStatus : (letter.noticeStatus || 'idle'),
        noticeRequestedAt: event && Object.prototype.hasOwnProperty.call(event, 'noticeRequestedAt')
          ? event.noticeRequestedAt
          : (letter.noticeRequestedAt || null),
        noticeSentAt: event && Object.prototype.hasOwnProperty.call(event, 'noticeSentAt')
          ? event.noticeSentAt
          : (letter.noticeSentAt || null),
        noticeMsgId: event && Object.prototype.hasOwnProperty.call(event, 'noticeMsgId')
          ? event.noticeMsgId
          : (letter.noticeMsgId || ''),
        noticeError: event && Object.prototype.hasOwnProperty.call(event, 'noticeError')
          ? event.noticeError
          : (letter.noticeError || ''),
        updatedAt: new Date().toISOString()
      }
    })

    return {
      success: true
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'update_letter_notice_failed'
    }
  }
}
