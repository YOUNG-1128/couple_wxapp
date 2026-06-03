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

function normalizeCity(city = {}) {
  return {
    code: city.code || '',
    name: city.name || '',
    province: city.province || '',
    country: city.country || '中国',
    latitude: typeof city.latitude === 'number' ? city.latitude : null,
    longitude: typeof city.longitude === 'number' ? city.longitude : null,
    source: city.source || 'post'
  }
}

function buildFootprintFromPost(post = {}, coupleId = '') {
  const location = post.location || {}
  const city = normalizeCity(location.city || {})
  const content = (post.content || '').trim()

  if (location.enabled !== true || post.shouldCreateFootprint !== true) {
    throw new Error('post_location_not_enabled')
  }

  if (!city.name || typeof city.latitude !== 'number' || typeof city.longitude !== 'number') {
    throw new Error('post_city_invalid')
  }

  return {
    footprintId: createFootprintId(),
    coupleId,
    sourceType: 'post',
    sourceId: post.postId || '',
    title: content ? content.slice(0, 16) : '来自朋友圈的足迹',
    city,
    placeName: location.placeName || '',
    address: location.address || '',
    date: (post.createdAt || new Date().toISOString()).slice(0, 10),
    note: content,
    images: Array.isArray(post.images) ? post.images : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const post = event && event.post ? event.post : null

    if (!post || !post.postId) {
      throw new Error('post_required')
    }

    const footprint = buildFootprintFromPost(post, currentUser.coupleId)

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
      errorMessage: (error && (error.message || error.errMsg)) || 'create_footprint_from_post_failed'
    }
  }
}
