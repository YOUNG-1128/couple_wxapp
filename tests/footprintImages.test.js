const assert = require('node:assert/strict')
const test = require('node:test')
const {
  appendFootprintImages,
  removeFootprintImage
} = require('../utils/footprint-images')

test('足迹图片最多保留四张并可按下标移除', () => {
  assert.deepEqual(
    appendFootprintImages(['a.jpg'], ['b.jpg', 'c.jpg', 'd.jpg', 'e.jpg']),
    ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']
  )
  assert.deepEqual(
    removeFootprintImage(['a.jpg', 'b.jpg', 'c.jpg'], 1),
    ['a.jpg', 'c.jpg']
  )
})
