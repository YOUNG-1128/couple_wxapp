const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const POST_COLLECTION = 'posts'
const FOOTPRINT_COLLECTION = 'footprints'

function createPostId() {
  return `post_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

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
    return null
  }

  if (!city.name || typeof city.latitude !== 'number' || typeof city.longitude !== 'number') {
    return null
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

async function createLinkedFootprint(post, currentUser) {
  const footprint = buildFootprintFromPost(post, currentUser.coupleId)

  if (!footprint) {
    return null
  }

  await db.collection(FOOTPRINT_COLLECTION).add({
    data: footprint
  })

  return footprint
}

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const now = new Date().toISOString()
    const draftId = event && event.draftId ? event.draftId : ''
    const data = {
      coupleId: currentUser.coupleId,
      authorId: currentUser.userId,
      authorName: currentUser.nickName || '我',
      authorAvatar: currentUser.avatarUrl || '',
      content: event && event.content ? event.content : '',
      images: event && Array.isArray(event.images) ? event.images : [],
      location: event && event.location ? event.location : {},
      linkedFootprintId: event && Object.prototype.hasOwnProperty.call(event, 'linkedFootprintId') ? event.linkedFootprintId : null,
      shouldCreateFootprint: event && event.shouldCreateFootprint === true,
      comments: [],
      status: 'published',
      updatedAt: now
    }

    if (draftId) {
      const draftRes = await db.collection(POST_COLLECTION).where({
        draftId,
        authorId: currentUser.userId,
        status: 'draft'
      }).limit(1).get()
      const draft = draftRes.data && draftRes.data[0]

      if (draft && draft._id) {
        const postId = draft.postId || draft.draftId || createPostId()
        const nextPost = {
          ...draft,
          ...data,
          postId,
          createdAt: draft.createdAt || now
        }
        const linkedFootprint = await createLinkedFootprint(nextPost, currentUser)

        if (linkedFootprint) {
          nextPost.linkedFootprintId = linkedFootprint.footprintId
        }

        await db.collection(POST_COLLECTION).doc(draft._id).update({
          data: {
            ...nextPost
          }
        })

        return {
          success: true,
          post: nextPost,
          footprint: linkedFootprint
        }
      }
    }

    const post = {
      postId: createPostId(),
      createdAt: now,
      ...data
    }

    const linkedFootprint = await createLinkedFootprint(post, currentUser)

    if (linkedFootprint) {
      post.linkedFootprintId = linkedFootprint.footprintId
    }

    await db.collection(POST_COLLECTION).add({
      data: post
    })

    return {
      success: true,
      post,
      footprint: linkedFootprint
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'publish_post_failed'
    }
  }
}
