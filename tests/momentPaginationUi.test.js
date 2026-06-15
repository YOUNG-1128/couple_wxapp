const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('动态页滚动到底部加载下一页并显示分页状态', () => {
  const wxml = fs.readFileSync(path.join(__dirname, '../pages/album/album.wxml'), 'utf8')
  const pageJs = fs.readFileSync(path.join(__dirname, '../pages/album/album.js'), 'utf8')

  assert.match(wxml, /bindscrolltolower="onLoadMore"/)
  assert.match(wxml, /loadingMore/)
  assert.match(wxml, /已经看完啦/)
  assert.match(pageJs, /onLoadMore\(\)/)
  assert.match(pageJs, /getMomentsFeedPageAsync/)
  assert.match(pageJs, /allFeed\.slice\(0, this\.data\.nextOffset/)
})
