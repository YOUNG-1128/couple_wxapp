const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const LETTER_COLLECTION = 'letters'

function createLetterId() {
  return `letter_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
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
  const coupleRes = await db.collection('couples').where({
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

  const partnerRes = await db.collection(USER_COLLECTION).where({
    userId: partnerUserId
  }).limit(1).get()
  const partnerUser = partnerRes.data && partnerRes.data[0]

  if (!partnerUser || !partnerUser.userId) {
    throw new Error('partner_user_not_found')
  }

  return partnerUser
}

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const partnerUser = await getPartnerUser(currentUser.coupleId, currentUser.userId)
    const now = new Date().toISOString()
    const data = {
      coupleId: currentUser.coupleId,
      fromUserId: currentUser.userId,
      fromUserName: currentUser.nickName || '我',
      toUserId: partnerUser.userId,
      title: event && event.title ? event.title : '',
      greeting: event && event.greeting ? event.greeting : '',
      content: event && event.content ? event.content : '',
      signature: event && event.signature ? event.signature : '',
      letterDateText: event && event.letterDateText ? event.letterDateText : '',
      images: event && Array.isArray(event.images) ? event.images : [],
      status: 'sent',
      sendMode: 'now',
      updatedAt: now,
      sentAt: now,
      visibleAt: now,
      openedAt: null,
      readAt: null,
      readByUserId: null,
      noticeStatus: event && event.notice && event.notice.noticeStatus ? event.notice.noticeStatus : 'idle',
      noticeRequestedAt: event && event.notice ? (event.notice.noticeRequestedAt || null) : null,
      noticeSentAt: null,
      noticeMsgId: '',
      noticeError: ''
    }

    const editingLetterId = event && event.editingLetterId ? event.editingLetterId : ''

    if (editingLetterId) {
      const existingRes = await db.collection(LETTER_COLLECTION).where({
        letterId: editingLetterId,
        coupleId: currentUser.coupleId,
        fromUserId: currentUser.userId
      }).limit(1).get()
      const existing = existingRes.data && existingRes.data[0]

      if (existing && existing._id) {
        await db.collection(LETTER_COLLECTION).doc(existing._id).update({
          data
        })

        return {
          success: true,
          letter: {
            ...existing,
            ...data,
            letterId: existing.letterId
          }
        }
      }
    }

    const letter = {
      letterId: createLetterId(),
      createdAt: now,
      ...data
    }
    await db.collection(LETTER_COLLECTION).add({
      data: letter
    })

    return {
      success: true,
      letter
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'send_letter_now_failed'
    }
  }
}
