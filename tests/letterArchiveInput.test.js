const assert = require('node:assert/strict')
const test = require('node:test')
const {
  normalizeArchiveInput,
  updateArchivedUserIds
} = require('../cloudfunctions/updateLetterArchiveStatus/letter-archive')

test('归档云函数校验信件 ID 和归档状态', () => {
  assert.deepEqual(normalizeArchiveInput({ letterId: ' letter-1 ', archived: true }), {
    letterId: 'letter-1',
    archived: true
  })
  assert.throws(() => normalizeArchiveInput({ letterId: '', archived: true }), /letter_id_required/)
  assert.throws(() => normalizeArchiveInput({ letterId: 'letter-1', archived: 'yes' }), /archive_status_required/)
})

test('归档用户列表可以幂等添加和恢复', () => {
  assert.deepEqual(updateArchivedUserIds(['partner'], 'me', true), ['partner', 'me'])
  assert.deepEqual(updateArchivedUserIds(['partner', 'me'], 'me', true), ['partner', 'me'])
  assert.deepEqual(updateArchivedUserIds(['partner', 'me'], 'me', false), ['partner'])
})
