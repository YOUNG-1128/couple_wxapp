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

function prepareCapsule(capsule, today) {
  const status = capsule.isOpened ? 'opened' : (capsule.openAt <= today ? 'available' : 'locked')
  return status !== 'opened'
    ? { ...capsule, status, content: '', contentLocked: true }
    : { ...capsule, status, contentLocked: false }
}

exports.main = async () => {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser.coupleId) throw new Error('couple_not_bound')

    const result = await db.collection(CAPSULE_COLLECTION)
      .where({ coupleId: currentUser.coupleId })
      .orderBy('createdAtIso', 'desc')
      .limit(100)
      .get()
    const today = getHongKongDateKey()

    return {
      success: true,
      capsules: (result.data || []).map((capsule) => prepareCapsule(capsule, today))
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'get_capsules_failed'
    }
  }
}
