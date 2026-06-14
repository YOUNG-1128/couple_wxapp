const assert = require('assert')
const {
  calculateLoveDays,
  formatRelationshipDate,
  getOpeningMode,
  isValidRelationshipDate
} = require('../utils/relationship')

assert.strictEqual(isValidRelationshipDate('2024-11-20', '2026-06-12'), true)
assert.strictEqual(isValidRelationshipDate('2026-06-13', '2026-06-12'), false)
assert.strictEqual(isValidRelationshipDate('2026-02-30', '2026-06-12'), false)
assert.strictEqual(isValidRelationshipDate('2026.06.12', '2026-06-12'), false)

assert.strictEqual(calculateLoveDays('2026-06-12', '2026-06-12'), 1)
assert.strictEqual(calculateLoveDays('2026-06-11', '2026-06-12'), 2)
assert.strictEqual(calculateLoveDays('', '2026-06-12'), 0)
assert.strictEqual(formatRelationshipDate('2024-11-20'), '2024.11.20')

assert.strictEqual(getOpeningMode({ isCloudLoggedIn: false, status: 'unbound' }), 'solo')
assert.strictEqual(getOpeningMode({ isCloudLoggedIn: true, status: 'pending' }), 'inviting')
assert.strictEqual(getOpeningMode({ isCloudLoggedIn: true, status: 'bound', justConnected: true }), 'just-connected')
assert.strictEqual(getOpeningMode({ isCloudLoggedIn: true, status: 'bound', relationshipStartDate: '' }), 'choose-start-date')
assert.strictEqual(getOpeningMode({ isCloudLoggedIn: true, status: 'bound', relationshipStartDate: '2024-11-20' }), 'story')

console.log('relationship tests passed')
