const assert = require('node:assert/strict')
const test = require('node:test')
const pendingService = require('../services/pending')

test('首页待处理项的兜底时间使用运行时真实时间', () => {
  const date = new Date('2026-06-13T08:30:00.000Z')

  assert.equal(pendingService.getFallbackCreatedAt(date), '2026-06-13T08:30:00.000Z')
})
