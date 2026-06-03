const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const COUPLE_COLLECTION = 'couples'
const MISS_SIGNAL_COLLECTION = 'missSignals'

function createSignalId() {
  return `miss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

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

async function getPartnerUser(coupleId, currentUserId) {
  const coupleRes = await db.collection(COUPLE_COLLECTION).where({
    coupleId
  }).limit(1).get()
  const couple = coupleRes.data && coupleRes.data[0]

  if (!couple) {
    throw new Error('couple_not_found')
  }

  const partnerUserId = [couple.ownerUserId, couple.partnerUserId]
    .find((item) => item && item !== currentUserId)
    || (Array.isArray(couple.userIds) ? couple.userIds.find((item) => item && item !== currentUserId) : '')

  if (!partnerUserId) {
    throw new Error('partner_user_not_found')
  }

  return partnerUserId
}

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const partnerUserId = await getPartnerUser(currentUser.coupleId, currentUser.userId)
    const createdAt = new Date().toISOString()
    const record = {
      signalId: createSignalId(),
      coupleId: currentUser.coupleId,
      senderUserId: currentUser.userId,
      receiverUserId: partnerUserId,
      message: event && event.message ? event.message : '我想你了',
      readStatus: 'unread',
      source: event && event.source ? event.source : 'home-quick-heart',
      createdAt,
      updatedAt: createdAt
    }

    await db.collection(MISS_SIGNAL_COLLECTION).add({
      data: record
    })

    return {
      success: true,
      record
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'send_miss_signal_failed'
    }
  }
}
