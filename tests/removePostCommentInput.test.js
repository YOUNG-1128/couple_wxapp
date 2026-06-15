const assert = require('node:assert/strict')
const test = require('node:test')

function loadRemovalHelper() {
  try {
    return require('../cloudfunctions/removePostComment/comment-removal')
  } catch (error) {
    return {}
  }
}

test('删除评论要求有效的动态和评论 ID', () => {
  const { normalizeCommentRemovalInput } = loadRemovalHelper()

  assert.equal(typeof normalizeCommentRemovalInput, 'function')
  assert.deepEqual(normalizeCommentRemovalInput({
    postId: ' post-1001 ',
    commentId: ' comment-2001 '
  }), {
    postId: 'post-1001',
    commentId: 'comment-2001'
  })
  assert.throws(() => normalizeCommentRemovalInput({ postId: '', commentId: 'comment-2001' }), /post_id_required/)
  assert.throws(() => normalizeCommentRemovalInput({ postId: 'post-1001', commentId: '' }), /comment_id_required/)
})

test('评论作者或动态作者可以删除评论', () => {
  const { canRemoveComment } = loadRemovalHelper()
  const comment = { userId: 'comment-author' }

  assert.equal(canRemoveComment({ authorId: 'post-author' }, comment, 'comment-author'), true)
  assert.equal(canRemoveComment({ authorId: 'post-author' }, comment, 'post-author'), true)
  assert.equal(canRemoveComment({ authorId: 'post-author' }, comment, 'other-user'), false)
})
