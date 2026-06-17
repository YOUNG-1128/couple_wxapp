const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const {
  buildMapMarkers,
  buildMapSelectionState
} = require('../utils/footprint')

const sampleFootprints = [
  {
    footprintId: 'fp-shanghai-1',
    city: {
      name: '上海',
      province: '上海',
      country: '中国',
      latitude: 31.2304,
      longitude: 121.4737
    },
    createdAt: '2026-06-16T10:00:00+08:00'
  },
  {
    footprintId: 'fp-hangzhou-1',
    city: {
      name: '杭州',
      province: '浙江',
      country: '中国',
      latitude: 30.2741,
      longitude: 120.1551
    },
    createdAt: '2026-06-16T11:00:00+08:00'
  }
]

test('地图 marker 支持按当前城市高亮', () => {
  const { markers } = buildMapMarkers(sampleFootprints, '上海')
  const shanghaiMarker = markers.find((item) => item.callout.content.includes('上海'))
  const hangzhouMarker = markers.find((item) => item.callout.content.includes('杭州'))

  assert.equal(shanghaiMarker.width, 34)
  assert.equal(shanghaiMarker.height, 34)
  assert.equal(hangzhouMarker.width, 28)
  assert.equal(hangzhouMarker.height, 28)
})

test('点击足迹后会生成地图中心、城市和足迹选中态', () => {
  const selection = buildMapSelectionState(sampleFootprints, 'fp-hangzhou-1')

  assert.equal(selection.activeCity, '杭州')
  assert.equal(selection.selectedFootprintId, 'fp-hangzhou-1')
  assert.equal(selection.center.latitude, 30.2741)
  assert.equal(selection.center.longitude, 120.1551)
})

test('足迹页模板包含选中态和卡片点击事件', () => {
  const wxml = fs.readFileSync(path.join(__dirname, '../pages/footprint/footprint.wxml'), 'utf8')
  const js = fs.readFileSync(path.join(__dirname, '../pages/footprint/footprint.js'), 'utf8')
  const wxss = fs.readFileSync(path.join(__dirname, '../pages/footprint/footprint.wxss'), 'utf8')

  assert.match(wxml, /footprint-item \{\{item\.footprintId === selectedFootprintId \? 'footprint-item-active' : ''\}\}/)
  assert.match(wxml, /bindtap="onSelectFootprint"/)
  assert.match(js, /onSelectFootprint/)
  assert.match(wxss, /\.footprint-item-active/)
})
