const assert = require('node:assert/strict')
const test = require('node:test')
const momentsService = require('../services/moments')
const { buildLinkedPostUrl } = require('../utils/footprint-navigation')

test('关联动态跳转地址携带安全编码的 postId', () => {
  assert.equal(
    buildLinkedPostUrl('post id/1001'),
    '/pages/album/album?postId=post%20id%2F1001'
  )
  assert.equal(buildLinkedPostUrl(''), '')
})

test('相册可以按 postId 只展示目标动态', () => {
  const feed = momentsService.getMomentsFeed({
    postId: 'post-1001'
  })

  assert.equal(feed.length, 1)
  assert.equal(feed[0].postId, 'post-1001')
})
