const assert = require('node:assert/strict')
const test = require('node:test')
const {
  COLLECTIONS,
  initializeCollections,
  isCollectionExistsError,
  validateInitToken
} = require('./init-db')

test('包含项目当前需要的全部云数据库集合', () => {
  assert.deepEqual(COLLECTIONS, [
    'users',
    'couples',
    'letters',
    'posts',
    'todos',
    'dailyQuestions',
    'missSignals',
    'statusRecords',
    'bucketListItems',
    'capsules',
    'footprints',
    'anniversaries'
  ])
})

test('将已存在集合和创建失败分别归类', async () => {
  const db = {
    async createCollection(name) {
      if (name === 'users') {
        throw new Error('collection already exists')
      }

      if (name === 'letters') {
        throw new Error('network unavailable')
      }
    }
  }

  const result = await initializeCollections(db, ['users', 'couples', 'letters'])

  assert.deepEqual(result, {
    created: ['couples'],
    existing: ['users'],
    failed: [{ name: 'letters', errorMessage: 'network unavailable' }]
  })
})

test('识别 CloudBase 集合已存在错误', () => {
  assert.equal(isCollectionExistsError({ errMsg: 'Collection exists' }), true)
  assert.equal(isCollectionExistsError({ errCode: -502005, errMsg: '集合已存在' }), true)
  assert.equal(isCollectionExistsError(new Error('permission denied')), false)
})

test('初始化令牌必须已配置且与请求一致', () => {
  assert.equal(validateInitToken('secret-token', 'secret-token'), true)
  assert.equal(validateInitToken('secret-token', 'wrong-token'), false)
  assert.equal(validateInitToken('', ''), false)
})
