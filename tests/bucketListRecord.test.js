const assert = require('node:assert/strict')
const test = require('node:test')
const {
  normalizeBucketItemInput
} = require('../cloudfunctions/toggleBucketListItem/bucket-list-record')

test('只接受 1 到 100 的清单编号', () => {
  assert.deepEqual(normalizeBucketItemInput({ itemId: 1, title: '一起看电影', completed: true }), {
    itemId: 1,
    title: '一起看电影',
    completed: true
  })
  assert.throws(() => normalizeBucketItemInput({ itemId: 0, title: '无效', completed: true }), /item_id_invalid/)
  assert.throws(() => normalizeBucketItemInput({ itemId: 101, title: '无效', completed: true }), /item_id_invalid/)
})

test('标题必填并限制长度', () => {
  assert.throws(() => normalizeBucketItemInput({ itemId: 1, title: '', completed: true }), /title_required/)
  assert.equal(normalizeBucketItemInput({
    itemId: 1,
    title: '很长'.repeat(40),
    completed: false
  }).title.length, 60)
})
