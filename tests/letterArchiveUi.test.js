const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('信箱页提供来往与归档切换及恢复操作', () => {
  const wxml = fs.readFileSync(path.join(__dirname, '../pages/mailbox/mailbox.wxml'), 'utf8')
  const pageJs = fs.readFileSync(path.join(__dirname, '../pages/mailbox/mailbox.js'), 'utf8')

  assert.match(wxml, /来往/)
  assert.match(wxml, /归档/)
  assert.match(wxml, /onToggleArchive/)
  assert.match(pageJs, /onToggleArchive\(event\)/)
  assert.match(pageJs, /setLetterArchivedAsync/)
})
