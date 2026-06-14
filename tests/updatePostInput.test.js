const assert = require('node:assert/strict')
const test = require('node:test')

function loadUpdateHelper() {
  try {
    return require('../cloudfunctions/updatePost/post-update')
  } catch (error) {
    return {}
  }
}

test('动态编辑输入会清理正文并限制图片数量', () => {
  const { normalizeUpdatePayload } = loadUpdateHelper()

  assert.equal(typeof normalizeUpdatePayload, 'function')
  assert.deepEqual(normalizeUpdatePayload({
    postId: ' post-1001 ',
    content: '  新内容  ',
    images: ['1', '2', '3', '4', '5']
  }), {
    postId: 'post-1001',
    content: '新内容',
    images: ['1', '2', '3', '4'],
    location: {},
    shouldCreateFootprint: false
  })
  assert.throws(() => normalizeUpdatePayload({ postId: '', content: '' }), /post_id_required/)
  assert.throws(() => normalizeUpdatePayload({ postId: 'post-1001', content: '', images: [] }), /post_content_required/)
})
