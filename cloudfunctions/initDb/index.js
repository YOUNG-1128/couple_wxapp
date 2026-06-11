const cloud = require('wx-server-sdk')
const {
  initializeCollections,
  validateInitToken
} = require('./init-db')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event) => {
  const expectedToken = process.env.INIT_DB_TOKEN || ''
  const receivedToken = String((event && event.token) || '')

  if (!expectedToken) {
    return {
      success: false,
      errorMessage: 'init_db_token_not_configured'
    }
  }

  if (!validateInitToken(expectedToken, receivedToken)) {
    return {
      success: false,
      errorMessage: 'init_db_unauthorized'
    }
  }

  const result = await initializeCollections(db)

  return {
    success: result.failed.length === 0,
    ...result
  }
}
