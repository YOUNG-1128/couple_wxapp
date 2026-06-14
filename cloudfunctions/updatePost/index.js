const cloud = require('wx-server-sdk')
const { normalizeUpdatePayload } = require('./post-update')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const POST_COLLECTION = 'posts'
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

function buildFootprintData(post, coupleId) {
  const location = post.location || {}
  const city = location.city || {}

  if (
    location.enabled !== true
    || post.shouldCreateFootprint !== true
    || !city.name
    || typeof city.latitude !== 'number'
    || typeof city.longitude !== 'number'
  ) {
    return null
  }

  return {
    coupleId,
    sourceType: 'post',
    sourceId: post.postId,
    title: post.content ? post.content.slice(0, 16) : '来自朋友圈的足迹',
    city,
    placeName: location.placeName || '',
    address: location.address || '',
    date: String(post.createdAt || new Date().toISOString()).slice(0, 10),
    note: post.content || '',
    images: post.images || [],
    updatedAt: new Date().toISOString()
  }
}

async function syncLinkedFootprint(post, currentUser) {
  const footprintRes = await db.collection(FOOTPRINT_COLLECTION).where({
    coupleId: currentUser.coupleId,
    sourceType: 'post',
    sourceId: post.postId
  }).limit(1).get()
  const existing = footprintRes.data && footprintRes.data[0]
  const data = buildFootprintData(post, currentUser.coupleId)

  if (!data) {
    if (existing && existing._id) {
      await db.collection(FOOTPRINT_COLLECTION).doc(existing._id).remove()
    }
    return null
  }

  if (existing && existing._id) {
    await db.collection(FOOTPRINT_COLLECTION).doc(existing._id).update({ data })
    return {
      ...existing,
      ...data
    }
  }

  const footprint = {
    footprintId: createFootprintId(),
    ...data,
    createdAt: new Date().toISOString()
  }
  await db.collection(FOOTPRINT_COLLECTION).add({ data: footprint })
  return footprint
}

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()
    const payload = normalizeUpdatePayload(event)

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const postRes = await db.collection(POST_COLLECTION).where({
      coupleId: currentUser.coupleId,
      postId: payload.postId,
      authorId: currentUser.userId,
      status: 'published'
    }).limit(1).get()
    const post = postRes.data && postRes.data[0]

    if (!post || !post._id) {
      throw new Error('post_not_found_or_forbidden')
    }

    const updatedPost = {
      ...post,
      ...payload,
      updatedAt: new Date().toISOString()
    }
    const footprint = await syncLinkedFootprint(updatedPost, currentUser)
    updatedPost.linkedFootprintId = footprint ? footprint.footprintId : null

    await db.collection(POST_COLLECTION).doc(post._id).update({
      data: {
        content: updatedPost.content,
        images: updatedPost.images,
        location: updatedPost.location,
        shouldCreateFootprint: updatedPost.shouldCreateFootprint,
        linkedFootprintId: updatedPost.linkedFootprintId,
        updatedAt: updatedPost.updatedAt
      }
    })

    return {
      success: true,
      post: updatedPost,
      footprint
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'update_post_failed'
    }
  }
}
