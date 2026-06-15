const cloud = require('wx-server-sdk')
const {
  normalizeArchiveInput,
  updateArchivedUserIds
} = require('./letter-archive')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    throw new Error('openid_missing')
  }

  const userRes = await db.collection('users').where({ openId: OPENID }).limit(1).get()
  const user = userRes.data && userRes.data[0]

  if (!user || !user.userId) {
    throw new Error('user_not_found')
  }

  return user
}

exports.main = async (event) => {
  try {
    const { letterId, archived } = normalizeArchiveInput(event)
    const currentUser = await getCurrentUser()
    const letterRes = await db.collection('letters').where({
      letterId,
      coupleId: currentUser.coupleId
    }).limit(1).get()
    const letter = letterRes.data && letterRes.data[0]

    if (
      !letter
      || !letter._id
      || letter.status === 'draft'
      || (letter.fromUserId !== currentUser.userId && letter.toUserId !== currentUser.userId)
    ) {
      throw new Error('letter_not_found_or_forbidden')
    }

    const archivedByUserIds = updateArchivedUserIds(letter.archivedByUserIds, currentUser.userId, archived)
    const updatedAt = new Date().toISOString()

    await db.collection('letters').doc(letter._id).update({
      data: {
        archivedByUserIds,
        updatedAt
      }
    })

    return {
      success: true,
      letter: {
        ...letter,
        archivedByUserIds,
        updatedAt
      }
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'update_letter_archive_failed'
    }
  }
}
