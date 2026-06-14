const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const COUPLE_COLLECTION = 'couples'

function isValidDateKey(dateKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''))

  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  const today = new Date(Date.now() + (8 * 60 * 60 * 1000))
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getTime() <= todayUtc
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const relationshipStartDate = String((event && event.relationshipStartDate) || '')

  if (!OPENID) {
    return {
      success: false,
      errorMessage: 'openid_missing'
    }
  }

  if (!isValidDateKey(relationshipStartDate)) {
    return {
      success: false,
      errorMessage: 'relationship_start_date_invalid'
    }
  }

  try {
    const userRes = await db.collection(USER_COLLECTION).where({
      openId: OPENID
    }).limit(1).get()
    const currentUser = userRes.data && userRes.data[0]

    if (!currentUser || !currentUser.userId || !currentUser.coupleId) {
      return {
        success: false,
        errorMessage: 'couple_not_bound'
      }
    }

    const coupleRes = await db.collection(COUPLE_COLLECTION).where({
      coupleId: currentUser.coupleId,
      status: 'bound'
    }).limit(1).get()
    const couple = coupleRes.data && coupleRes.data[0]

    const coupleUserIds = Array.isArray(couple && couple.userIds) ? couple.userIds : []
    const belongsToCouple = couple && (
      couple.ownerUserId === currentUser.userId
      || couple.partnerUserId === currentUser.userId
      || coupleUserIds.includes(currentUser.userId)
    )

    if (!couple || !couple._id || !belongsToCouple) {
      return {
        success: false,
        errorMessage: 'couple_not_found'
      }
    }

    const relationshipStartDateUpdatedAt = new Date().toISOString()

    await db.collection(COUPLE_COLLECTION).doc(couple._id).update({
      data: {
        relationshipStartDate,
        relationshipStartDateUpdatedAt,
        relationshipStartDateUpdatedBy: currentUser.userId,
        updatedAt: relationshipStartDateUpdatedAt
      }
    })

    return {
      success: true,
      coupleId: currentUser.coupleId,
      relationshipStartDate,
      relationshipStartDateUpdatedAt,
      relationshipStartDateUpdatedBy: currentUser.userId
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'relationship_start_date_update_failed'
    }
  }
}
