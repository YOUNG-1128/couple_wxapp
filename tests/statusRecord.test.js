const assert = require('node:assert/strict')
const test = require('node:test')
const {
  ALLOWED_STATUSES,
  getHongKongDateKey,
  normalizeStatusPayload
} = require('../cloudfunctions/upsertStatusRecord/status-record')

test('只接受页面支持的状态值', () => {
  assert.deepEqual(ALLOWED_STATUSES, ['happy', 'normal', 'tired', 'miss', 'busy', 'hug'])
  assert.deepEqual(normalizeStatusPayload({ status: 'happy', note: ' 今天很好 ' }), {
    status: 'happy',
    note: '今天很好'
  })
  assert.throws(() => normalizeStatusPayload({ status: 'unknown' }), /status_invalid/)
})

test('按香港时区生成今日日期', () => {
  assert.equal(getHongKongDateKey(new Date('2026-06-11T16:30:00.000Z')), '2026-06-12')
})
