const assert = require('node:assert/strict')
const test = require('node:test')
const {
  buildRelationshipStatPool,
  selectDailyStats
} = require('../utils/relationship-stats')

const sampleData = {
  statusRecords: [
    { userId: 'me', date: '2026-06-08', status: 'happy' },
    { userId: 'partner', date: '2026-06-08', status: 'happy' },
    { userId: 'me', date: '2026-06-09', status: 'tired' },
    { userId: 'partner', date: '2026-06-14', status: 'happy' }
  ],
  missHistory: [
    { senderUserId: 'me', weekTag: 'current' },
    { senderUserId: 'partner', weekTag: 'current' }
  ],
  letters: [
    { status: 'delivered', sentAt: '2026-06-10T12:00:00+08:00', content: '想你' },
    { status: 'scheduled', visibleAt: '2026-06-16T12:00:00+08:00', content: '晚安' }
  ],
  posts: [
    {
      createdAt: '2026-06-11T12:00:00+08:00',
      images: ['cloud://one'],
      comments: [{ createdAt: '2026-06-12T12:00:00+08:00' }]
    }
  ],
  todos: [
    { completed: true, completedAt: '2026-06-13T12:00:00+08:00' },
    { completed: false }
  ],
  footprints: [
    { city: { name: '香港' }, images: ['cloud://two'] },
    { city: { name: '上海' }, images: [] }
  ],
  bucketList: [
    { completed: true },
    { completed: false }
  ],
  anniversaries: [
    { title: '恋爱纪念日', date: '2024-06-20', repeatType: 'yearly' }
  ],
  capsules: [
    { status: 'locked', openAt: '2026-06-18' }
  ],
  questionDailyRecords: [
    { date: '2026-06-10', myAnswered: true, partnerAnswered: true }
  ],
  relationshipStartDate: '2024-11-20'
}

test('关系统计池覆盖三个类别和至少二十项统计', () => {
  const pool = buildRelationshipStatPool(sampleData, '2026-06-14')

  assert.ok(pool.length >= 20)
  assert.deepEqual(new Set(pool.map((item) => item.category)), new Set(['highlight', 'recent', 'countdown']))
  assert.equal(pool.find((item) => item.id === 'happy-days-week').value, 2)
  assert.equal(pool.find((item) => item.id === 'status-match-days-week').value, 1)
  assert.equal(pool.find((item) => item.id === 'footprint-cities').value, 2)
})

test('每日统计每类选择一项并优先展示非零结果', () => {
  const pool = buildRelationshipStatPool(sampleData, '2026-06-14')
  const selected = selectDailyStats(pool, '2026-06-14')

  assert.equal(selected.length, 3)
  assert.deepEqual(new Set(selected.map((item) => item.category)), new Set(['highlight', 'recent', 'countdown']))
  assert.ok(selected.every((item) => item.value !== 0))
})

test('每日统计同一天保持稳定并在隔天轮换', () => {
  const pool = buildRelationshipStatPool(sampleData, '2026-06-14')
  const first = selectDailyStats(pool, '2026-06-14').map((item) => item.id)
  const repeated = selectDailyStats(pool, '2026-06-14').map((item) => item.id)
  const nextDay = selectDailyStats(pool, '2026-06-15').map((item) => item.id)

  assert.deepEqual(repeated, first)
  assert.notDeepEqual(nextDay, first)
})
