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

async function getPartnerUserId(coupleId, currentUserId) {
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

  return partnerUserId
}

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const partnerUserId = await getPartnerUserId(currentUser.coupleId, currentUser.userId)
    const now = new Date().toISOString()
    const visibleAt = event && event.visibleAt ? event.visibleAt : ''
    const visibleAtTime = new Date(visibleAt).getTime()

    if (!visibleAt || Number.isNaN(visibleAtTime)) {
      throw new Error('visible_at_invalid')
    }

    if (visibleAtTime <= Date.now()) {
      throw new Error('visible_at_must_be_future')
    }

    const data = {
      coupleId: currentUser.coupleId,
      fromUserId: currentUser.userId,
      fromUserName: currentUser.nickName || '我',
      toUserId: partnerUserId,
      title: event && event.title ? event.title : '',
      content: event && event.content ? event.content : '',
      images: event && Array.isArray(event.images) ? event.images : [],
      status: 'scheduled',
      sendMode: 'scheduled',
      updatedAt: now,
      sentAt: now,
      visibleAt,
      deliveredAt: null,
      deliveryClaimedAt: null,
      openedAt: null,
      readAt: null,
      readByUserId: null,
      noticeStatus: event && event.notice && event.notice.noticeStatus ? event.notice.noticeStatus : 'pending',
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
      errorMessage: (error && (error.message || error.errMsg)) || 'send_letter_scheduled_failed'
    }
  }
}
