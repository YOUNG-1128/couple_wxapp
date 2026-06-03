const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const FOOTPRINT_COLLECTION = 'footprints'

function createFootprintId() {
  return `fp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
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

    const city = event && event.city ? event.city : null

    if (!city || !city.name) {
      throw new Error('city_required')
    }

    const now = new Date().toISOString()
    const footprint = {
      footprintId: createFootprintId(),
      coupleId: currentUser.coupleId,
      sourceType: 'manual',
      sourceId: '',
      title: event && event.title ? event.title : '',
      city: {
        code: city.code || '',
        name: city.name || '',
        province: city.province || '',
        country: city.country || '中国',
        latitude: typeof city.latitude === 'number' ? city.latitude : null,
        longitude: typeof city.longitude === 'number' ? city.longitude : null,
        source: city.source || 'manual'
      },
      placeName: event && event.placeName ? event.placeName : '',
      address: event && event.address ? event.address : '',
      date: event && event.date ? event.date : '',
      note: event && event.note ? event.note : '',
      images: event && Array.isArray(event.images) ? event.images : [],
      createdAt: now,
      updatedAt: now
    }

    await db.collection(FOOTPRINT_COLLECTION).add({
      data: footprint
    })

    return {
      success: true,
      footprint
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'create_footprint_manual_failed'
    }
  }
}
