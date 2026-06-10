const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const LETTER_COLLECTION = 'letters'

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

function isVisible(letter) {
  if (!letter || !letter.visibleAt) {
    return true
  }

  return new Date(letter.visibleAt).getTime() <= Date.now()
}

function sanitizeLetterForUser(letter, currentUserId) {
  if (letter.toUserId !== currentUserId || isVisible(letter)) {
    return letter
  }

  return {
    ...letter,
    title: '',
    content: '',
    images: [],
    lockedForUser: true
  }
}

exports.main = async (event) => {
  const letterId = event && event.letterId ? event.letterId : ''

  if (!letterId) {
    return {
      success: false,
      errorMessage: 'letter_id_required'
    }
  }

  try {
    const currentUser = await getCurrentUser()
    const letterRes = await db.collection(LETTER_COLLECTION).where({
      letterId,
      coupleId: currentUser.coupleId
    }).limit(1).get()
    const letter = letterRes.data && letterRes.data[0]

    if (!letter || !letter._id) {
      return {
        success: false,
        errorMessage: 'letter_not_found'
      }
    }

    if (letter.toUserId === currentUser.userId && isVisible(letter) && !letter.readAt) {
      const now = new Date().toISOString()
      await db.collection(LETTER_COLLECTION).doc(letter._id).update({
        data: {
          readAt: now,
          readByUserId: currentUser.userId,
          openedAt: now,
          updatedAt: now
        }
      })

      return {
        success: true,
        letter: {
          ...letter,
          readAt: now,
          readByUserId: currentUser.userId,
          openedAt: now,
          updatedAt: now
        }
      }
    }

    return {
      success: true,
      letter: sanitizeLetterForUser(letter, currentUser.userId)
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'get_letter_detail_failed'
    }
  }
}
