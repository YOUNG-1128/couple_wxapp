const assert = require('node:assert/strict')
const test = require('node:test')
const dailyMoodService = require('../services/dailyMood')

test('saveTodayMood 兼容页面传入的 mood 字段', () => {
  const userId = `daily-mood-test-${Date.now()}`
  const result = dailyMoodService.saveTodayMood({
    userId,
    mood: 'happy',
    note: '今天很好'
  })

  assert.equal(result.status, 'happy')
  assert.equal(result.note, '今天很好')
  assert.equal(dailyMoodService.getTodayMood(userId).status, 'happy')
})
