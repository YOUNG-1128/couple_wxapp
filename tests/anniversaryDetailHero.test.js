const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const detailDir = path.join(__dirname, '..', 'pages', 'anniversary-detail')
const wxml = fs.readFileSync(path.join(detailDir, 'anniversary-detail.wxml'), 'utf8')
const wxss = fs.readFileSync(path.join(detailDir, 'anniversary-detail.wxss'), 'utf8')

test('纪念日详情头图使用居中的玻璃倒数卡片', () => {
  assert.match(wxml, /class="hero-glass-card"/)
  assert.match(wxml, /\{\{heroCountNumber\}\}/)
  assert.match(wxml, /\{\{heroCountLabel\}\}/)
  assert.match(wxss, /\.hero-glass-card/)
  assert.match(wxss, /background:\s*rgba\(255,\s*255,\s*255,\s*0\.08\)/)
  assert.match(wxss, /backdrop-filter:\s*blur\(6rpx\)/)
  assert.doesNotMatch(wxss, /background:\s*rgba\(32,\s*24,\s*28,\s*0\.24\)/)
})

test('头图不再堆叠经过时间和纪念次数', () => {
  const heroContent = wxml.match(/<view class="hero-glass-card">([\s\S]*?)<\/view>\s*<\/view>\s*<\/view>/)

  assert.ok(heroContent)
  assert.doesNotMatch(heroContent[1], /elapsedText|occurrenceText/)
})
