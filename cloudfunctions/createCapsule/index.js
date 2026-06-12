const cloud = require('wx-server-sdk')
const { normalizeCapsuleInput, redactLockedCapsule } = require('./capsule-record')

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
    if (!currentUser.coupleId) throw new Error('couple_not_bound')

    const today = getHongKongDateKey()
    const input = normalizeCapsuleInput(event, today)
    const now = new Date().toISOString()
    const capsuleId = `capsule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    const capsule = {
      id: capsuleId,
      capsuleId,
      coupleId: currentUser.coupleId,
      ownerUserId: currentUser.userId,
      ...input,
      isOpened: false,
      status: input.openAt <= today ? 'available' : 'locked',
      createdAt: today,
      createdAtIso: now,
      openedAt: null,
      openedByUserId: ''
    }
    await db.collection(CAPSULE_COLLECTION).add({ data: capsule })

    return {
      success: true,
      capsule: redactLockedCapsule(capsule)
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'create_capsule_failed'
    }
  }
}
