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
    return ''
  }

  if (couple.ownerUserId && couple.ownerUserId !== currentUserId) {
    return couple.ownerUserId
  }

  if (couple.partnerUserId && couple.partnerUserId !== currentUserId) {
    return couple.partnerUserId
  }

  const userIds = Array.isArray(couple.userIds) ? couple.userIds : []
  return userIds.find((item) => item && item !== currentUserId) || ''
}

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const now = new Date().toISOString()
    const partnerUserId = await getPartnerUserId(currentUser.coupleId, currentUser.userId)
    const data = {
      coupleId: currentUser.coupleId,
      fromUserId: currentUser.userId,
      toUserId: partnerUserId,
      title: event && event.title ? event.title : '',
      content: event && event.content ? event.content : '',
      images: event && Array.isArray(event.images) ? event.images : [],
      status: 'draft',
      sendMode: event && event.sendMode ? event.sendMode : 'now',
      visibleAt: event && event.visibleAt ? event.visibleAt : null,
      sentAt: null,
      openedAt: null,
      readAt: null,
      readByUserId: null,
      noticeStatus: 'idle',
      noticeRequestedAt: null,
      noticeSentAt: null,
      noticeMsgId: '',
      noticeError: '',
      updatedAt: now
    }

    const editingLetterId = event && event.editingLetterId ? event.editingLetterId : ''

    if (editingLetterId) {
      const existingRes = await db.collection(LETTER_COLLECTION).where({
        letterId: editingLetterId,
        coupleId: currentUser.coupleId,
        fromUserId: currentUser.userId,
        status: 'draft'
      }).limit(1).get()
      const existing = existingRes.data && existingRes.data[0]

      if (existing && existing._id) {
        await db.collection(LETTER_COLLECTION).doc(existing._id).update({
          data
        })

        return {
          success: true,
          draft: {
            ...existing,
            ...data,
            letterId: existing.letterId
          }
        }
      }
    }

    const draft = {
      letterId: createLetterId(),
      createdAt: now,
      ...data
    }
    await db.collection(LETTER_COLLECTION).add({
      data: draft
    })

    return {
      success: true,
      draft
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'save_draft_failed'
    }
  }
}
