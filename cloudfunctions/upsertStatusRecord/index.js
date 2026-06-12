const cloud = require('wx-server-sdk')
const {
  getHongKongDateKey,
  normalizeStatusPayload
} = require('./status-record')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const STATUS_COLLECTION = 'statusRecords'

function createStatusRecordId() {
  return `status_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
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

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()
    const payload = normalizeStatusPayload(event)

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const date = getHongKongDateKey()
    const now = new Date().toISOString()
    const existingRes = await db.collection(STATUS_COLLECTION).where({
      coupleId: currentUser.coupleId,
      userId: currentUser.userId,
      date
    }).limit(1).get()
    const existing = existingRes.data && existingRes.data[0]

    if (existing && existing._id) {
      const data = {
        ...payload,
        updatedAt: now
      }
      await db.collection(STATUS_COLLECTION).doc(existing._id).update({ data })

      return {
        success: true,
        statusRecord: {
          ...existing,
          ...data,
          id: existing.statusRecordId || existing.id || existing._id
        }
      }
    }

    const statusRecordId = createStatusRecordId()
    const statusRecord = {
      id: statusRecordId,
      statusRecordId,
      coupleId: currentUser.coupleId,
      userId: currentUser.userId,
      date,
      ...payload,
      createdAt: now,
      updatedAt: now
    }
    await db.collection(STATUS_COLLECTION).add({ data: statusRecord })

    return {
      success: true,
      statusRecord
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'save_status_record_failed'
    }
  }
}
