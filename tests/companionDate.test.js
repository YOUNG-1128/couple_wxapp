const assert = require('node:assert/strict')
const test = require('node:test')
const companionService = require('../services/companion')

test('提交陪伴心情时使用真实当天日期', () => {
  const mood = companionService.submitMood({
    content: '今天很好',
    tag: '开心'
  }, new Date('2026-06-13T08:30:00.000Z'))

  assert.equal(mood.dateKey, '2026-06-13')
  assert.equal(mood.createdAt, '2026-06-13T08:30:00.000Z')
})
