const assert = require('node:assert/strict')
const test = require('node:test')
const bucketListService = require('../services/bucket-list')

test('云端完成进度会合并到本地固定清单', () => {
  const merged = bucketListService.mergeCloudProgress([
    {
      itemId: 1,
      completed: true,
      completedAt: '2026-06-12T10:00:00.000Z',
      completedByUserId: 'user-a'
    }
  ])

  assert.equal(merged[0].id, 1)
  assert.equal(merged[0].completed, true)
  assert.equal(merged[0].completedByUserId, 'user-a')
  assert.equal(merged[1].completed, false)
})
