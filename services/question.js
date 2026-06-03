const questionDailyService = require('./question-daily')

function getQuestionData() {
  const today = questionDailyService.getTodayPageData()

  return {
    questionId: today.questionId,
    questionText: today.questionText,
    questionCategory: today.questionCategory,
    questionMood: today.questionMood,
    questionSource: today.questionSource,
    myAnswer: today.myAnswer,
    partnerAnswer: today.partnerAnswer,
    myAnswered: today.myAnswered,
    partnerAnswered: today.partnerAnswered,
    matchScore: 0,
    matchText: '',
    waitingText: today.waitingText,
    analysisReady: today.analysisReady,
    hasUnreadResult: today.hasUnreadResult,
    analysisResult: today.analysisResult,
    aiAnalysis: today.aiAnalysis,
    analysisGeneratedAt: today.analysisGeneratedAt,
    date: today.date
  }
}

function getQuestionDataAsync() {
  return questionDailyService.getTodayPageDataAsync().then((today) => ({
    questionId: today.questionId,
    questionText: today.questionText,
    questionCategory: today.questionCategory,
    questionMood: today.questionMood,
    questionSource: today.questionSource,
    myAnswer: today.myAnswer,
    partnerAnswer: today.partnerAnswer,
    myAnswered: today.myAnswered,
    partnerAnswered: today.partnerAnswered,
    matchScore: 0,
    matchText: '',
    waitingText: today.waitingText,
    analysisReady: today.analysisReady,
    hasUnreadResult: today.hasUnreadResult,
    analysisResult: today.analysisResult,
    aiAnalysis: today.aiAnalysis,
    analysisGeneratedAt: today.analysisGeneratedAt,
    date: today.date
  }))
}

function submitMyAnswer(answer) {
  questionDailyService.submitAnswer(answer)

  return getQuestionData()
}

module.exports = {
  getQuestionData,
  getQuestionDataAsync,
  submitMyAnswer
}
