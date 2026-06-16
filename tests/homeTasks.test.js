const assert = require('node:assert/strict')
const test = require('node:test')
const { mergeHomeTasks } = require('../utils/home-tasks')

test('首页任务合并时不会重复显示同一个情侣待办提醒', () => {
  const tasks = mergeHomeTasks({
    pendingActions: [
      {
        id: 'partner-couple-todo-todo-1',
        type: 'partner_couple_todo',
        title: 'TA 新建了情侣待办',
        subtitle: '一起订周末电影票',
        actionText: '去完成',
        targetPage: '/pages/todo/todo'
      }
    ],
    todos: [
      {
        todoId: 'todo-1',
        title: '一起订周末电影票',
        dueDate: '2026-06-16'
      }
    ]
  })

  assert.equal(tasks.length, 1)
  assert.equal(tasks[0].type, 'partner_couple_todo')
})

test('首页任务会保留没有重复的普通今日待办', () => {
  const tasks = mergeHomeTasks({
    pendingActions: [
      {
        id: 'anniversary-today-anniversary-1',
        type: 'anniversary_today',
        title: '今天是恋爱纪念日',
        subtitle: '一起记住这个特别的日子',
        actionText: '去看看',
        targetPage: '/pages/anniversary/anniversary'
      }
    ],
    todos: [
      {
        todoId: 'todo-1',
        title: '整理下周行程',
        dueDate: '2026-06-16'
      }
    ]
  })

  assert.equal(tasks.length, 2)
  assert.deepEqual(tasks.map((item) => item.type), ['anniversary_today', 'todo'])
})
