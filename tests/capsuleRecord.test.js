const assert = require('node:assert/strict')
const test = require('node:test')
const {
  normalizeCapsuleInput,
  redactLockedCapsule
} = require('../cloudfunctions/createCapsule/capsule-record')

test('创建胶囊时校验标题、正文和开启日期', () => {
  assert.deepEqual(normalizeCapsuleInput({
    title: ' 写给未来 ',
    content: ' 一段秘密 ',
    openAt: '2026-06-20',
    type: 'custom'
  }, '2026-06-12'), {
    title: '写给未来',
    content: '一段秘密',
    openAt: '2026-06-20',
    type: 'custom'
  })
  assert.throws(() => normalizeCapsuleInput({
    title: '无效',
    content: '无效',
    openAt: '2026-06-11'
  }, '2026-06-12'), /open_at_in_past/)
})

test('锁定胶囊不会向客户端返回正文', () => {
  assert.deepEqual(redactLockedCapsule({
    capsuleId: 'capsule-1',
    title: '未来',
    content: '不能提前看到',
    status: 'locked'
  }), {
    capsuleId: 'capsule-1',
    title: '未来',
    content: '',
    status: 'locked',
    contentLocked: true
  })
})

test('到期但尚未主动开启的胶囊仍隐藏正文', () => {
  assert.equal(redactLockedCapsule({
    content: '到期后的秘密',
    status: 'available',
    isOpened: false
  }).content, '')
})
