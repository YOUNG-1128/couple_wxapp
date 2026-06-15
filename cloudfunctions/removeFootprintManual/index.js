const cloud = require('wx-server-sdk')
const { normalizeFootprintId } = require('./footprint-management')

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
    const footprintId = normalizeFootprintId(event)

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const footprintRes = await db.collection(FOOTPRINT_COLLECTION).where({
      coupleId: currentUser.coupleId,
      footprintId,
      sourceType: 'manual'
    }).limit(1).get()
    const footprint = footprintRes.data && footprintRes.data[0]

    if (!footprint || !footprint._id) {
      throw new Error('manual_footprint_not_found')
    }

    await db.collection(FOOTPRINT_COLLECTION).doc(footprint._id).remove()

    return {
      success: true,
      footprintId
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'remove_footprint_manual_failed'
    }
  }
}
