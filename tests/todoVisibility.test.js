const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const { getState, updateState } = require('../services/local-state')
const todoService = require('../services/todo')

function cleanupTestTodos() {
  updateState('todos', (todos) => {
    for (let index = todos.length - 1; index >= 0; index -= 1) {
      if (String(todos[index].todoId || '').startsWith('test-todo-')) {
        todos.splice(index, 1)
      }
    }
  })
}

test('个人待办只对创建者可见，情侣待办双方可见', () => {
  cleanupTestTodos()
  updateState('todos', (todos) => {
    todos.push(
      {
        todoId: 'test-todo-mine',
        title: '我的个人待办',
        type: 'personal',
        ownerId: 'me',
        participants: ['me'],
        completed: false,
        dueDate: '2026-06-16',
        createdAt: '2026-06-16T08:00:00+08:00'
      },
      {
        todoId: 'test-todo-partner',
        title: 'TA 的个人待办',
        type: 'personal',
        ownerId: 'partner',
        participants: ['partner'],
        completed: false,
        dueDate: '2026-06-16',
        createdAt: '2026-06-16T08:00:00+08:00'
      },
      {
        todoId: 'test-todo-couple',
        title: '情侣待办',
        type: 'couple',
        ownerId: null,
        participants: ['me', 'partner'],
        completed: false,
        dueDate: '2026-06-16',
        createdAt: '2026-06-16T08:00:00+08:00'
      }
    )
  })

  const pageData = todoService.getTodoPageData('all')
  const ids = pageData.todos.map((todo) => todo.todoId)

  assert.equal(ids.includes('test-todo-mine'), true)
  assert.equal(ids.includes('test-todo-couple'), true)
  assert.equal(ids.includes('test-todo-partner'), false)

  const mine = todoService.getTodoPageData('me').todos.map((todo) => todo.todoId)
  const couple = todoService.getTodoPageData('couple').todos.map((todo) => todo.todoId)

  assert.equal(mine.includes('test-todo-mine'), true)
  assert.equal(mine.includes('test-todo-couple'), false)
  assert.equal(couple.includes('test-todo-couple'), true)
  assert.equal(couple.includes('test-todo-mine'), false)

  cleanupTestTodos()
})

test('不能替对方创建、完成或删除个人待办', () => {
  cleanupTestTodos()
  const created = todoService.createTodo({
    title: '不应归给 TA',
    type: 'personal',
    ownerId: 'partner'
  })

  assert.equal(created.ownerId, 'me')
  assert.deepEqual(created.participants, ['me'])

  updateState('todos', (todos) => {
    todos.push({
      todoId: 'test-todo-forbidden',
      title: 'TA 的个人待办',
      type: 'personal',
      ownerId: 'partner',
      participants: ['partner'],
      completed: false,
      createdAt: '2026-06-16T08:00:00+08:00'
    })
  })

  assert.equal(todoService.toggleTodo('test-todo-forbidden'), null)
  assert.equal(getState('todos').find((todo) => todo.todoId === 'test-todo-forbidden').completed, false)
  assert.equal(todoService.removeTodo('test-todo-forbidden'), false)
  assert.equal(getState('todos').some((todo) => todo.todoId === 'test-todo-forbidden'), true)

  cleanupTestTodos()
})

test('待办页不提供 TA 的个人待办筛选或创建入口', () => {
  const pageJs = fs.readFileSync(path.join(__dirname, '../pages/todo/todo.js'), 'utf8')
  const wxml = fs.readFileSync(path.join(__dirname, '../pages/todo/todo.wxml'), 'utf8')

  assert.doesNotMatch(pageJs, /TA 的/)
  assert.doesNotMatch(pageJs, /key: 'partner'/)
  assert.doesNotMatch(wxml, /TA.*的待办/)
  assert.match(wxml, /情侣待办/)
})
