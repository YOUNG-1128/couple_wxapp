const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('动态评论列表为可管理评论提供删除入口', () => {
  const wxml = fs.readFileSync(path.join(__dirname, '../pages/album/album.wxml'), 'utf8')
  const pageJs = fs.readFileSync(path.join(__dirname, '../pages/album/album.js'), 'utf8')

  assert.match(wxml, /comment\.canRemove/)
  assert.match(wxml, /bindtap="onRemoveComment"/)
  assert.match(pageJs, /onRemoveComment\(event\)/)
  assert.match(pageJs, /momentsService\.removeCommentAsync/)
})
