const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const USER_COLLECTION = 'users'
const TODO_COLLECTION = 'todos'

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
    const todoId = event && event.todoId
    const nextStatus = event && event.nextStatus === 'done' ? 'done' : 'pending'

    if (!currentUser.coupleId) {
      throw new Error('couple_not_bound')
    }

    if (!todoId) {
      throw new Error('todo_id_required')
    }

    const todoRes = await db.collection(TODO_COLLECTION).where({
      coupleId: currentUser.coupleId,
      todoId
    }).limit(1).get()
    const todo = todoRes.data && todoRes.data[0]

    if (!todo || !todo._id) {
      throw new Error('todo_not_found')
    }

    const now = new Date().toISOString()
    await db.collection(TODO_COLLECTION).doc(todo._id).update({
      data: {
        status: nextStatus,
        completedAt: nextStatus === 'done' ? now : null,
        updatedAt: now
      }
    })

    return {
      success: true,
      todo: {
        ...todo,
        status: nextStatus,
        completedAt: nextStatus === 'done' ? now : null,
        updatedAt: now
      }
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'toggle_todo_status_failed'
    }
  }
}
