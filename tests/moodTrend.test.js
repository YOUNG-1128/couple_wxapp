const assert = require('node:assert/strict')
const test = require('node:test')
const { buildMoodTrend } = require('../utils/mood-trend')

test('心情趋势只统计当前用户最近七天记录', () => {
  const trend = buildMoodTrend([
    { userId: 'me', date: '2026-06-13', status: 'happy' },
    { userId: 'me', date: '2026-06-12', status: 'happy' },
    { userId: 'me', date: '2026-06-11', status: 'tired' },
    { userId: 'partner', date: '2026-06-13', status: 'busy' },
    { userId: 'me', date: '2026-06-01', status: 'miss' }
  ], 'me', '2026-06-13')

  assert.equal(trend.recordedDays, 3)
  assert.deepEqual(trend.items.filter((item) => item.count > 0), [
    { value: 'happy', label: '开心', count: 2, percentage: 67 },
    { value: 'tired', label: '有点累', count: 1, percentage: 33 }
  ])
})
