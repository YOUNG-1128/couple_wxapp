const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const pageDir = path.join(__dirname, '..', 'pages', 'anniversary-detail')
const wxml = fs.readFileSync(path.join(pageDir, 'anniversary-detail.wxml'), 'utf8')
const js = fs.readFileSync(path.join(pageDir, 'anniversary-detail.js'), 'utf8')

test('详情页背景按钮阻止头图预览并提供完整背景操作', () => {
  assert.match(wxml, /catchtap="onToggleBackgroundPanel"/)
  assert.match(wxml, /bindtap="onChooseBackgroundImage"/)
  assert.match(wxml, /bindtap="onSelectBackgroundColor"/)
  assert.match(wxml, /bindtap="onRemoveBackgroundImage"/)
  assert.match(js, /cloudStorageService\.uploadFile/)
  assert.match(js, /anniversaryService\.saveAnniversaryAsync/)
})

test('详情页聚焦倒数和回忆时间线，不提供重复功能入口', () => {
  assert.doesNotMatch(wxml, /记录新的回忆|bindtap="onCreatePost"|bindtap="onWriteLetter"/)
  assert.doesNotMatch(js, /pages\/album-compose\/album-compose|pages\/mailbox-compose\/mailbox-compose/)
})

test('列表收起操作后详情页仍可编辑和删除纪念日', () => {
  assert.match(wxml, /bindtap="onEditInfo"/)
  assert.match(wxml, /bindtap="onRemoveAnniversary"/)
  assert.match(js, /pages\/anniversary\/anniversary\?editId=/)
  assert.match(js, /anniversaryService\.removeAnniversaryAsync/)
})
