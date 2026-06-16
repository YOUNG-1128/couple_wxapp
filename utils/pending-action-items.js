function buildLetterPendingAction(letter) {
  if (!letter || !letter.letterId) {
    return null
  }

  return {
    id: `mailbox-${letter.letterId}`,
    type: 'mailbox',
    title: '你收到一封新信',
    subtitle: letter.title || letter.content || `${letter.fromUser.nickName} 给你写了一封信`,
    status: 'pending',
    actionText: '去查看',
    targetPage: '/pages/mailbox/mailbox',
    createdAt: letter.sentAt || letter.createdAt || letter.updatedAt
  }
}

function buildMissSignalPendingAction(signal) {
  if (!signal || !signal.id) {
    return null
  }

  return {
    id: `miss-${signal.id}`,
    type: 'miss_signal',
    title: '收到一个想你信号',
    subtitle: signal.message,
    status: 'pending',
    actionText: '去回应',
    targetPage: '/pages/companion/companion',
    targetSection: 'missHistory',
    createdAt: signal.createdAt || signal.time
  }
}

function buildQuestionPendingAction(question) {
  if (!question || !question.questionId) {
    return null
  }

  return {
    id: `question-${question.questionId}`,
    type: 'question',
    title: '今天的问题你还没回答',
    subtitle: question.questionText,
    status: 'pending',
    actionText: '去回答',
    targetPage: '/pages/daily-question/daily-question',
    targetSection: 'question',
    createdAt: question.createdAt
  }
}

function buildQuestionResultPendingAction(question) {
  if (!question || !question.questionId) {
    return null
  }

  return {
    id: `question-result-${question.questionId}`,
    type: 'question_result',
    title: 'TA 已经回答今天的问题',
    subtitle: '去看彼此答案和 AI 观察',
    status: 'pending',
    actionText: '去查看',
    targetPage: '/pages/daily-question/daily-question',
    targetSection: 'result',
    createdAt: question.createdAt
  }
}

function buildTodoPendingAction(todo) {
  if (!todo || !todo.todoId) {
    return null
  }

  return {
    id: `todo-${todo.todoId}`,
    type: 'todo',
    title: todo.title,
    subtitle: todo.dueDate ? `今日待办 · ${todo.dueDate}` : '今日待办',
    status: 'pending',
    actionText: '去完成',
    targetPage: '/pages/todo/todo',
    createdAt: todo.createdAt
  }
}

module.exports = {
  buildLetterPendingAction,
  buildMissSignalPendingAction,
  buildQuestionPendingAction,
  buildQuestionResultPendingAction,
  buildTodoPendingAction
}
