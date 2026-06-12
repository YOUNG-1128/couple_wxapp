const cloud = require('wx-server-sdk')
const { normalizeBucketItemInput } = require('./bucket-list-record')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const BUCKET_LIST_COLLECTION = 'bucketListItems'

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
    const input = normalizeBucketItemInput(event)

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const now = new Date().toISOString()
    const existingRes = await db.collection(BUCKET_LIST_COLLECTION).where({
      coupleId: currentUser.coupleId,
      itemId: input.itemId
    }).limit(1).get()
    const existing = existingRes.data && existingRes.data[0]
    const data = {
      coupleId: currentUser.coupleId,
      itemId: input.itemId,
      title: input.title,
      completed: input.completed,
      completedAt: input.completed ? now : null,
      completedByUserId: input.completed ? currentUser.userId : '',
      updatedByUserId: currentUser.userId,
      updatedAt: now
    }

    if (existing && existing._id) {
      await db.collection(BUCKET_LIST_COLLECTION).doc(existing._id).update({ data })

      return {
        success: true,
        progressRecord: {
          ...existing,
          ...data
        }
      }
    }

    const progressRecord = {
      ...data,
      createdAt: now
    }
    await db.collection(BUCKET_LIST_COLLECTION).add({ data: progressRecord })

    return {
      success: true,
      progressRecord
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'toggle_bucket_list_item_failed'
    }
  }
}
