const assert = require('node:assert/strict')
const test = require('node:test')
const { buildRecentStatusStats } = require('../services/stats')

test('个人页最近状态统计来自首页每日状态记录', () => {
  const stats = buildRecentStatusStats([
    { userId: 'me', date: '2026-06-08', status: 'happy' },
    { userId: 'partner', date: '2026-06-08', status: 'happy' },
    { userId: 'me', date: '2026-06-09', status: 'tired' },
    { userId: 'partner', date: '2026-06-14', status: 'happy' },
    { userId: 'me', date: '2026-06-07', status: 'happy' }
  ], [
    { weekTag: 'current' },
    { weekTag: 'previous' }
  ], '2026-06-14')

  assert.deepEqual(stats, [
    {
      value: 2,
      title: '本周开心天数',
      desc: '来自首页每日状态'
    },
    {
      value: 1,
      title: '本周想你次数',
      desc: '包含发出和收到的想你信号'
    },
    {
      value: 4,
      title: '本周状态记录',
      desc: '来自首页每日状态'
    }
  ])
})
