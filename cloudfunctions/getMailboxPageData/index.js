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
  return !letter.visibleAt || new Date(letter.visibleAt).getTime() <= Date.now()
}

function sanitizeLetterForUser(letter, currentUserId) {
  const lockedForUser = letter.toUserId === currentUserId
    && letter.status !== 'draft'
    && !isVisible(letter)

  if (!lockedForUser) {
    return letter
  }

  return {
    ...letter,
    title: '',
    greeting: '',
    content: '',
    signature: '',
    letterDateText: '',
    images: [],
    lockedForUser: true
  }
}

exports.main = async () => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      return {
        success: true,
        letters: []
      }
    }

    const letterRes = await db.collection(LETTER_COLLECTION).where({
      coupleId: currentUser.coupleId
    }).get()

    return {
      success: true,
      letters: (letterRes.data || []).map((letter) => sanitizeLetterForUser(letter, currentUser.userId))
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'get_mailbox_page_data_failed'
    }
  }
}
