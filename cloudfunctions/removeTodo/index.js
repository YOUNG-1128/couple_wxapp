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

    await db.collection(TODO_COLLECTION).doc(todo._id).remove()

    return {
      success: true,
      todoId
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'remove_todo_failed'
    }
  }
}
