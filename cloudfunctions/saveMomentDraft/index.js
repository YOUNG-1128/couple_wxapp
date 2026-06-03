const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const POST_COLLECTION = 'posts'

function createDraftId() {
  return `moment_draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
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

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const now = new Date().toISOString()
    const draftId = event && event.draftId ? event.draftId : createDraftId()
    const data = {
      coupleId: currentUser.coupleId,
      authorId: currentUser.userId,
      authorName: currentUser.nickName || '我',
      authorAvatar: currentUser.avatarUrl || '',
      content: event && event.content ? event.content : '',
      images: event && Array.isArray(event.images) ? event.images : [],
      location: event && event.location ? event.location : {},
      status: 'draft',
      updatedAt: now
    }

    const existingRes = await db.collection(POST_COLLECTION).where({
      draftId,
      authorId: currentUser.userId,
      status: 'draft'
    }).limit(1).get()
    const existing = existingRes.data && existingRes.data[0]

    if (existing && existing._id) {
      await db.collection(POST_COLLECTION).doc(existing._id).update({
        data
      })

      return {
        success: true,
        draft: {
          ...existing,
          ...data,
          draftId
        }
      }
    }

    const draft = {
      draftId,
      createdAt: now,
      ...data
    }

    await db.collection(POST_COLLECTION).add({
      data: draft
    })

    return {
      success: true,
      draft
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'save_moment_draft_failed'
    }
  }
}
