const assert = require('node:assert/strict')
const test = require('node:test')
const { normalizePaginationInput } = require('../cloudfunctions/getPostsFeed/pagination')

test('动态云函数分页参数限制在安全范围内', () => {
  assert.deepEqual(normalizePaginationInput({ offset: 10, pageSize: 12 }), {
    offset: 10,
    pageSize: 12
  })
  assert.deepEqual(normalizePaginationInput({ offset: -4, pageSize: 100 }), {
    offset: 0,
    pageSize: 20
  })
  assert.deepEqual(normalizePaginationInput({}), {
    offset: 0,
    pageSize: 10
  })
})
