const assert = require('node:assert/strict')
const test = require('node:test')
const capsuleService = require('../services/capsule')

test('胶囊状态使用传入的真实日期计算', () => {
  assert.equal(capsuleService.getStatus('2026-06-13', false, '2026-06-12'), 'locked')
  assert.equal(capsuleService.getStatus('2026-06-12', false, '2026-06-12'), 'available')
  assert.equal(capsuleService.getStatus('2026-06-20', true, '2026-06-12'), 'opened')
})

test('一周后的默认日期按当天动态生成', () => {
  assert.equal(capsuleService.getDefaultOpenDate(new Date('2026-06-12T08:00:00.000Z')), '2026-06-19')
})
