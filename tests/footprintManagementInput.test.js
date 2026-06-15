const assert = require('node:assert/strict')
const test = require('node:test')
const {
  normalizeFootprintId,
  normalizeManualFootprintInput
} = require('../cloudfunctions/updateFootprintManual/footprint-management')

test('足迹管理云函数校验足迹 ID', () => {
  assert.equal(normalizeFootprintId({ footprintId: ' fp-1 ' }), 'fp-1')
  assert.throws(() => normalizeFootprintId({ footprintId: '' }), /footprint_id_required/)
})

test('编辑手动足迹时规范字段并限制图片数量', () => {
  const payload = normalizeManualFootprintInput({
    footprintId: ' fp-1 ',
    title: '  周末散步  ',
    city: {
      code: '310000',
      name: ' 上海 ',
      province: '上海',
      latitude: 31.2304,
      longitude: 121.4737
    },
    placeName: ' 外滩 ',
    note: ' 一起吹风 ',
    images: ['a', '', 'b', 'c', 'd', 'e']
  })

  assert.equal(payload.footprintId, 'fp-1')
  assert.equal(payload.title, '周末散步')
  assert.equal(payload.city.name, '上海')
  assert.equal(payload.placeName, '外滩')
  assert.equal(payload.note, '一起吹风')
  assert.deepEqual(payload.images, ['a', 'b', 'c', 'd'])
  assert.throws(() => normalizeManualFootprintInput({ footprintId: 'fp-1', city: {} }), /city_required/)
})
