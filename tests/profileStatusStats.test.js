const assert = require('node:assert/strict')
const test = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const { buildDailyRelationshipStats } = require('../services/stats')

test('个人页每日小报告从多个关系模块中稳定选择三项', () => {
  const stats = buildDailyRelationshipStats({
    statusRecords: [{ userId: 'me', date: '2026-06-14', status: 'happy' }],
    missHistory: [{ weekTag: 'current' }],
    letters: [{ status: 'scheduled', visibleAt: '2026-06-16' }],
    posts: [{ createdAt: '2026-06-14', images: [], comments: [] }],
    todos: [{ completed: false }],
    footprints: [{ city: { name: '香港' }, images: [] }],
    bucketList: [{ completed: false }],
    anniversaries: [{ title: '恋爱纪念日', date: '2024-06-20', repeatType: 'yearly' }],
    capsules: [],
    questionDailyRecords: [],
    relationshipStartDate: '2024-11-20'
  }, '2026-06-14')

  assert.equal(stats.length, 3)
  assert.deepEqual(new Set(stats.map((item) => item.category)), new Set(['highlight', 'recent', 'countdown']))
  assert.ok(stats.every((item) => item.value > 0))
})

test('个人页统计板块显示今日小报告标题', () => {
  const wxml = fs.readFileSync(
    path.join(__dirname, '../components/profile-status-stats/profile-status-stats.wxml'),
    'utf8'
  )

  assert.match(wxml, /我们的今日小报告/)
  assert.match(wxml, /每天发现一点不一样/)
})
