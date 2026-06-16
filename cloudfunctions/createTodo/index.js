const cloud = require('wx-server-sdk')
const { normalizeCreateTodoInput } = require('./todo-input')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const TODO_COLLECTION = 'todos'

function createTodoId() {
  return `todo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    throw new Error('openid_missing')
  }

  const userRes = await db.collection(USER_COLLECTION).where({
    openId: OPENID
  }).limit(1).get()
  const user = userRes.data && userRes.data[0]

  if (!user || !user.userId) {
    throw new Error('user_not_found')
  }

  return user
}

exports.main = async (event) => {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    const payload = normalizeCreateTodoInput(event, currentUser.userId)
    const now = new Date().toISOString()

    const todo = {
      todoId: createTodoId(),
      coupleId: currentUser.coupleId,
      ownerType: payload.ownerType,
      ownerUserId: payload.ownerUserId,
      title: payload.title,
      note: payload.note,
      dueDate: payload.dueDate,
      status: 'pending',
      completedAt: null,
      createdAt: now,
      updatedAt: now
    }

    await db.collection(TODO_COLLECTION).add({
      data: todo
    })

    return {
      success: true,
      todo
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'create_todo_failed'
    }
  }
}
