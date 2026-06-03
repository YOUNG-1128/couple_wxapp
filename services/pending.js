const companionService = require('./companion')
const mailboxService = require('./mailbox')
const questionService = require('./question')
const todoService = require('./todo')

function getPendingActions() {
  const companionData = companionService.getCompanionData()
  const questionData = questionService.getQuestionData()
  const actions = []

  const unreadLetter = mailboxService.getLatestUnreadIncomingLetter()
  if (unreadLetter) {
    actions.push({
      id: `mailbox-${unreadLetter.letterId}`,
      type: 'mailbox',
      title: '你收到一封新信',
      subtitle: unreadLetter.title || unreadLetter.content || `${unreadLetter.fromUser.nickName} 给你写了一封信`,
      status: 'pending',
      actionText: '去查看',
      targetPage: '/pages/mailbox/mailbox',
      createdAt: unreadLetter.sentAt || unreadLetter.createdAt || unreadLetter.updatedAt
    })
  }

  const unreadMissSignal = companionData.missHistory.find((item) => item.type === 'received' && item.readStatus === 'unread')
  if (unreadMissSignal) {
    actions.push({
      id: `miss-${unreadMissSignal.id}`,
      type: 'miss_signal',
      title: '收到一个想你信号',
      subtitle: unreadMissSignal.message,
      status: 'pending',
      actionText: '去回应',
      targetPage: '/pages/companion/companion',
      targetSection: 'missHistory',
      createdAt: unreadMissSignal.createdAt || unreadMissSignal.time
    })
  }

  if (!questionData.myAnswered) {
    actions.push({
      id: `question-${questionData.questionId}`,
      type: 'question',
      title: '今天的问题你还没回答',
      subtitle: questionData.questionText,
      status: 'pending',
      actionText: '去回答',
      targetPage: '/pages/daily-question/daily-question',
      targetSection: 'question',
      createdAt: '2026-04-23 09:00'
    })
  }

  const todayTodos = todoService.getTodayPendingTodos(2)
  todayTodos.forEach((todo) => {
    actions.push({
      id: `todo-${todo.todoId}`,
      type: 'todo',
      title: todo.title,
      subtitle: todo.dueDate ? `今日待办 · ${todo.dueDate}` : '今日待办',
      status: 'pending',
      actionText: '去完成',
      targetPage: '/pages/todo/todo',
      createdAt: todo.createdAt
    })
  })

  return actions
}

function getPendingActionsAsync() {
  return Promise.all([
    mailboxService.getLatestUnreadIncomingLetterAsync(),
    companionService.getLatestReceivedMissSignalAsync(),
    todoService.getTodayPendingTodosAsync(2),
    questionService.getQuestionDataAsync()
  ]).then(([unreadLetter, unreadMissSignal, todayTodos, questionData]) => {
    const actions = []

    if (unreadLetter) {
      actions.push({
        id: `mailbox-${unreadLetter.letterId}`,
        type: 'mailbox',
        title: '你收到一封新信',
        subtitle: unreadLetter.title || unreadLetter.content || `${unreadLetter.fromUser.nickName} 给你写了一封信`,
        status: 'pending',
        actionText: '去查看',
        targetPage: '/pages/mailbox/mailbox',
        createdAt: unreadLetter.sentAt || unreadLetter.createdAt || unreadLetter.updatedAt
      })
    }

    if (unreadMissSignal) {
      actions.push({
        id: `miss-${unreadMissSignal.id}`,
        type: 'miss_signal',
        title: '收到一个想你信号',
        subtitle: unreadMissSignal.message,
        status: 'pending',
        actionText: '去回应',
        targetPage: '/pages/companion/companion',
        targetSection: 'missHistory',
        createdAt: unreadMissSignal.createdAt || unreadMissSignal.time
      })
    }

    if (!questionData.myAnswered) {
      actions.push({
        id: `question-${questionData.questionId}`,
        type: 'question',
        title: '今天的问题你还没回答',
        subtitle: questionData.questionText,
        status: 'pending',
        actionText: '去回答',
        targetPage: '/pages/daily-question/daily-question',
        targetSection: 'question',
        createdAt: '2026-04-23 09:00'
      })
    } else if (questionData.partnerAnswered && questionData.analysisReady && questionData.hasUnreadResult) {
      actions.push({
        id: `question-result-${questionData.questionId}`,
        type: 'question_result',
        title: 'TA 已经回答今天的问题',
        subtitle: '去看彼此答案和 AI 观察',
        status: 'pending',
        actionText: '去查看',
        targetPage: '/pages/daily-question/daily-question',
        targetSection: 'result',
        createdAt: questionData.analysisGeneratedAt || '2026-04-23 09:00'
      })
    }

    ;(todayTodos || []).forEach((todo) => {
      actions.push({
        id: `todo-${todo.todoId}`,
        type: 'todo',
        title: todo.title,
        subtitle: todo.dueDate ? `今日待办 · ${todo.dueDate}` : '今日待办',
        status: 'pending',
        actionText: '去完成',
        targetPage: '/pages/todo/todo',
        createdAt: todo.createdAt
      })
    })

    return actions
  }).catch(() => getPendingActions())
}

module.exports = {
  getPendingActions,
  getPendingActionsAsync
}
