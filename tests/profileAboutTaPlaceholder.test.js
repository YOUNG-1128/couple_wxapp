const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const rootDir = path.resolve(__dirname, '..')
const profileWxml = fs.readFileSync(path.join(rootDir, 'pages/profile/profile.wxml'), 'utf8')
const profileJs = fs.readFileSync(path.join(rootDir, 'pages/profile/profile.js'), 'utf8')

test('关于 TA 的示例占位文案使用真实换行而不是 HTML 实体', () => {
  assert.doesNotMatch(profileWxml, /&#10;/)
  assert.match(profileWxml, /placeholder="\{\{aboutTaPlaceholder\}\}"/)
  assert.match(profileJs, /aboutTaPlaceholder:\s*'例如：\\n喜欢热拿铁，少糖\\n最近很想去海边\\n难过时先抱抱，不要急着讲道理'/)
})
