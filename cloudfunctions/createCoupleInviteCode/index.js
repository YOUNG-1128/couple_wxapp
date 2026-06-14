const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const COUPLE_COLLECTION = 'couples'

function createInviteCodeValue() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''

  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }

  return code
}

async function generateUniqueInviteCode() {
  for (let i = 0; i < 8; i += 1) {
    const inviteCode = createInviteCodeValue()
    const existing = await db.collection(COUPLE_COLLECTION).where({
      inviteCode
    }).limit(1).get()

    if (!existing.data || existing.data.length === 0) {
      return inviteCode
    }
  }

  throw new Error('invite_code_generate_failed')
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
      const boundRes = await db.collection(COUPLE_COLLECTION).where({
        coupleId: currentUser.coupleId
      }).limit(1).get()
      const boundCouple = boundRes.data && boundRes.data[0]

      return {
        success: true,
        coupleId: currentUser.coupleId,
        inviteCode: boundCouple ? (boundCouple.inviteCode || '') : '',
        status: 'bound',
        boundAt: boundCouple ? (boundCouple.boundAt || '') : '',
        relationshipStartDate: boundCouple ? (boundCouple.relationshipStartDate || '') : '',
        relationshipStartDateUpdatedAt: boundCouple ? (boundCouple.relationshipStartDateUpdatedAt || '') : '',
        relationshipStartDateUpdatedBy: boundCouple ? (boundCouple.relationshipStartDateUpdatedBy || '') : ''
      }
    }

    const pendingRes = await db.collection(COUPLE_COLLECTION).where({
      ownerUserId: currentUser.userId,
      status: 'pending'
    }).limit(1).get()
    const existingPending = pendingRes.data && pendingRes.data[0]

    if (existingPending && existingPending._id) {
      await db.collection(USER_COLLECTION).doc(currentUser._id).update({
        data: {
          inviteCodeOwned: existingPending.inviteCode,
          updatedAt: new Date().toISOString()
        }
      })

      return {
        success: true,
        coupleId: existingPending.coupleId,
        inviteCode: existingPending.inviteCode,
        status: 'pending'
      }
    }

    const now = new Date().toISOString()
    const coupleId = `couple_${Date.now()}`
    const inviteCode = await generateUniqueInviteCode()

    await db.collection(COUPLE_COLLECTION).add({
      data: {
        coupleId,
        inviteCode,
        ownerUserId: currentUser.userId,
        partnerUserId: '',
        userIds: [currentUser.userId],
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        boundAt: '',
        relationshipStartDate: '',
        relationshipStartDateUpdatedAt: '',
        relationshipStartDateUpdatedBy: ''
      }
    })

    await db.collection(USER_COLLECTION).doc(currentUser._id).update({
      data: {
        inviteCodeOwned: inviteCode,
        updatedAt: now
      }
    })

    return {
      success: true,
      coupleId,
      inviteCode,
      status: 'pending'
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'create_invite_failed'
    }
  }
}
