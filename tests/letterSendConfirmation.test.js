const assert = require('node:assert/strict')
const test = require('node:test')

function loadHelper() {
  try {
    return require('../utils/letter-send-confirmation')
  } catch (error) {
    return {}
  }
}

test('即时信发送前展示明确确认信息', () => {
  const { buildLetterSendConfirmation } = loadHelper()

  assert.equal(typeof buildLetterSendConfirmation, 'function')
  assert.deepEqual(buildLetterSendConfirmation({
    sendMode: 'now',
    receiverName: '小明'
  }), {
    title: '确认发送',
    content: '确定现在发送给小明吗？发送后无法撤回。',
    confirmText: '发送'
  })
})

test('定时信发送前展示计划时间', () => {
  const { buildLetterSendConfirmation } = loadHelper()

  assert.deepEqual(buildLetterSendConfirmation({
    sendMode: 'scheduled',
    receiverName: 'TA',
    scheduleDate: '2026-06-14',
    scheduleTime: '08:30'
  }), {
    title: '确认定时发送',
    content: '信件将在 2026-06-14 08:30 对 TA 可见，确定保存这个发送计划吗？',
    confirmText: '确认'
  })
})
