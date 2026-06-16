const assert = require('node:assert/strict')
const test = require('node:test')
const {
  buildHomePendingActions,
  getLatestVisibleAt
} = require('../utils/pending-actions')

test('首页提醒包含当天纪念日、TA 新动态和 TA 新建情侣待办', () => {
  const actions = buildHomePendingActions({
    currentUserId: 'me',
    today: '2026-06-16',
    lastSeenPostAt: '2026-06-15T12:00:00+08:00',
    lastSeenCoupleTodoAt: '2026-06-15T12:00:00+08:00',
    anniversaries: [
      {
        id: 'anniversary-1',
        title: '恋爱纪念日',
        date: '2024-06-16',
        repeatType: 'yearly',
        type: 'relationship'
      }
    ],
    posts: [
      {
        postId: 'post-1',
        authorId: 'partner',
        authorName: 'TA',
        content: '今天也很想你',
        createdAt: '2026-06-16T09:00:00+08:00'
      }
    ],
    todos: [
      {
        todoId: 'todo-1',
        type: 'couple',
        createdByUserId: 'partner',
        title: '一起订周末电影票',
        createdAt: '2026-06-16T10:00:00+08:00',
        completed: false
      }
    ]
  })

  assert.deepEqual(actions.map((item) => item.type), [
    'anniversary_today',
    'partner_couple_todo',
    'partner_post'
  ])
  assert.equal(actions[0].targetPage, '/pages/anniversary/anniversary')
  assert.equal(actions[1].targetPage, '/pages/todo/todo')
  assert.equal(actions[2].targetPage, '/pages/album/album')
})

test('首页提醒不会展示自己创建或已看过的动态和情侣待办', () => {
  const actions = buildHomePendingActions({
    currentUserId: 'me',
    today: '2026-06-16',
    lastSeenPostAt: '2026-06-16T12:00:00+08:00',
    lastSeenCoupleTodoAt: '2026-06-16T12:00:00+08:00',
    anniversaries: [],
    posts: [
      {
        postId: 'post-1',
        authorId: 'me',
        content: '自己的动态',
        createdAt: '2026-06-16T13:00:00+08:00'
      },
      {
        postId: 'post-2',
        authorId: 'partner',
        content: '已看过的动态',
        createdAt: '2026-06-16T09:00:00+08:00'
      }
    ],
    todos: [
      {
        todoId: 'todo-1',
        type: 'couple',
        createdByUserId: 'me',
        title: '自己创建的情侣待办',
        createdAt: '2026-06-16T13:00:00+08:00',
        completed: false
      },
      {
        todoId: 'todo-2',
        type: 'couple',
        createdByUserId: 'partner',
        title: '已看过的情侣待办',
        createdAt: '2026-06-16T09:00:00+08:00',
        completed: false
      }
    ]
  })

  assert.deepEqual(actions, [])
})

test('最新可见时间会忽略无效日期', () => {
  assert.equal(getLatestVisibleAt([
    { createdAt: 'bad-date' },
    { createdAt: '2026-06-16T09:00:00+08:00' },
    { createdAt: '2026-06-16T11:00:00+08:00' }
  ]), '2026-06-16T11:00:00+08:00')
})
