const assert = require('node:assert/strict')
const test = require('node:test')
const { normalizeCreateTodoInput } = require('../cloudfunctions/createTodo/todo-input')
const { canAccessTodo } = require('../cloudfunctions/getTodos/todo-access')
const { canManageTodo } = require('../cloudfunctions/toggleTodoStatus/todo-access')

test('创建待办时个人待办永远归当前用户', () => {
  assert.deepEqual(normalizeCreateTodoInput({
    title: '  我的事  ',
    ownerType: 'user',
    ownerUserId: 'partner',
    note: '  备注  '
  }, 'me'), {
    title: '我的事',
    note: '备注',
    dueDate: '',
    ownerType: 'user',
    ownerUserId: 'me'
  })

  assert.equal(normalizeCreateTodoInput({ title: '一起做', ownerType: 'couple' }, 'me').ownerType, 'couple')
  assert.throws(() => normalizeCreateTodoInput({ title: '' }, 'me'), /title_required/)
})

test('云函数只允许访问自己的个人待办或情侣待办', () => {
  assert.equal(canAccessTodo({ ownerType: 'user', ownerUserId: 'me' }, 'me'), true)
  assert.equal(canAccessTodo({ ownerType: 'user', ownerUserId: 'partner' }, 'me'), false)
  assert.equal(canAccessTodo({ ownerType: 'couple', ownerUserId: '' }, 'me'), true)
  assert.equal(canManageTodo({ ownerType: 'user', ownerUserId: 'partner' }, 'me'), false)
  assert.equal(canManageTodo({ ownerType: 'couple', ownerUserId: '' }, 'me'), true)
})
