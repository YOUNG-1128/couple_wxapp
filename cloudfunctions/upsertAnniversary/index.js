const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const ANNIVERSARY_COLLECTION = 'anniversaries'
const VALID_REPEAT_TYPES = ['none', 'yearly']

function createAnniversaryId() {
  return `anniversary_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    throw new Error('openid_missing')
  }

  const userRes = await db.collection(USER_COLLECTION).where({ openId: OPENID }).limit(1).get()
  const user = userRes.data && userRes.data[0]

  if (!user || !user.userId) {
    throw new Error('user_not_found')
  }

  return user
}

function validateDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(new Date(`${date}T00:00:00`).getTime())
}

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()
    const anniversaryId = String((event && event.anniversaryId) || '')
    const title = String((event && event.title) || '').trim().slice(0, 40)
    const date = String((event && event.date) || '')
    const repeatType = VALID_REPEAT_TYPES.includes(event && event.repeatType) ? event.repeatType : 'none'

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    if (!title) {
      throw new Error('title_required')
    }

    if (!validateDate(date)) {
      throw new Error('date_invalid')
    }

    const now = new Date().toISOString()
    const data = {
      coupleId: currentUser.coupleId,
      title,
      date,
      type: String((event && event.type) || '自定义').slice(0, 20),
      repeatType,
      note: String((event && event.note) || '').slice(0, 200),
      coverImage: String((event && event.coverImage) || ''),
      updatedByUserId: currentUser.userId,
      updatedAt: now
    }

    if (anniversaryId) {
      const existingRes = await db.collection(ANNIVERSARY_COLLECTION).where({
        coupleId: currentUser.coupleId,
        anniversaryId
      }).limit(1).get()
      const existing = existingRes.data && existingRes.data[0]

      if (!existing || !existing._id) {
        throw new Error('anniversary_not_found')
      }

      await db.collection(ANNIVERSARY_COLLECTION).doc(existing._id).update({ data })

      return {
        success: true,
        anniversary: {
          ...existing,
          ...data,
          id: anniversaryId,
          anniversaryId
        }
      }
    }

    const newId = createAnniversaryId()
    const anniversary = {
      id: newId,
      anniversaryId: newId,
      createdByUserId: currentUser.userId,
      createdAt: now,
      ...data
    }
    await db.collection(ANNIVERSARY_COLLECTION).add({ data: anniversary })

    return {
      success: true,
      anniversary
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'save_anniversary_failed'
    }
  }
}
