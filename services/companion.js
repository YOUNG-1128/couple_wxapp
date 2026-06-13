const { getState, updateState } = require('./local-state')
const relationshipService = require('./relationship')
const { formatPostTime, toDateKey } = require('../utils/time')

const DEFAULT_MOOD_TAG = '未选择'
const DEFAULT_MISS_MESSAGE = '我想你了'

function getUsers() {
  return getState('users') || []
}

function getCurrentUserId() {
  const session = getState('session') || {}

  return session.currentUserId || 'me'
}

function getPartnerUserId(currentUserId = getCurrentUserId()) {
  const relationshipPartner = relationshipService.getRelationshipContext().partnerUser

  if (relationshipPartner && relationshipPartner.userId && relationshipPartner.userId !== currentUserId) {
    return relationshipPartner.userId
  }

  const partner = getUsers().find((user) => user.userId !== currentUserId)

  return partner ? partner.userId : (currentUserId === 'me' ? 'partner' : 'me')
}

function getSession() {
  return getState('session') || {}
}

function getUserName(userId) {
  const target = getUsers().find((user) => user.userId === userId)

  return target ? target.nickName : 'TA'
}

function getRawCompanionData() {
  return getState('companion') || {}
}

function canUseCloudMissSignals() {
  const session = getSession()
  const relationship = relationshipService.getRelationshipContext()

  return Boolean(
    typeof wx !== 'undefined'
    && wx.cloud
    && typeof wx.cloud.callFunction === 'function'
    && session.isCloudLoggedIn === true
    && relationship.isBound
    && relationship.coupleId
  )
}

function normalizeMissRecord(record) {
  if (record.senderUserId && record.receiverUserId && record.createdAt) {
    return {
      ...record,
      message: record.message || DEFAULT_MISS_MESSAGE,
      source: record.source || 'home-quick-heart'
    }
  }

  const currentUserId = 'me'
  const partnerUserId = getPartnerUserId(currentUserId)
  const isSent = record.type !== 'received'

  return {
    id: record.id,
    senderUserId: isSent ? currentUserId : partnerUserId,
    receiverUserId: isSent ? partnerUserId : currentUserId,
    createdAt: record.createdAt || new Date().toISOString(),
    readStatus: record.readStatus || (isSent ? 'read' : 'unread'),
    message: DEFAULT_MISS_MESSAGE,
    source: record.source || 'legacy-mock',
    weekTag: record.weekTag || 'current'
  }
}

function decorateMissRecord(record, currentUserId = getCurrentUserId()) {
  const normalized = normalizeMissRecord(record)
  const isSent = normalized.senderUserId === currentUserId
  const timeLabel = formatPostTime(normalized.createdAt)

  return {
    ...normalized,
    type: isSent ? 'sent' : 'received',
    readStatus: isSent ? 'read' : normalized.readStatus,
    time: timeLabel,
    timeLabel,
    message: isSent
      ? '你发送了一次想你信号'
      : `TA 在 ${timeLabel} 想了你一下 ❤️`
  }
}

function normalizeCloudMissRecord(record = {}) {
  return normalizeMissRecord({
    id: record.signalId || record.id,
    signalId: record.signalId || record.id,
    senderUserId: record.senderUserId,
    receiverUserId: record.receiverUserId,
    createdAt: record.createdAt,
    readStatus: record.readStatus,
    readAt: record.readAt || null,
    message: record.message || DEFAULT_MISS_MESSAGE,
    source: record.source || 'home-quick-heart',
    weekTag: record.weekTag || 'current'
  })
}

function syncMissHistoryToLocal(records = []) {
  const normalized = records.map(normalizeCloudMissRecord)

  updateState('companion', (data) => {
    data.missHistory = normalized
  })

  return normalized
}

function callCloudFunction(name, data = {}) {
  return wx.cloud.callFunction({
    name,
    data
  }).then((res) => (res && res.result) || {})
}

function getCompanionData() {
  const companionData = getRawCompanionData()
  const currentUserId = getCurrentUserId()

  return {
    ...companionData,
    missHistory: (companionData.missHistory || []).map((record) => decorateMissRecord(record, currentUserId))
  }
}

function getCompanionDataAsync() {
  if (!canUseCloudMissSignals()) {
    return Promise.resolve(getCompanionData())
  }

  return callCloudFunction('getMissSignalHistory')
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_miss_signal_history_failed')
      }

      syncMissHistoryToLocal(result.records || [])
      return getCompanionData()
    })
    .catch(() => getCompanionData())
}

function sendMissYou() {
  const currentUserId = getCurrentUserId()
  const partnerUserId = getPartnerUserId(currentUserId)

  addMissHistory({
    id: `miss-${Date.now()}`,
    senderUserId: currentUserId,
    receiverUserId: partnerUserId,
    createdAt: new Date().toISOString(),
    readStatus: 'unread',
    message: DEFAULT_MISS_MESSAGE,
    source: 'home-quick-heart',
    weekTag: 'current'
  })

  return getCompanionData().missHistory[0] || null
}

function sendMissYouAsync() {
  if (!canUseCloudMissSignals()) {
    return Promise.resolve(sendMissYou())
  }

  return callCloudFunction('sendMissSignal', {
    message: DEFAULT_MISS_MESSAGE,
    source: 'home-quick-heart'
  }).then((result) => {
    if (result.success !== true || !result.record) {
      throw new Error(result.errorMessage || 'send_miss_signal_failed')
    }

    const nextHistory = [normalizeCloudMissRecord(result.record), ...getRawCompanionData().missHistory]
    syncMissHistoryToLocal(nextHistory)
    return getCompanionData().missHistory[0] || null
  }).catch(() => sendMissYou())
}

function addMissHistory(record) {
  const companionData = updateState('companion', (data) => {
    data.missHistory.unshift(normalizeMissRecord(record))
  })

  return companionData.missHistory
}

function getLatestReceivedMissSignal() {
  const currentUserId = getCurrentUserId()
  const record = (getRawCompanionData().missHistory || [])
    .map(normalizeMissRecord)
    .find((item) => item.receiverUserId === currentUserId)

  return record ? decorateMissRecord(record, currentUserId) : null
}

function getLatestReceivedMissSignalAsync() {
  if (!canUseCloudMissSignals()) {
    return Promise.resolve(getLatestReceivedMissSignal())
  }

  return callCloudFunction('getLatestUnreadMissSignal')
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_latest_unread_miss_signal_failed')
      }

      const record = result.record ? normalizeCloudMissRecord(result.record) : null
      return record ? decorateMissRecord(record, getCurrentUserId()) : null
    })
    .catch(() => getLatestReceivedMissSignal())
}

function markReceivedMissSignalsAsRead() {
  const currentUserId = getCurrentUserId()

  updateState('companion', (data) => {
    data.missHistory = (data.missHistory || []).map((record) => {
      const normalized = normalizeMissRecord(record)

      if (normalized.receiverUserId === currentUserId && normalized.readStatus === 'unread') {
        return {
          ...normalized,
          readStatus: 'read',
          readAt: new Date().toISOString()
        }
      }

      return normalized
    })
  })

  return getCompanionData()
}

function markReceivedMissSignalsAsReadAsync(signalId = '') {
  if (!canUseCloudMissSignals()) {
    return Promise.resolve(markReceivedMissSignalsAsRead())
  }

  return callCloudFunction('markMissSignalAsRead', { signalId })
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'mark_miss_signal_as_read_failed')
      }

      return getCompanionDataAsync()
    })
    .catch(() => markReceivedMissSignalsAsRead())
}

function submitMood(payload, now = new Date()) {
  const mood = {
    id: `mood-${Date.now()}`,
    content: payload.content,
    tag: payload.tag || DEFAULT_MOOD_TAG,
    time: '刚刚',
    dateKey: toDateKey(now),
    createdAt: now.toISOString(),
    weekTag: 'current'
  }

  return saveRecentMood(mood)
}

function saveRecentMood(mood) {
  const companionData = updateState('companion', (data) => {
    data.recentMood = mood
    data.moodRecords.unshift(mood)
  })

  return companionData.recentMood
}

module.exports = {
  getCompanionData,
  getCompanionDataAsync,
  sendMissYou,
  sendMissYouAsync,
  addMissHistory,
  getLatestReceivedMissSignal,
  getLatestReceivedMissSignalAsync,
  markReceivedMissSignalsAsRead,
  markReceivedMissSignalsAsReadAsync,
  submitMood,
  saveRecentMood,
  getCurrentUserId
}
