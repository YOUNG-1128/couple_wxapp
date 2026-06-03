const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const QUESTION_COLLECTION = 'dailyQuestions'

function toDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

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

exports.main = async () => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const today = toDateKey(new Date())
    const recordRes = await db.collection(QUESTION_COLLECTION).where({
      coupleId: currentUser.coupleId
    }).get()

    const records = (recordRes.data || [])
      .filter((item) => item.date !== today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return {
      success: true,
      records: records.map((record) => ({
        ...record,
        answers: Array.isArray(record.answers) ? record.answers : [],
        analysisResult: record.analysisResult || null,
        questionCategory: record.questionCategory || 'daily',
        questionMood: record.questionMood || 'gentle',
        questionSource: record.questionSource || 'pool',
        questionReason: record.questionReason || '',
        resultViewedUserIds: Array.isArray(record.resultViewedUserIds) ? record.resultViewedUserIds : [],
        analysisProvider: record.analysisProvider || '',
        analysisVersion: record.analysisVersion || ''
      }))
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'get_daily_question_history_failed'
    }
  }
}
