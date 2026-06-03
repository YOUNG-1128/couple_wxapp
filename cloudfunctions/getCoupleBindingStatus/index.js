const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const COUPLE_COLLECTION = 'couples'

function buildPartnerProfile(currentUserId, ownerUser, partnerUser) {
  if (partnerUser && partnerUser.userId && partnerUser.userId !== currentUserId) {
    return {
      userId: partnerUser.userId,
      nickName: partnerUser.nickName || 'TA',
      avatarUrl: partnerUser.avatarUrl || ''
    }
  }

  if (ownerUser && ownerUser.userId && ownerUser.userId !== currentUserId) {
    return {
      userId: ownerUser.userId,
      nickName: ownerUser.nickName || 'TA',
      avatarUrl: ownerUser.avatarUrl || ''
    }
  }

  return null
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    return {
      success: false,
      errorMessage: 'openid_missing'
    }
  }

  try {
    const userRes = await db.collection(USER_COLLECTION).where({
      openId: OPENID
    }).limit(1).get()
    const currentUser = userRes.data && userRes.data[0]

    if (!currentUser || !currentUser._id) {
      return {
        success: false,
        errorMessage: 'user_not_found'
      }
    }

    if (currentUser.coupleId) {
      const coupleRes = await db.collection(COUPLE_COLLECTION).where({
        coupleId: currentUser.coupleId
      }).limit(1).get()
      const couple = coupleRes.data && coupleRes.data[0]

      if (!couple) {
        return {
          success: true,
          status: 'unbound',
          coupleId: '',
          inviteCode: ''
        }
      }

      const [ownerRes, partnerRes] = await Promise.all([
        db.collection(USER_COLLECTION).where({ userId: couple.ownerUserId }).limit(1).get(),
        couple.partnerUserId
          ? db.collection(USER_COLLECTION).where({ userId: couple.partnerUserId }).limit(1).get()
          : Promise.resolve({ data: [] })
      ])

      return {
        success: true,
        status: couple.status || 'bound',
        coupleId: couple.coupleId || '',
        inviteCode: couple.status === 'pending' ? (couple.inviteCode || '') : '',
        partnerProfile: buildPartnerProfile(
          currentUser.userId,
          ownerRes.data && ownerRes.data[0],
          partnerRes.data && partnerRes.data[0]
        )
      }
    }

    const pendingRes = await db.collection(COUPLE_COLLECTION).where({
      ownerUserId: currentUser.userId,
      status: 'pending'
    }).limit(1).get()
    const pending = pendingRes.data && pendingRes.data[0]

    if (pending) {
      return {
        success: true,
        status: 'pending',
        coupleId: pending.coupleId || '',
        inviteCode: pending.inviteCode || ''
      }
    }

    return {
      success: true,
      status: 'unbound',
      coupleId: '',
      inviteCode: ''
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'binding_status_failed'
    }
  }
}
