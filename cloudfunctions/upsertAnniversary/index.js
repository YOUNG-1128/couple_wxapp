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

function normalizeBackgroundColor(color) {
  const value = String(color || '').trim()

  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value.toUpperCase() : ''
}

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()
    const anniversaryId = String((event && event.anniversaryId) || '')
    const title = String((event && event.title) || '').trim().slice(0, 40)
    const date = String((event && event.date) || '')
    const calendarType = event && event.calendarType === 'lunar' ? 'lunar' : 'solar'
    const lunarMonth = Number((event && event.lunarMonth) || 0)
    const lunarDay = Number((event && event.lunarDay) || 0)
    const repeatType = VALID_REPEAT_TYPES.includes(event && event.repeatType) ? event.repeatType : 'yearly'

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    if (!title) {
      throw new Error('title_required')
    }

    if (!validateDate(date)) {
      throw new Error('date_invalid')
    }

    if (calendarType === 'lunar' && (lunarMonth < 1 || lunarMonth > 12 || lunarDay < 1 || lunarDay > 30)) {
      throw new Error('lunar_date_invalid')
    }

    const now = new Date().toISOString()
    const data = {
      coupleId: currentUser.coupleId,
      title,
      date,
      calendarType,
      lunarMonth: calendarType === 'lunar' ? lunarMonth : 0,
      lunarDay: calendarType === 'lunar' ? lunarDay : 0,
      lunarIsLeapMonth: calendarType === 'lunar' && event && event.lunarIsLeapMonth === true,
      type: String((event && event.type) || 'custom').slice(0, 20),
      repeatType,
      note: String((event && event.note) || '').slice(0, 200),
      coverImage: String((event && event.coverImage) || ''),
      backgroundColor: normalizeBackgroundColor(event && event.backgroundColor),
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
