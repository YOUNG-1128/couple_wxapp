const COLLECTIONS = [
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
]

function isCollectionExistsError(error) {
  if (error && Number(error.errCode) === -502005) {
    return true
  }

  const message = String((error && (error.errMsg || error.message)) || '').toLowerCase()
  return message.includes('already exists')
    || message.includes('collection exists')
    || message.includes('集合已存在')
}

function validateInitToken(expectedToken, receivedToken) {
  return Boolean(expectedToken && receivedToken && expectedToken === receivedToken)
}

async function initializeCollections(db, collectionNames = COLLECTIONS) {
  const result = {
    created: [],
    existing: [],
    failed: []
  }

  for (const name of collectionNames) {
    try {
      await db.createCollection(name)
      result.created.push(name)
    } catch (error) {
      if (isCollectionExistsError(error)) {
        result.existing.push(name)
        continue
      }

      result.failed.push({
        name,
        errorMessage: String((error && (error.errMsg || error.message)) || 'create_collection_failed')
      })
    }
  }

  return result
}

module.exports = {
  COLLECTIONS,
  initializeCollections,
  isCollectionExistsError,
  validateInitToken
}
