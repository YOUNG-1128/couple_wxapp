const STORAGE_PREFIX = 'couple-home-read-state'

function getStorageKey(userId, type) {
  return `${STORAGE_PREFIX}:${userId || 'anonymous'}:${type}`
}

function getLastSeenAt(type, userId) {
  if (typeof wx === 'undefined' || !wx.getStorageSync) {
    return ''
  }

  return wx.getStorageSync(getStorageKey(userId, type)) || ''
}

function markSeen(type, userId, seenAt = new Date().toISOString()) {
  if (typeof wx === 'undefined' || !wx.setStorageSync) {
    return seenAt
  }

  wx.setStorageSync(getStorageKey(userId, type), seenAt)
  return seenAt
}

module.exports = {
  getLastSeenAt,
  markSeen
}
