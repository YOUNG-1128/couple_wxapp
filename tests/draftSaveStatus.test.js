const assert = require('node:assert/strict')
const test = require('node:test')
const { getDraftSaveStatusView } = require('../utils/draft-save-status')

test('草稿自动保存状态提供清晰提示', () => {
  assert.deepEqual(getDraftSaveStatusView('saving'), {
    text: '正在自动保存...',
    tone: 'saving'
  })
  assert.deepEqual(getDraftSaveStatusView('saved'), {
    text: '已自动保存',
    tone: 'saved'
  })
  assert.deepEqual(getDraftSaveStatusView('failed'), {
    text: '自动保存失败，请手动保存',
    tone: 'failed'
  })
  assert.deepEqual(getDraftSaveStatusView(''), {
    text: '',
    tone: ''
  })
})
