const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const LETTER_COLLECTION = 'letters'
const BATCH_SIZE = 100

async function claimAndDeliver(letter, now) {
  if (!letter || !letter._id) {
    return false
  }

  const claimRes = await db.collection(LETTER_COLLECTION).where({
    _id: letter._id,
    status: 'scheduled',
    visibleAt: _.lte(now)
  }).update({
    data: {
      status: 'delivered',
      deliveredAt: now,
      deliveryClaimedAt: now,
      updatedAt: now
    }
  })

  return Boolean(claimRes && claimRes.stats && claimRes.stats.updated > 0)
}

exports.main = async () => {
  const now = new Date().toISOString()

  try {
    const dueRes = await db.collection(LETTER_COLLECTION).where({
      status: 'scheduled',
      visibleAt: _.lte(now)
    }).limit(BATCH_SIZE).get()
    const dueLetters = dueRes.data || []
    const results = await Promise.all(dueLetters.map((letter) => claimAndDeliver(letter, now)))
    const deliveredCount = results.filter(Boolean).length

    return {
      success: true,
      checkedCount: dueLetters.length,
      deliveredCount,
      processedAt: now,
      hasMore: dueLetters.length === BATCH_SIZE
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'process_scheduled_letters_failed',
      processedAt: now
    }
  }
}
