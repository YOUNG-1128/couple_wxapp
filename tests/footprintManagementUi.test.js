const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

test('足迹页只为手动足迹提供编辑和删除操作', () => {
  const wxml = fs.readFileSync(path.join(__dirname, '../pages/footprint/footprint.wxml'), 'utf8')
  const pageJs = fs.readFileSync(path.join(__dirname, '../pages/footprint/footprint.js'), 'utf8')

  assert.match(wxml, /item\.sourceType === 'manual'/)
  assert.match(wxml, /onEditFootprint/)
  assert.match(wxml, /onRemoveFootprint/)
  assert.match(pageJs, /updateFootprintAsync/)
  assert.match(pageJs, /removeFootprintAsync/)
})
