const assert = require('node:assert/strict')
const test = require('node:test')
const { getState, updateState } = require('../services/local-state')
const momentsService = require('../services/moments')

test('删除自己的动态时只清理该动态生成的足迹', () => {
  const postId = 'test-remove-post'
  const linkedFootprintId = 'test-linked-footprint'
  const manualFootprintId = 'test-manual-footprint'

  updateState('posts', (posts) => {
    posts.push({
      postId,
      authorId: 'me',
      content: '待删除动态',
      createdAt: '2026-06-13T10:00:00+08:00',
      comments: []
    })
  })
  updateState('footprints', (footprints) => {
    footprints.push(
      {
        footprintId: linkedFootprintId,
        sourceType: 'post',
        sourceId: postId
      },
      {
        footprintId: manualFootprintId,
        sourceType: 'manual',
        sourceId: postId
      }
    )
  })

  assert.equal(typeof momentsService.removePost, 'function')
  assert.equal(momentsService.removePost(postId), true)
  assert.equal(getState('posts').some((post) => post.postId === postId), false)
  assert.equal(getState('footprints').some((footprint) => footprint.footprintId === linkedFootprintId), false)
  assert.equal(getState('footprints').some((footprint) => footprint.footprintId === manualFootprintId), true)
})

test('不能删除伴侣发布的动态', () => {
  assert.equal(typeof momentsService.removePost, 'function')
  assert.equal(momentsService.removePost('post-1002'), false)
  assert.equal(getState('posts').some((post) => post.postId === 'post-1002'), true)
})
