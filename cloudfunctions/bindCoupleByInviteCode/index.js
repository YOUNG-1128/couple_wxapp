const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const USER_COLLECTION = 'users'
const COUPLE_COLLECTION = 'couples'

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const inviteCode = String((event && event.inviteCode) || '').trim().toUpperCase()

  if (!OPENID) {
    return {
      success: false,
      errorMessage: 'openid_missing'
    }
  }

  if (!inviteCode) {
    return {
      success: false,
      errorMessage: 'invite_code_required'
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
      return {
        success: false,
        errorMessage: 'current_user_already_bound'
      }
    }

    const coupleRes = await db.collection(COUPLE_COLLECTION).where({
      inviteCode,
      status: 'pending'
    }).limit(1).get()
    const couple = coupleRes.data && coupleRes.data[0]

    if (!couple || !couple._id) {
      return {
        success: false,
        errorMessage: 'invite_code_invalid'
      }
    }

    if (couple.ownerUserId === currentUser.userId) {
      return {
        success: false,
        errorMessage: 'cannot_bind_self'
      }
    }

    const ownerRes = await db.collection(USER_COLLECTION).where({
      userId: couple.ownerUserId
    }).limit(1).get()
    const ownerUser = ownerRes.data && ownerRes.data[0]

    if (!ownerUser || !ownerUser._id) {
      return {
        success: false,
        errorMessage: 'invite_owner_not_found'
      }
    }

    if (ownerUser.coupleId) {
      return {
        success: false,
        errorMessage: 'invite_owner_already_bound'
      }
    }

    const now = new Date().toISOString()

    await db.collection(COUPLE_COLLECTION).doc(couple._id).update({
      data: {
        partnerUserId: currentUser.userId,
        userIds: _.set([couple.ownerUserId, currentUser.userId]),
        status: 'bound',
        boundAt: now,
        updatedAt: now
      }
    })

    await Promise.all([
      db.collection(USER_COLLECTION).doc(ownerUser._id).update({
        data: {
          coupleId: couple.coupleId,
          inviteCodeOwned: inviteCode,
          updatedAt: now
        }
      }),
      db.collection(USER_COLLECTION).doc(currentUser._id).update({
        data: {
          coupleId: couple.coupleId,
          inviteCodeOwned: '',
          updatedAt: now
        }
      })
    ])

    return {
      success: true,
      coupleId: couple.coupleId,
      status: 'bound',
      partnerProfile: {
        userId: ownerUser.userId,
        nickName: ownerUser.nickName || 'TA',
        avatarUrl: ownerUser.avatarUrl || ''
      }
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'bind_couple_failed'
    }
  }
}
