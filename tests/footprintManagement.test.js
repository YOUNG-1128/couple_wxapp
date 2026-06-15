const assert = require('node:assert/strict')
const test = require('node:test')
const { getState, updateState } = require('../services/local-state')
const footprintService = require('../services/footprint')

function removeTestFootprints() {
  updateState('footprints', (footprints) => {
    for (let index = footprints.length - 1; index >= 0; index -= 1) {
      if (String(footprints[index].footprintId || '').startsWith('test-manage-footprint')) {
        footprints.splice(index, 1)
      }
    }
  })
}

test('手动足迹可以编辑并保留来源和创建时间', () => {
  const footprintId = 'test-manage-footprint-manual'
  const createdAt = '2026-06-01T10:00:00+08:00'

  removeTestFootprints()
  updateState('footprints', (footprints) => {
    footprints.push({
      footprintId,
      sourceType: 'manual',
      sourceId: '',
      title: '编辑前',
      city: { name: '香港', province: '香港', country: '中国' },
      images: [],
      createdAt
    })
  })

  const updated = footprintService.updateFootprint(footprintId, {
    title: '编辑后',
    city: {
      code: '310000',
      name: '上海',
      province: '上海',
      country: '中国',
      latitude: 31.2304,
      longitude: 121.4737
    },
    placeName: '外滩',
    date: '2026-06-15',
    note: '一起散步',
    images: ['cloud://footprint.jpg']
  })

  assert.equal(updated.footprintId, footprintId)
  assert.equal(updated.sourceType, 'manual')
  assert.equal(updated.createdAt, createdAt)
  assert.equal(updated.title, '编辑后')
  assert.equal(updated.city.name, '上海')
  assert.equal(updated.placeName, '外滩')
  assert.deepEqual(updated.images, ['cloud://footprint.jpg'])

  removeTestFootprints()
})

test('只能删除手动足迹，动态生成的足迹不受影响', () => {
  const manualId = 'test-manage-footprint-remove-manual'
  const postId = 'test-manage-footprint-remove-post'

  removeTestFootprints()
  updateState('footprints', (footprints) => {
    footprints.push(
      { footprintId: manualId, sourceType: 'manual', sourceId: '' },
      { footprintId: postId, sourceType: 'post', sourceId: 'post-1' }
    )
  })

  assert.equal(footprintService.removeFootprint(manualId), true)
  assert.equal(footprintService.removeFootprint(postId), false)
  assert.equal(footprintService.updateFootprint(postId, { title: '不应更新' }), null)
  assert.equal(getState('footprints').some((item) => item.footprintId === manualId), false)
  assert.equal(getState('footprints').find((item) => item.footprintId === postId).title, undefined)

  removeTestFootprints()
})
