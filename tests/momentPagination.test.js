const assert = require('node:assert/strict')
const test = require('node:test')
const { paginateMoments } = require('../utils/moment-pagination')
const momentsService = require('../services/moments')

test('动态分页返回当前页、下一页偏移量和是否还有更多', () => {
  const posts = Array.from({ length: 23 }, (_, index) => ({ postId: `post-${index + 1}` }))
  const firstPage = paginateMoments(posts, { offset: 0, pageSize: 10 })
  const lastPage = paginateMoments(posts, { offset: 20, pageSize: 10 })

  assert.equal(firstPage.items.length, 10)
  assert.equal(firstPage.hasMore, true)
  assert.equal(firstPage.nextOffset, 10)
  assert.equal(lastPage.items.length, 3)
  assert.equal(lastPage.hasMore, false)
  assert.equal(lastPage.nextOffset, 23)
})

test('本地动态服务按页返回数据', async () => {
  const page = await momentsService.getMomentsFeedPageAsync({
    offset: 0,
    pageSize: 1,
    reset: true
  })

  assert.equal(page.items.length, 1)
  assert.equal(page.hasMore, true)
  assert.equal(page.nextOffset, 1)
})
