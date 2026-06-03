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

module.exports = {
  getState,
  updateState
}
