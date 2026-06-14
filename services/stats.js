const { getState } = require('./local-state')
const {
  buildRelationshipStatPool,
  selectDailyStats
} = require('../utils/relationship-stats')

function getRecentStatusStats() {
  return buildDailyRelationshipStats(getRelationshipStatsData(), new Date())
}

function buildDailyRelationshipStats(data = {}, today = new Date()) {
  const pool = buildRelationshipStatPool(data, today)

  return selectDailyStats(pool, today)
}

function getRelationshipStatsData() {
  const companion = getState('companion') || {}
  const capsuleState = getState('capsule') || {}
  const session = getState('session') || {}

  return {
    statusRecords: getState('statusRecords') || [],
    missHistory: companion.missHistory || [],
    letters: getState('letters') || [],
    posts: getState('posts') || [],
    todos: getState('todos') || [],
    footprints: getState('footprints') || [],
    bucketList: getState('bucketList') || [],
    anniversaries: getState('anniversaries') || [],
    capsules: capsuleState.capsules || [],
    questionDailyRecords: getState('questionDailyRecords') || [],
    relationshipStartDate: session.relationshipStartDate || ''
  }
}

module.exports = {
  getRecentStatusStats,
  buildDailyRelationshipStats
}
