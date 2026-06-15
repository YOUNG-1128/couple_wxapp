const assert = require('node:assert/strict')
const test = require('node:test')
const { getState, updateState } = require('../services/local-state')
const momentsService = require('../services/moments')

function addTestPost(post) {
  updateState('posts', (posts) => {
    posts.push(post)
  })
}

function removeTestPost(postId) {
  updateState('posts', (posts) => {
    const index = posts.findIndex((post) => post.postId === postId)

    if (index >= 0) {
      posts.splice(index, 1)
    }
  })
}

test('评论作者可以删除自己的评论', () => {
  const postId = 'test-own-comment-removal'
  addTestPost({
    postId,
    authorId: 'partner',
    createdAt: '2026-06-15T10:00:00+08:00',
    comments: [
      { commentId: 'own-comment', userId: 'me', content: '我的评论', createdAt: '2026-06-15T10:01:00+08:00' },
      { commentId: 'partner-comment', userId: 'partner', content: 'TA 的评论', createdAt: '2026-06-15T10:02:00+08:00' }
    ]
  })

  assert.equal(momentsService.removeComment(postId, 'own-comment'), true)
  assert.deepEqual(getState('posts').find((post) => post.postId === postId).comments.map((item) => item.commentId), ['partner-comment'])
  removeTestPost(postId)
})

test('动态作者可以删除自己动态下的评论', () => {
  const postId = 'test-post-owner-comment-removal'
  addTestPost({
    postId,
    authorId: 'me',
    createdAt: '2026-06-15T10:00:00+08:00',
    comments: [
      { commentId: 'partner-comment', userId: 'partner', content: 'TA 的评论', createdAt: '2026-06-15T10:02:00+08:00' }
    ]
  })

  assert.equal(momentsService.removeComment(postId, 'partner-comment'), true)
  assert.equal(getState('posts').find((post) => post.postId === postId).comments.length, 0)
  removeTestPost(postId)
})

test('不能删除伴侣动态下伴侣发布的评论', () => {
  const postId = 'test-forbidden-comment-removal'
  addTestPost({
    postId,
    authorId: 'partner',
    createdAt: '2026-06-15T10:00:00+08:00',
    comments: [
      { commentId: 'partner-comment', userId: 'partner', content: 'TA 的评论', createdAt: '2026-06-15T10:02:00+08:00' }
    ]
  })

  assert.equal(momentsService.removeComment(postId, 'partner-comment'), false)
  assert.equal(getState('posts').find((post) => post.postId === postId).comments.length, 1)
  removeTestPost(postId)
})
