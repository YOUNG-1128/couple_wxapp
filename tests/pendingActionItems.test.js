const assert = require('node:assert/strict')
const test = require('node:test')
const {
  buildLetterPendingAction,
  buildMissSignalPendingAction,
  buildQuestionPendingAction,
  buildQuestionResultPendingAction,
  buildTodoPendingAction
} = require('../utils/pending-action-items')

test('未读信提醒会优先展示标题和发信时间', () => {
  const action = buildLetterPendingAction({
    letterId: 'letter-1',
    title: '晚安信',
    content: '今晚也想你',
    fromUser: { nickName: 'TA' },
    sentAt: '2026-06-16T08:00:00+08:00'
  })

  assert.equal(action.id, 'mailbox-letter-1')
  assert.equal(action.title, '你收到一封新信')
  assert.equal(action.subtitle, '晚安信')
  assert.equal(action.targetPage, '/pages/mailbox/mailbox')
  assert.equal(action.createdAt, '2026-06-16T08:00:00+08:00')
})

test('今日待办提醒会生成统一跳转信息', () => {
  const action = buildTodoPendingAction({
    todoId: 'todo-1',
    title: '一起吃饭',
    dueDate: '2026-06-16',
    createdAt: '2026-06-16T09:00:00+08:00'
  })

  assert.equal(action.id, 'todo-todo-1')
  assert.equal(action.subtitle, '今日待办 · 2026-06-16')
  assert.equal(action.targetPage, '/pages/todo/todo')
})

test('问答结果提醒会固定跳到结果分区', () => {
  const action = buildQuestionResultPendingAction({
    questionId: 'q-1',
    createdAt: '2026-06-16T10:00:00+08:00'
  })

  assert.equal(action.id, 'question-result-q-1')
  assert.equal(action.targetSection, 'result')
  assert.equal(action.subtitle, '去看彼此答案和 AI 观察')
  assert.equal(action.createdAt, '2026-06-16T10:00:00+08:00')
})

test('想你信号提醒和问答提醒保留原目标页', () => {
  const missAction = buildMissSignalPendingAction({
    id: 'miss-1',
    message: '想抱抱你',
    createdAt: '2026-06-16T11:00:00+08:00'
  })
  const questionAction = buildQuestionPendingAction({
    questionId: 'q-2',
    questionText: '今天最想记录什么？',
    createdAt: '2026-06-16T12:00:00+08:00'
  })

  assert.equal(missAction.targetPage, '/pages/companion/companion')
  assert.equal(missAction.targetSection, 'missHistory')
  assert.equal(questionAction.targetPage, '/pages/daily-question/daily-question')
  assert.equal(questionAction.targetSection, 'question')
})
