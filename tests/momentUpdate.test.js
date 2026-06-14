const assert = require('node:assert/strict')
const test = require('node:test')
const { getState, updateState } = require('../services/local-state')
const momentsService = require('../services/moments')

test('编辑自己的动态时保留发布时间和评论并同步关联足迹', () => {
  const postId = 'test-update-post'
  const footprintId = 'test-update-footprint'
  const createdAt = '2026-06-01T10:00:00+08:00'
  const comments = [{ commentId: 'test-comment', content: '保留我' }]

  updateState('posts', (posts) => {
    posts.push({
      postId,
      authorId: 'me',
      content: '编辑前',
      images: [],
      location: { enabled: false },
      shouldCreateFootprint: false,
      createdAt,
      updatedAt: createdAt,
      comments
    })
  })
  updateState('footprints', (footprints) => {
    footprints.push({
      footprintId,
      sourceType: 'post',
      sourceId: postId,
      title: '编辑前',
      note: '编辑前'
    })
  })

  assert.equal(typeof momentsService.updatePost, 'function')
  const updated = momentsService.updatePost(postId, {
    content: '编辑后',
    images: ['cloud://updated.jpg'],
    location: {
      enabled: true,
      city: {
        name: '香港',
        latitude: 22.3193,
        longitude: 114.1694
      }
    },
    shouldCreateFootprint: true
  })

  assert.equal(updated.content, '编辑后')
  assert.equal(updated.createdAt, createdAt)
  assert.deepEqual(getState('posts').find((post) => post.postId === postId).comments, comments)

  const footprint = getState('footprints').find((item) => item.footprintId === footprintId)
  assert.equal(footprint.title, '编辑后')
  assert.equal(footprint.note, '编辑后')
  assert.deepEqual(footprint.images, ['cloud://updated.jpg'])
  assert.equal(footprint.city.name, '香港')
})

test('不能编辑伴侣发布的动态', () => {
  assert.equal(typeof momentsService.updatePost, 'function')
  assert.equal(momentsService.updatePost('post-1002', { content: '不应更新' }), null)
  assert.notEqual(getState('posts').find((post) => post.postId === 'post-1002').content, '不应更新')
})
