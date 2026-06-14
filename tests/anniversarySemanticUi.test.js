const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const anniversaryDir = path.join(__dirname, '..', 'pages', 'anniversary')
const detailDir = path.join(__dirname, '..', 'pages', 'anniversary-detail')
const anniversaryWxml = fs.readFileSync(path.join(anniversaryDir, 'anniversary.wxml'), 'utf8')
const anniversaryJs = fs.readFileSync(path.join(anniversaryDir, 'anniversary.js'), 'utf8')
const detailWxml = fs.readFileSync(path.join(detailDir, 'anniversary-detail.wxml'), 'utf8')

test('新增纪念日只提供一个生日语义模板', () => {
  assert.match(anniversaryWxml, /wx:for="\{\{occasionTemplates\}\}"/)
  assert.match(anniversaryJs, /label: '生日', type: 'birthday'/)
  assert.doesNotMatch(anniversaryJs, /partner_birthday|my_birthday/)
})

test('创建表单和年度纪念日展示隐藏每年重复', () => {
  assert.doesNotMatch(anniversaryWxml, /data-repeat-type=/)
  assert.doesNotMatch(anniversaryWxml, />每年重复</)
  assert.doesNotMatch(detailWxml, /每年重复/)
})

test('列表和详情展示语义化经过时间文案', () => {
  assert.match(anniversaryWxml, /\{\{item\.elapsedText\}\}/)
  assert.match(detailWxml, /\{\{detail\.elapsedText\}\}/)
})
