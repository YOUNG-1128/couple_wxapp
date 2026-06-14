const assert = require('node:assert/strict')
const test = require('node:test')

function loadRemovalHelper() {
  try {
    return require('../cloudfunctions/removePost/post-removal')
  } catch (error) {
    return {}
  }
}

test('删除动态要求有效的 postId', () => {
  const { normalizePostId } = loadRemovalHelper()

  assert.equal(typeof normalizePostId, 'function')
  assert.equal(normalizePostId({ postId: '  post-1001  ' }), 'post-1001')
  assert.throws(() => normalizePostId({ postId: '   ' }), /post_id_required/)
})
