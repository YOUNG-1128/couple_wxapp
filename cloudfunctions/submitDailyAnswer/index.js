const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const QUESTION_COLLECTION = 'dailyQuestions'

function createTempId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function toDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function hasSharedKeywords(a, b) {
  const words = ['陪伴', '一起', '拥抱', '晚安', '散步', '约会', '温暖', '安心', '想你', '谢谢']
  return words.some((word) => a.includes(word) && b.includes(word))
}

function mockAnalyzeAnswers(myAnswer, partnerAnswer, questionText) {
  const mine = (myAnswer || '').trim()
  const partner = (partnerAnswer || '').trim()

  if (!mine || !partner) {
    return ''
  }

  const similarText = mine === partner || hasSharedKeywords(mine, partner)
    ? '你们的答案里有很明显的同频点，能感受到彼此正在认真靠近。'
    : '你们关注的角度不太一样，但都在努力表达对这段关系的在意。'

  const diffText = mine.length >= partner.length
    ? '你的表达更细腻一些，TA 的表达更直接。'
    : 'TA 的表达更细腻一些，你的表达更直接。'

  const gentleText = questionText.includes('周末')
    ? '可以挑一个轻松时段，把今天的答案变成一个小小约会计划。'
    : '试着把今天说到的一件小事落地，你们会更有“在一起”的实感。'

  return `${similarText}${diffText}${gentleText}`
}

function buildFallbackAnalysisResult(myAnswer, partnerAnswer, questionText) {
  const summary = mockAnalyzeAnswers(myAnswer, partnerAnswer, questionText)
  const sameKeywords = hasSharedKeywords(myAnswer, partnerAnswer)
  const relevanceScore = sameKeywords ? 82 : 68
  const relevanceLevel = relevanceScore >= 80 ? 'high' : 'medium'

  return {
    relevanceScore,
    relevanceLevel,
    summary,
    differences: myAnswer.length >= partnerAnswer.length
      ? '你的表达更细腻一些，TA 的表达更直接。'
      : 'TA 的表达更细腻一些，你的表达更直接。',
    suggestion: questionText.includes('周末')
      ? '挑一个轻松时段，把今天的答案变成一个小小约会计划。'
      : '今晚可以把答案里提到的一件小事真正说给对方听。'
  }
}

function buildAnalysisText(result) {
  if (!result) {
    return ''
  }

  return `相关性 ${result.relevanceScore} 分（${result.relevanceLevel}）。${result.summary}${result.differences}${result.suggestion}`
}

function parseJsonContent(content = '') {
  const trimmed = content.trim()
  const fenced = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')

  return JSON.parse(fenced)
}

function requestAIAnalysis(questionText, firstAnswer, secondAnswer) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || ''
  const baseUrl = process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || 'https://api.openai.com/v1'
  const model = process.env.OPENAI_MODEL || process.env.AI_MODEL || 'gpt-4o-mini'

  if (!apiKey) {
    return Promise.resolve(null)
  }

  const prompt = [
    '你是情侣问答分析助手。',
    '请根据问题和双方回答，判断回答相关性，并给出温和、具体、不过度心理分析的观察。',
    '只返回 JSON，不要返回 Markdown，不要解释。',
    'JSON 字段必须包含：relevanceScore, relevanceLevel, summary, differences, suggestion。',
    'relevanceScore 是 0-100 的整数；relevanceLevel 只能是 low、medium、high。'
  ].join('')

  const body = JSON.stringify({
    model,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: JSON.stringify({
          questionText,
          answerA: firstAnswer,
          answerB: secondAnswer
        })
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
            relevanceScore: Math.max(0, Math.min(100, Number(json.relevanceScore) || 0)),
            relevanceLevel: ['low', 'medium', 'high'].includes(json.relevanceLevel) ? json.relevanceLevel : 'medium',
            summary: String(json.summary || ''),
            differences: String(json.differences || ''),
            suggestion: String(json.suggestion || '')
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

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()
    const answer = ((event && event.answer) || '').trim()

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    if (!answer) {
      throw new Error('answer_required')
    }

    const today = toDateKey(new Date())
    const recordRes = await db.collection(QUESTION_COLLECTION).where({
      coupleId: currentUser.coupleId,
      date: today
    }).limit(1).get()
    const record = recordRes.data && recordRes.data[0]

    if (!record || !record._id) {
      throw new Error('today_record_not_found')
    }

    const answers = Array.isArray(record.answers) ? [...record.answers] : []
    const now = new Date().toISOString()
    const index = answers.findIndex((item) => item.userId === currentUser.userId)
    const nextAnswer = {
      answerId: index >= 0 ? answers[index].answerId : createTempId('qa-answer'),
      userId: currentUser.userId,
      answer,
      answeredAt: now
    }

    if (index >= 0) {
      answers[index] = nextAnswer
    } else {
      answers.push(nextAnswer)
    }

    let aiAnalysis = record.aiAnalysis || ''
    let analysisGeneratedAt = record.analysisGeneratedAt || null
    let analysisResult = record.analysisResult || null
    let analysisProvider = record.analysisProvider || ''
    let analysisVersion = record.analysisVersion || ''
    let resultViewedUserIds = Array.isArray(record.resultViewedUserIds) ? [...record.resultViewedUserIds] : []

    if (answers.length >= 2) {
      const firstAnswer = answers[0].answer
      const secondAnswer = answers[1].answer
      const aiResult = await requestAIAnalysis(record.questionText, firstAnswer, secondAnswer)
        .catch(() => null)

      analysisResult = aiResult || buildFallbackAnalysisResult(firstAnswer, secondAnswer, record.questionText)
      aiAnalysis = buildAnalysisText(analysisResult)
      analysisGeneratedAt = now
      analysisProvider = aiResult ? 'openai' : 'mock'
      analysisVersion = 'v1'
      resultViewedUserIds = [currentUser.userId]
    }

    await db.collection(QUESTION_COLLECTION).doc(record._id).update({
      data: {
        answers,
        analysisResult,
        aiAnalysis,
        analysisGeneratedAt,
        analysisProvider,
        analysisVersion,
        resultViewedUserIds,
        updatedAt: now
      }
    })

    return {
      success: true,
      record: {
        ...record,
        answers,
        analysisResult,
        aiAnalysis,
        analysisGeneratedAt,
        analysisProvider,
        analysisVersion,
        resultViewedUserIds,
        updatedAt: now
      }
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'submit_daily_answer_failed'
    }
  }
}
