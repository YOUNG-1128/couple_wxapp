const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const USER_COLLECTION = 'users'
const CAPSULE_COLLECTION = 'capsules'

function getHongKongDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('openid_missing')
  const result = await db.collection(USER_COLLECTION).where({ openId: OPENID }).limit(1).get()
  const user = result.data && result.data[0]
  if (!user || !user.userId) throw new Error('user_not_found')
  return user
}

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()
    const capsuleId = String((event && event.capsuleId) || '')
    if (!currentUser.coupleId) throw new Error('couple_not_bound')
    if (!capsuleId) throw new Error('capsule_id_required')

    const result = await db.collection(CAPSULE_COLLECTION).where({
      coupleId: currentUser.coupleId,
      capsuleId
    }).limit(1).get()
    const capsule = result.data && result.data[0]
    if (!capsule || !capsule._id) throw new Error('capsule_not_found')
    if (capsule.openAt > getHongKongDateKey()) throw new Error('capsule_locked')

    const now = new Date().toISOString()
    const data = {
      isOpened: true,
      status: 'opened',
      openedAt: capsule.openedAt || now,
      openedByUserId: capsule.openedByUserId || currentUser.userId
    }
    await db.collection(CAPSULE_COLLECTION).doc(capsule._id).update({ data })

    return {
      success: true,
      capsule: { ...capsule, ...data, id: capsule.capsuleId || capsule.id || capsule._id }
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'open_capsule_failed'
    }
  }
}
