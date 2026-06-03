const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const QUESTION_COLLECTION = 'dailyQuestions'
const QUESTION_POOL = [
  { questionId: 'pool-q-001', text: '今天最想和对方一起做的一件小事是什么？', category: 'daily', stage: 'general', mood: 'gentle', enabled: true },
  { questionId: 'pool-q-002', text: '最近对方做过哪件事让你觉得很温暖？', category: 'gratitude', stage: 'general', mood: 'gentle', enabled: true },
  { questionId: 'pool-q-003', text: '如果这个周末只属于你们，你最想怎么安排？', category: 'date', stage: 'general', mood: 'light', enabled: true },
  { questionId: 'pool-q-004', text: '你希望对方最近多给你哪一种陪伴？', category: 'companionship', stage: 'general', mood: 'gentle', enabled: true },
  { questionId: 'pool-q-005', text: '你觉得你们最近最值得被记录的一刻是什么？', category: 'memory', stage: 'general', mood: 'warm', enabled: true },
  { questionId: 'pool-q-006', text: '如果给今天的对方写一句话，你会写什么？', category: 'communication', stage: 'general', mood: 'gentle', enabled: true },
  { questionId: 'pool-q-007', text: '最近你最想感谢对方的一件事是什么？', category: 'gratitude', stage: 'general', mood: 'warm', enabled: true },
  { questionId: 'pool-q-008', text: '你们下一次约会最想去哪里？', category: 'future', stage: 'general', mood: 'light', enabled: true },
  { questionId: 'pool-q-009', text: '对方身上哪个小习惯最让你心动？', category: 'habit', stage: 'general', mood: 'sweet', enabled: true },
  { questionId: 'pool-q-010', text: '最近有什么话你想说但还没说出口？', category: 'communication', stage: 'general', mood: 'deep', enabled: true },
  { questionId: 'pool-q-011', text: '最近哪一刻让你觉得“还好有 TA 在”？', category: 'security', stage: 'general', mood: 'gentle', enabled: true },
  { questionId: 'pool-q-012', text: '如果今晚只能一起做一件小事，你最想选什么？', category: 'daily', stage: 'general', mood: 'light', enabled: true },
  { questionId: 'pool-q-013', text: '你觉得对方最近最可爱的一点是什么？', category: 'habit', stage: 'general', mood: 'sweet', enabled: true },
  { questionId: 'pool-q-014', text: '最近有没有一件小事，让你更确定自己被爱着？', category: 'security', stage: 'general', mood: 'warm', enabled: true },
  { questionId: 'pool-q-015', text: '如果把这个月的你们拍成一张照片，你觉得会是什么画面？', category: 'memory', stage: 'general', mood: 'warm', enabled: true },
  { questionId: 'pool-q-016', text: '你最想和 TA 一起养成的一个小习惯是什么？', category: 'future', stage: 'general', mood: 'gentle', enabled: true },
  { questionId: 'pool-q-017', text: '最近哪一次对方的回应最让你安心？', category: 'communication', stage: 'general', mood: 'gentle', enabled: true },
  { questionId: 'pool-q-018', text: '如果给你们最近的一次见面取个名字，你会怎么取？', category: 'memory', stage: 'general', mood: 'light', enabled: true },
  { questionId: 'pool-q-019', text: '你最希望 TA 在你忙碌的时候怎么陪你？', category: 'companionship', stage: 'general', mood: 'deep', enabled: true },
  { questionId: 'pool-q-020', text: '最近哪一句话最适合用来形容你们？', category: 'communication', stage: 'general', mood: 'deep', enabled: true },
  { questionId: 'pool-q-021', text: '如果你们明天能临时逃离日常半天，你想去哪里？', category: 'date', stage: 'general', mood: 'light', enabled: true },
  { questionId: 'pool-q-022', text: '最近对方哪一个贴心动作，让你记了很久？', category: 'gratitude', stage: 'general', mood: 'warm', enabled: true },
  { questionId: 'pool-q-023', text: '你最想和 TA 一起完成的一件小目标是什么？', category: 'future', stage: 'general', mood: 'gentle', enabled: true },
  { questionId: 'pool-q-024', text: '哪一种“被偏爱”的瞬间最能打动你？', category: 'security', stage: 'general', mood: 'deep', enabled: true },
  { questionId: 'pool-q-025', text: '如果今晚只能说一句心里话，你最想对 TA 说什么？', category: 'communication', stage: 'general', mood: 'deep', enabled: true },
  { questionId: 'pool-q-026', text: '你最想再和 TA 重来一次的回忆是哪一段？', category: 'memory', stage: 'general', mood: 'warm', enabled: true },
  { questionId: 'pool-q-027', text: '最近你最想和 TA 一起完成的一次小约会是什么？', category: 'date', stage: 'general', mood: 'light', enabled: true },
  { questionId: 'pool-q-028', text: '什么样的安静相处，会让你觉得很幸福？', category: 'companionship', stage: 'general', mood: 'gentle', enabled: true },
  { questionId: 'pool-q-029', text: '如果把 TA 最近的一点好，认真夸给 TA 听，你会夸什么？', category: 'gratitude', stage: 'general', mood: 'sweet', enabled: true },
  { questionId: 'pool-q-030', text: '你希望你们下个月多拥有哪一种共同的生活感？', category: 'future', stage: 'general', mood: 'gentle', enabled: true }
]

function createTempId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function toDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

function pickQuestionFromPool(dateKey, recentRecords = []) {
  const pool = QUESTION_POOL.filter((item) => item.enabled !== false)
  const recentQuestionKeys = recentRecords
    .slice(0, 7)
    .map((item) => item.questionId || item.questionText)
    .filter(Boolean)
  const filteredPool = pool.filter((item) => !recentQuestionKeys.includes(item.questionId) && !recentQuestionKeys.includes(item.text))
  const candidatePool = filteredPool.length ? filteredPool : pool
  const seed = dateKey.replace(/-/g, '').split('').reduce((sum, ch) => sum + Number(ch), 0)
  const index = seed % candidatePool.length
  return candidatePool[index]
}

function parseJsonContent(content = '') {
  const trimmed = content.trim()
  const fenced = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(fenced)
}

function requestAIDailyQuestion(context) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || ''
  const baseUrl = process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || 'https://api.openai.com/v1'
  const model = process.env.OPENAI_MODEL || process.env.AI_MODEL || 'gpt-4o-mini'

  if (!apiKey) {
    return Promise.resolve(null)
  }

  const prompt = [
    '你是情侣小程序的每日问答出题助手。',
    '请根据最近的互动上下文，生成一个适合今天的情侣问答。',
    '问题要温和、具体、自然，不要过度心理分析，不要太长。',
    '只返回 JSON，不要返回 Markdown，不要解释。',
    'JSON 字段必须包含：questionText, category, mood, reason。',
    'category 只能从 gratitude、companionship、communication、memory、date、future、habit、security、daily 里选择。',
    'mood 只能从 gentle、warm、light、sweet、deep 里选择。'
  ].join('')

  const body = JSON.stringify({
    model,
    temperature: 0.9,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: JSON.stringify(context)
      }
    ]
  })

  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl.replace(/\/$/, '')}/chat/completions`)
    const req = https.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Bearer ${apiKey}`
      }
    }, (res) => {
      let raw = ''
      res.on('data', (chunk) => {
        raw += chunk
      })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw)
          const content = parsed && parsed.choices && parsed.choices[0] && parsed.choices[0].message
            ? parsed.choices[0].message.content
            : ''

          if (!content) {
            reject(new Error('ai_empty_response'))
            return
          }

          const json = parseJsonContent(content)
          resolve({
            questionText: String(json.questionText || '').trim(),
            category: String(json.category || 'daily').trim(),
            mood: String(json.mood || 'gentle').trim(),
            reason: String(json.reason || '').trim()
          })
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
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

async function getRecentRecords(coupleId, today) {
  const recordRes = await db.collection(QUESTION_COLLECTION).where({
    coupleId
  }).get()

  return (recordRes.data || [])
    .filter((item) => item.date !== today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

async function ensureTodayRecord(coupleId) {
  const today = toDateKey(new Date())
  const existingRes = await db.collection(QUESTION_COLLECTION).where({
    coupleId,
    date: today
  }).limit(1).get()
  const existing = existingRes.data && existingRes.data[0]

  if (existing) {
    return existing
  }

  const now = new Date().toISOString()
  const recentRecords = await getRecentRecords(coupleId, today)
  const fallbackQuestion = pickQuestionFromPool(today, recentRecords)
  const aiQuestion = await requestAIDailyQuestion({
    date: today,
    recentQuestions: recentRecords.slice(0, 7).map((item) => ({
      date: item.date,
      questionId: item.questionId || '',
      questionText: item.questionText || '',
      questionCategory: item.questionCategory || ''
    }))
  }).catch(() => null)
  const questionText = aiQuestion && aiQuestion.questionText ? aiQuestion.questionText : fallbackQuestion.text
  const questionCategory = aiQuestion && aiQuestion.questionText ? aiQuestion.category || 'daily' : fallbackQuestion.category
  const questionMood = aiQuestion && aiQuestion.questionText ? aiQuestion.mood || 'gentle' : fallbackQuestion.mood
  const questionSource = aiQuestion && aiQuestion.questionText ? 'ai' : 'pool'
  const questionReason = aiQuestion && aiQuestion.questionText ? aiQuestion.reason || '' : ''
  const created = {
    recordId: createTempId('qa-record'),
    coupleId,
    date: today,
    questionId: questionSource === 'ai' ? createTempId('question') : fallbackQuestion.questionId,
    questionText,
    questionCategory,
    questionMood,
    questionSource,
    questionReason,
    generatedBy: questionSource === 'ai' ? 'cloud-ai' : 'question-pool',
    createdAt: now,
    answers: [],
    analysisResult: null,
    aiAnalysis: '',
    analysisGeneratedAt: null
    ,
    analysisProvider: '',
    analysisVersion: '',
    resultViewedUserIds: []
  }

  await db.collection(QUESTION_COLLECTION).add({
    data: created
  })

  return created
}

exports.main = async () => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const record = await ensureTodayRecord(currentUser.coupleId)

    return {
      success: true,
      record: {
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
      }
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'get_today_question_failed'
    }
  }
}
