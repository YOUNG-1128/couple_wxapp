const { getState, updateState } = require('./local-state')
const relationshipService = require('./relationship')
const { createTempId } = require('../utils/id')
const { toDateKey } = require('../utils/time')

function getCurrentUserId() {
  const session = getState('session') || {}

  return session.currentUserId || 'me'
}

function getSession() {
  return getState('session') || {}
}

function canUseCloudDailyQuestions() {
  const session = getSession()
  const relationship = relationshipService.getRelationshipContext()

  return Boolean(
    typeof wx !== 'undefined'
    && wx.cloud
    && typeof wx.cloud.callFunction === 'function'
    && session.isCloudLoggedIn === true
    && relationship.isBound
    && relationship.coupleId
  )
}

function getPartnerUserId(currentUserId) {
  const users = getState('users') || []
  const partner = users.find((item) => item.userId !== currentUserId)

  return partner ? partner.userId : (currentUserId === 'me' ? 'partner' : 'me')
}

function getTodayDateKey() {
  return toDateKey(new Date())
}

function getQuestionPool() {
  return getState('questionPool') || []
}

function normalizeQuestionItem(item, index = 0) {
  if (typeof item === 'string') {
    return {
      questionId: `pool-local-${index + 1}`,
      text: item,
      category: 'daily',
      stage: 'general',
      mood: 'gentle',
      enabled: true
    }
  }

  return {
    questionId: item.questionId || `pool-local-${index + 1}`,
    text: item.text || '今天最想和对方一起做的一件小事是什么？',
    category: item.category || 'daily',
    stage: item.stage || 'general',
    mood: item.mood || 'gentle',
    enabled: item.enabled !== false
  }
}

function getRecords() {
  return getState('questionDailyRecords') || []
}

function findRecordByDate(date) {
  return getRecords().find((item) => item.date === date) || null
}

function getDailyQuestionFromRecord(record) {
  if (!record) {
    return null
  }

  return {
    questionId: record.questionId,
    date: record.date,
    questionText: record.questionText,
    questionCategory: record.questionCategory || 'daily',
    questionMood: record.questionMood || 'gentle',
    questionSource: record.questionSource || 'pool',
    questionReason: record.questionReason || '',
    generatedBy: record.generatedBy,
    createdAt: record.createdAt
  }
}

function pickQuestionFromPool(date, recentRecords = []) {
  const pool = getQuestionPool()
    .map((item, index) => normalizeQuestionItem(item, index))
    .filter((item) => item.enabled !== false)

  if (!pool.length) {
    return {
      questionId: createTempId('question'),
      text: '今天最想和对方一起做的一件小事是什么？',
      category: 'daily',
      mood: 'gentle',
      source: 'pool',
      reason: ''
    }
  }

  const recentQuestionKeys = recentRecords
    .slice(0, 7)
    .map((item) => item.questionId || item.questionText)
    .filter(Boolean)
  const filteredPool = pool.filter((item) => !recentQuestionKeys.includes(item.questionId) && !recentQuestionKeys.includes(item.text))
  const candidatePool = filteredPool.length ? filteredPool : pool
  const seed = date.replace(/-/g, '').split('').reduce((sum, ch) => sum + Number(ch), 0)
  const index = seed % candidatePool.length
  const selected = candidatePool[index]

  return {
    questionId: selected.questionId,
    text: selected.text,
    category: selected.category,
    mood: selected.mood,
    source: 'pool',
    reason: ''
  }
}

function ensureTodayRecord() {
  const today = getTodayDateKey()
  let found = findRecordByDate(today)

  if (found) {
    return found
  }

  const now = new Date().toISOString()
  const question = pickQuestionFromPool(
    today,
    getRecords()
      .filter((item) => item.date !== today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  )

  const created = {
    recordId: createTempId('qa-record'),
    date: today,
    questionId: question.questionId,
    questionText: question.text,
    questionCategory: question.category,
    questionMood: question.mood,
    questionSource: question.source,
    questionReason: question.reason,
    generatedBy: 'mock-ai',
    createdAt: now,
    myAnswer: '',
    partnerAnswer: '',
    myAnswered: false,
    partnerAnswered: false,
    aiAnalysis: '',
    analysisGeneratedAt: null
  }

  updateState('questionDailyRecords', (records) => {
    records.unshift(created)
  })

  found = findRecordByDate(today)

  return found || created
}

function getAnswerFieldByUserId(userId, currentUserId, partnerUserId) {
  if (userId === currentUserId) {
    return {
      answerField: 'myAnswer',
      answeredField: 'myAnswered'
    }
  }

  if (userId === partnerUserId) {
    return {
      answerField: 'partnerAnswer',
      answeredField: 'partnerAnswered'
    }
  }

  return {
    answerField: 'myAnswer',
    answeredField: 'myAnswered'
  }
}

function hasSharedKeywords(a, b) {
  const words = ['陪伴', '一起', '拥抱', '晚安', '散步', '约会', '温暖', '安心', '想你', '谢谢']

  return words.some((word) => a.includes(word) && b.includes(word))
}

function mockAnalyzeAnswers(myAnswer, partnerAnswer, questionText) {
  const mine = (myAnswer || '').trim()
  const partner = (partnerAnswer || '').trim()

  if (!mine || !partner) {
    return '等你们都回答后，我会送上一段今天的温柔观察。'
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

function generateAIAnalysis() {
  const record = ensureTodayRecord()

  if (!record || !record.myAnswered || !record.partnerAnswered) {
    return null
  }

  let analysis = null

  updateState('questionDailyRecords', (records) => {
    const target = records.find((item) => item.date === record.date)

    if (!target) {
      return
    }

    target.aiAnalysis = mockAnalyzeAnswers(target.myAnswer, target.partnerAnswer, target.questionText)
    target.analysisGeneratedAt = new Date().toISOString()

    analysis = {
      analysisId: createTempId('qa-analysis'),
      questionId: target.questionId,
      date: target.date,
      myAnswer: target.myAnswer,
      partnerAnswer: target.partnerAnswer,
      analysisText: target.aiAnalysis,
      createdAt: target.analysisGeneratedAt,
      generatedBy: 'mock-ai'
    }
  })

  return analysis
}

function getQuestionRecord(date = getTodayDateKey()) {
  if (date === getTodayDateKey()) {
    ensureTodayRecord()
  }

  return findRecordByDate(date)
}

function getTodayQuestion() {
  const record = ensureTodayRecord()

  return getDailyQuestionFromRecord(record)
}

function submitAnswer(answerText, userId = getCurrentUserId()) {
  const record = ensureTodayRecord()

  if (!record) {
    return null
  }

  const currentUserId = getCurrentUserId()
  const partnerUserId = getPartnerUserId(currentUserId)
  const { answerField, answeredField } = getAnswerFieldByUserId(userId, currentUserId, partnerUserId)

  updateState('questionDailyRecords', (records) => {
    const target = records.find((item) => item.date === record.date)

    if (!target) {
      return
    }

    target[answerField] = answerText
    target[answeredField] = true

    if (target.myAnswered && target.partnerAnswered && !target.aiAnalysis) {
      target.aiAnalysis = mockAnalyzeAnswers(target.myAnswer, target.partnerAnswer, target.questionText)
      target.analysisGeneratedAt = new Date().toISOString()
    }
  })

  return getQuestionRecord(record.date)
}

function buildPageState(record) {
  const currentUserId = getCurrentUserId()
  const partnerUserId = getPartnerUserId(currentUserId)

  const myFields = getAnswerFieldByUserId(currentUserId, currentUserId, partnerUserId)
  const partnerFields = getAnswerFieldByUserId(partnerUserId, currentUserId, partnerUserId)

  const myAnswered = !!record[myFields.answeredField]
  const partnerAnswered = !!record[partnerFields.answeredField]
  const myAnswer = record[myFields.answerField] || ''
  const partnerAnswer = record[partnerFields.answerField] || ''
  const bothAnswered = myAnswered && partnerAnswered
  const waitingText = myAnswered && !partnerAnswered
    ? '已记录你的答案，等 TA 回答后就能查看彼此答案啦'
    : (!myAnswered && partnerAnswered ? 'TA 已经回答啦，你回答后就能解锁彼此答案' : '今天的问题，慢慢说给 TA 听')

  return {
    recordId: record.recordId,
    date: record.date,
    questionId: record.questionId,
    questionText: record.questionText,
    questionCategory: record.questionCategory || 'daily',
    questionMood: record.questionMood || 'gentle',
    questionSource: record.questionSource || 'pool',
    questionReason: record.questionReason || '',
    generatedBy: record.generatedBy,
    createdAt: record.createdAt,
    myAnswer,
    partnerAnswer,
    myAnswered,
    partnerAnswered,
    bothAnswered,
    waitingText,
    aiAnalysis: bothAnswered ? (record.aiAnalysis || '') : '',
    analysisGeneratedAt: bothAnswered ? record.analysisGeneratedAt : null
  }
}

function getTodayPageData() {
  const record = ensureTodayRecord()

  return buildPageState(record)
}

function getHistoryRecords() {
  const today = getTodayDateKey()

  return getRecords()
    .filter((item) => item.date !== today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((item) => ({
      ...buildPageState(item)
    }))
}

function callCloudFunction(name, data = {}) {
  return wx.cloud.callFunction({
    name,
    data
  }).then((res) => (res && res.result) || {})
}

function normalizeCloudError(error, fallbackCode) {
  const message = error && (error.message || error.errMsg || error.errorMessage)

  return message || fallbackCode
}

function buildCloudPageState(record) {
  const relationship = relationshipService.getRelationshipContext()
  const currentUser = relationship.currentUser || {}
  const partnerUser = relationship.partnerUser || {}
  const answers = Array.isArray(record.answers) ? record.answers : []
  const myAnswerItem = answers.find((item) => item.userId === currentUser.userId) || null
  const partnerAnswerItem = answers.find((item) => item.userId === partnerUser.userId) || null
  const myAnswered = Boolean(myAnswerItem)
  const partnerAnswered = Boolean(partnerAnswerItem)
  const bothAnswered = myAnswered && partnerAnswered
  const analysisReady = bothAnswered && Boolean(record.aiAnalysis || record.analysisResult)
  const resultViewedUserIds = Array.isArray(record.resultViewedUserIds) ? record.resultViewedUserIds : []
  const hasUnreadResult = analysisReady && !resultViewedUserIds.includes(currentUser.userId)
  const waitingText = myAnswered && !partnerAnswered
    ? '已记录你的答案，等 TA 回答后就能查看彼此答案啦'
    : (!myAnswered && partnerAnswered ? 'TA 已经回答啦，你回答后就能解锁彼此答案' : '今天的问题，慢慢说给 TA 听')
  const analysisResult = record.analysisResult || null

  return {
    recordId: record.recordId,
    date: record.date,
    questionId: record.questionId,
    questionText: record.questionText,
    questionCategory: record.questionCategory || 'daily',
    questionMood: record.questionMood || 'gentle',
    questionSource: record.questionSource || 'pool',
    questionReason: record.questionReason || '',
    generatedBy: record.generatedBy,
    createdAt: record.createdAt,
    myAnswer: myAnswerItem ? myAnswerItem.answer : '',
    partnerAnswer: partnerAnswerItem ? partnerAnswerItem.answer : '',
    myAnswered,
    partnerAnswered,
    bothAnswered,
    analysisReady,
    hasUnreadResult,
    waitingText,
    analysisResult: analysisReady ? analysisResult : null,
    relevanceScore: analysisReady && analysisResult ? analysisResult.relevanceScore : 0,
    relevanceLevel: analysisReady && analysisResult ? analysisResult.relevanceLevel : '',
    analysisSummary: analysisReady && analysisResult ? analysisResult.summary : '',
    analysisDifferences: analysisReady && analysisResult ? analysisResult.differences : '',
    analysisSuggestion: analysisReady && analysisResult ? analysisResult.suggestion : '',
    aiAnalysis: analysisReady ? (record.aiAnalysis || '') : '',
    analysisGeneratedAt: bothAnswered ? record.analysisGeneratedAt : null
  }
}

function syncCloudTodayRecord(record) {
  if (!record || !record.date) {
    return null
  }

  const pageState = buildCloudPageState(record)

  updateState('questionDailyRecords', (records) => {
    const index = records.findIndex((item) => item.date === pageState.date)
    const normalized = {
      recordId: pageState.recordId,
      date: pageState.date,
      questionId: pageState.questionId,
      questionText: pageState.questionText,
      questionCategory: pageState.questionCategory,
      questionMood: pageState.questionMood,
      questionSource: pageState.questionSource,
      questionReason: pageState.questionReason,
      generatedBy: pageState.generatedBy,
      createdAt: pageState.createdAt,
      myAnswer: pageState.myAnswer,
      partnerAnswer: pageState.partnerAnswer,
      myAnswered: pageState.myAnswered,
      partnerAnswered: pageState.partnerAnswered,
      analysisResult: pageState.analysisResult,
      aiAnalysis: pageState.aiAnalysis,
      analysisGeneratedAt: pageState.analysisGeneratedAt,
      resultViewedUserIds: Array.isArray(record.resultViewedUserIds) ? record.resultViewedUserIds : []
    }

    if (index >= 0) {
      records[index] = normalized
    } else {
      records.unshift(normalized)
    }
  })

  return pageState
}

function syncCloudHistoryRecords(records = []) {
  return records.map((item) => buildCloudPageState(item))
}

function getTodayPageDataAsync() {
  if (!canUseCloudDailyQuestions()) {
    return Promise.resolve(getTodayPageData())
  }

  return callCloudFunction('getTodayQuestion')
    .then((result) => {
      if (result.success !== true || !result.record) {
        throw new Error(result.errorMessage || 'get_today_question_failed')
      }

      return syncCloudTodayRecord(result.record)
    })
    .catch((error) => {
      const errorMessage = normalizeCloudError(error, 'get_today_question_failed')
      console.error('[question-daily] getTodayPageDataAsync failed:', errorMessage)
      throw new Error(errorMessage)
    })
}

function submitAnswerAsync(answerText) {
  if (!canUseCloudDailyQuestions()) {
    submitAnswer(answerText)
    return Promise.resolve(getTodayPageData())
  }

  return callCloudFunction('submitDailyAnswer', {
    answer: answerText
  }).then((result) => {
    if (result.success !== true || !result.record) {
      throw new Error(result.errorMessage || 'submit_daily_answer_failed')
    }

    return syncCloudTodayRecord(result.record)
  })
}

function generateAIAnalysisAsync() {
  if (!canUseCloudDailyQuestions()) {
    const analysis = generateAIAnalysis()
    return Promise.resolve(analysis)
  }

  return callCloudFunction('generateDailyAnalysis')
    .then((result) => {
      if (result.success !== true || !result.record) {
        throw new Error(result.errorMessage || 'generate_daily_analysis_failed')
      }

      syncCloudTodayRecord(result.record)
      return result.record
    })
}

function getHistoryRecordsAsync() {
  if (!canUseCloudDailyQuestions()) {
    return Promise.resolve(getHistoryRecords())
  }

  return callCloudFunction('getDailyQuestionHistory')
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_daily_question_history_failed')
      }

      return syncCloudHistoryRecords(result.records || [])
    })
    .catch((error) => {
      const errorMessage = normalizeCloudError(error, 'get_daily_question_history_failed')
      console.error('[question-daily] getHistoryRecordsAsync failed:', errorMessage)
      throw new Error(errorMessage)
    })
}

function markResultViewedAsync(recordId) {
  if (!recordId) {
    return Promise.resolve(false)
  }

  if (!canUseCloudDailyQuestions()) {
    return Promise.resolve(true)
  }

  return callCloudFunction('markDailyQuestionResultViewed', {
    recordId
  }).then((result) => result.success === true)
}

module.exports = {
  getTodayQuestion,
  submitAnswer,
  getQuestionRecord,
  generateAIAnalysis,
  getTodayPageData,
  getHistoryRecords,
  mockAnalyzeAnswers,
  canUseCloudDailyQuestions,
  getTodayPageDataAsync,
  submitAnswerAsync,
  generateAIAnalysisAsync,
  getHistoryRecordsAsync,
  markResultViewedAsync
}
