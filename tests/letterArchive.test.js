const assert = require('node:assert/strict')
const test = require('node:test')
const { getState, updateState } = require('../services/local-state')
const mailboxService = require('../services/mailbox')

function addLetter(letter) {
  updateState('letters', (letters) => {
    letters.push(letter)
  })
}

function removeLetter(letterId) {
  updateState('letters', (letters) => {
    const index = letters.findIndex((letter) => letter.letterId === letterId)
    if (index >= 0) {
      letters.splice(index, 1)
    }
  })
}

test('归档信件只从当前用户的来往列表移入归档列表', () => {
  const letterId = 'test-archive-letter'
  addLetter({
    letterId,
    fromUserId: 'partner',
    toUserId: 'me',
    status: 'delivered',
    sentAt: '2026-06-15T10:00:00+08:00',
    archivedByUserIds: []
  })

  assert.equal(mailboxService.setLetterArchived(letterId, true), true)
  let pageData = mailboxService.getMailboxPageData()
  assert.equal(pageData.history.some((letter) => letter.letterId === letterId), false)
  assert.equal(pageData.archived.some((letter) => letter.letterId === letterId), true)

  assert.equal(mailboxService.setLetterArchived(letterId, false), true)
  pageData = mailboxService.getMailboxPageData()
  assert.equal(pageData.history.some((letter) => letter.letterId === letterId), true)
  removeLetter(letterId)
})

test('不能归档草稿或不属于当前用户的信件', () => {
  const draftId = 'test-archive-draft'
  const otherId = 'test-archive-other'
  addLetter({
    letterId: draftId,
    fromUserId: 'me',
    toUserId: 'partner',
    status: 'draft'
  })
  addLetter({
    letterId: otherId,
    fromUserId: 'other-a',
    toUserId: 'other-b',
    status: 'delivered'
  })

  assert.equal(mailboxService.setLetterArchived(draftId, true), false)
  assert.equal(mailboxService.setLetterArchived(otherId, true), false)
  removeLetter(draftId)
  removeLetter(otherId)
})

test('已归档的未读信不会继续出现在最新未读提醒中', () => {
  const letterId = 'test-archived-unread-letter'
  addLetter({
    letterId,
    fromUserId: 'partner',
    toUserId: 'me',
    status: 'delivered',
    sentAt: '2099-06-15T10:00:00+08:00',
    visibleAt: '2026-06-15T10:00:00+08:00',
    readAt: null,
    archivedByUserIds: ['me']
  })

  const latest = mailboxService.getLatestUnreadIncomingLetter()
  assert.notEqual(latest && latest.letterId, letterId)
  removeLetter(letterId)
})
