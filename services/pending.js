const companionService = require('./companion')
const mailboxService = require('./mailbox')
const questionService = require('./question')
const todoService = require('./todo')
const anniversaryService = require('./anniversary')
const momentsService = require('./moments')
const readStateService = require('./home-read-state')
const relationshipService = require('./relationship')
const { toDateKey } = require('../utils/time')
const { buildHomePendingActions } = require('../utils/pending-actions')
const {
  buildLetterPendingAction,
  buildMissSignalPendingAction,
  buildQuestionPendingAction,
  buildQuestionResultPendingAction,
  buildTodoPendingAction
} = require('../utils/pending-action-items')

function getFallbackCreatedAt(date = new Date()) {
  return date.toISOString()
}

function getPendingActions() {
  const companionData = companionService.getCompanionData()
  const questionData = questionService.getQuestionData()
  const actions = []

  const unreadLetter = mailboxService.getLatestUnreadIncomingLetter()
  if (unreadLetter) {
    actions.push(buildLetterPendingAction(unreadLetter))
  }

  const unreadMissSignal = companionData.missHistory.find((item) => item.type === 'received' && item.readStatus === 'unread')
  if (unreadMissSignal) {
    actions.push(buildMissSignalPendingAction(unreadMissSignal))
  }

  if (!questionData.myAnswered) {
    actions.push(buildQuestionPendingAction({
      questionId: questionData.questionId,
      questionText: questionData.questionText,
      createdAt: getFallbackCreatedAt()
    }))
  }

  const todayTodos = todoService.getTodayPendingTodos(2)
  todayTodos.forEach((todo) => {
    actions.push(buildTodoPendingAction(todo))
  })

  return actions.filter(Boolean)
}

function getPendingActionsAsync() {
  return Promise.all([
    mailboxService.getLatestUnreadIncomingLetterAsync(),
    companionService.getLatestReceivedMissSignalAsync(),
    todoService.getTodayPendingTodosAsync(2),
    questionService.getQuestionDataAsync(),
    anniversaryService.getAnniversaryPageDataAsync(),
    momentsService.getMomentsFeedPageAsync({ offset: 0, pageSize: 10, reset: true }).catch(() => ({ items: [] })),
    todoService.getTodosAsync('all')
  ]).then(([
    unreadLetter,
    unreadMissSignal,
    todayTodos,
    questionData,
    anniversaryPageData,
    momentsPageData,
    todoPageData
  ]) => {
    const actions = []
    const relationship = relationshipService.getRelationshipContext()
    const currentUserId = relationship.currentUser ? relationship.currentUser.userId : ''

    if (unreadLetter) {
      actions.push(buildLetterPendingAction(unreadLetter))
    }

    if (unreadMissSignal) {
      actions.push(buildMissSignalPendingAction(unreadMissSignal))
    }

    if (!questionData.myAnswered) {
      actions.push(buildQuestionPendingAction({
        questionId: questionData.questionId,
        questionText: questionData.questionText,
        createdAt: getFallbackCreatedAt()
      }))
    } else if (questionData.partnerAnswered && questionData.analysisReady && questionData.hasUnreadResult) {
      actions.push(buildQuestionResultPendingAction({
        questionId: questionData.questionId,
        createdAt: questionData.analysisGeneratedAt || getFallbackCreatedAt()
      }))
    }

    buildHomePendingActions({
      currentUserId,
      today: toDateKey(new Date()),
      anniversaries: (anniversaryPageData && anniversaryPageData.list) || [],
      posts: (momentsPageData && momentsPageData.items) || [],
      todos: (todoPageData && todoPageData.todos) || [],
      lastSeenPostAt: readStateService.getLastSeenAt('posts', currentUserId),
      lastSeenCoupleTodoAt: readStateService.getLastSeenAt('couple-todos', currentUserId)
    }).forEach((item) => actions.push(item))

    ;(todayTodos || []).forEach((todo) => {
      actions.push(buildTodoPendingAction(todo))
    })

    return actions.filter(Boolean)
  }).catch(() => getPendingActions())
}

module.exports = {
  getPendingActions,
  getPendingActionsAsync,
  getFallbackCreatedAt
}
