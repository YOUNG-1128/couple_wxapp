const cloud = require('wx-server-sdk')
const { normalizeManualFootprintInput } = require('./footprint-management')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const FOOTPRINT_COLLECTION = 'footprints'

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
    const payload = normalizeManualFootprintInput(event)

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const footprintRes = await db.collection(FOOTPRINT_COLLECTION).where({
      coupleId: currentUser.coupleId,
      footprintId: payload.footprintId,
      sourceType: 'manual'
    }).limit(1).get()
    const footprint = footprintRes.data && footprintRes.data[0]

    if (!footprint || !footprint._id) {
      throw new Error('manual_footprint_not_found')
    }

    const updatedAt = new Date().toISOString()
    const data = {
      title: payload.title,
      city: payload.city,
      placeName: payload.placeName,
      address: payload.address,
      date: payload.date,
      note: payload.note,
      images: payload.images,
      updatedAt
    }

    await db.collection(FOOTPRINT_COLLECTION).doc(footprint._id).update({ data })

    return {
      success: true,
      footprint: {
        ...footprint,
        ...data
      }
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'update_footprint_manual_failed'
    }
  }
}
