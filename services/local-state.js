const companionMock = require('../mock/companion')
const profileMock = require('../mock/profile')
const questionMock = require('../mock/question')
const questionPoolMock = require('../mock/questionPool')
const questionDailyRecordsMock = require('../mock/questionDailyRecords')
const capsuleMock = require('../mock/capsule')
const usersMock = require('../mock/users')
const postsMock = require('../mock/posts')
const momentDraftsMock = require('../mock/moment-drafts')
const todosMock = require('../mock/todos')
const lettersMock = require('../mock/letters')
const statusRecordsMock = require('../mock/statusRecords')
const bucketListMock = require('../mock/bucketList')
const anniversariesMock = require('../mock/anniversaries')
const citiesMock = require('../mock/cities')
const footprintsMock = require('../mock/footprints')
const placesMock = require('../mock/places')

const state = {
  companion: companionMock,
  profile: profileMock,
  question: questionMock,
  questionPool: questionPoolMock,
  questionDailyRecords: questionDailyRecordsMock,
  capsule: capsuleMock,
  users: usersMock,
  posts: postsMock,
  momentDrafts: momentDraftsMock,
  todos: todosMock,
  bucketList: bucketListMock,
  anniversaries: anniversariesMock,
  cities: citiesMock,
  letters: lettersMock,
  statusRecords: statusRecordsMock,
  footprints: footprintsMock,
  places: placesMock,
  session: {
    currentUserId: 'me',
    coupleId: '',
    isCloudLoggedIn: false,
    openId: '',
    unionId: '',
    cloudLoginAt: '',
    cloudUserId: '',
    cloudRecordId: '',
    cloudProfileSynced: false,
    cloudProfileSyncedAt: '',
    cloudProfileSyncError: '',
    cloudBindingSynced: false,
    cloudBindingSyncError: '',
    inviteCode: '',
    bindingStatus: 'unbound',
    partnerProfile: null
  }
}

function getState(key) {
  return state[key]
}

function updateState(key, updater) {
  const currentState = state[key]

  updater(currentState)

  return currentState
}

const IDENTITY_FIELDS = new Set([
  'userId',
  'authorId',
  'ownerId',
  'ownerUserId',
  'partnerUserId',
  'fromUserId',
  'toUserId',
  'readByUserId',
  'senderUserId',
  'receiverUserId',
  'currentUserId',
  'cloudUserId'
])

const IDENTITY_ARRAY_FIELDS = new Set([
  'participants',
  'userIds',
  'resultViewedUserIds'
])

function replaceIdentityReferences(value, oldUserId, newUserId) {
  if (!value || typeof value !== 'object') {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => replaceIdentityReferences(item, oldUserId, newUserId))
    return
  }

  Object.keys(value).forEach((key) => {
    const fieldValue = value[key]

    if (IDENTITY_FIELDS.has(key) && fieldValue === oldUserId) {
      value[key] = newUserId
      return
    }

    if (IDENTITY_ARRAY_FIELDS.has(key) && Array.isArray(fieldValue)) {
      value[key] = fieldValue.map((item) => item === oldUserId ? newUserId : item)
      return
    }

    replaceIdentityReferences(fieldValue, oldUserId, newUserId)
  })
}

function syncUserIdentity(oldUserId, newUserId, profile = {}) {
  if (!oldUserId || !newUserId) {
    return null
  }

  if (oldUserId !== newUserId) {
    replaceIdentityReferences(state, oldUserId, newUserId)
  }

  const users = state.users || []
  const matches = users.filter((user) => user.userId === newUserId)
  const target = matches[0] || null

  if (target) {
    Object.assign(target, {
      nickName: profile.nickName || target.nickName,
      avatarUrl: profile.avatarUrl || target.avatarUrl,
      openId: profile.openId || target.openId,
      coupleId: profile.coupleId || target.coupleId || ''
    })
  }

  if (matches.length > 1) {
    for (let index = users.length - 1; index >= 0; index -= 1) {
      if (users[index] !== target && users[index].userId === newUserId) {
        users.splice(index, 1)
      }
    }
  }

  return target
}

module.exports = {
  getState,
  updateState,
  syncUserIdentity
}
