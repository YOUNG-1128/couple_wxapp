const { getState, updateState } = require('./local-state')

function getSession() {
  return getState('session')
}

function getUsers() {
  return getState('users') || []
}

function getCurrentUser() {
  const session = getSession()

  return getUsers().find((user) => user.userId === session.currentUserId) || getUsers()[0] || null
}

function maskOpenId(openId) {
  if (!openId) {
    return ''
  }

  if (openId.length <= 10) {
    return openId
  }

  return `${openId.slice(0, 4)}...${openId.slice(-4)}`
}

function getCloudAuthState() {
  const session = getSession()
  const currentUser = getCurrentUser()

  return {
    isCloudLoggedIn: session.isCloudLoggedIn === true,
    openId: session.openId || '',
    maskedOpenId: maskOpenId(session.openId || ''),
    cloudLoginAt: session.cloudLoginAt || '',
    cloudUserId: session.cloudUserId || '',
    cloudRecordId: session.cloudRecordId || '',
    cloudProfileSynced: session.cloudProfileSynced === true,
    cloudProfileSyncedAt: session.cloudProfileSyncedAt || '',
    cloudProfileSyncError: session.cloudProfileSyncError || '',
    coupleId: session.coupleId || '',
    currentUser
  }
}

function getAccountStatus() {
  const session = getSession()
  const partnerName = session.partnerProfile && session.partnerProfile.nickName ? session.partnerProfile.nickName : 'TA'

  return {
    self: session.isCloudLoggedIn ? '微信已登录' : '未接入真实微信登录',
    partner: session.bindingStatus === 'bound' && session.coupleId ? `已绑定 ${partnerName}` : (session.bindingStatus === 'pending' ? '等待对方绑定' : '还未绑定'),
    desc: session.isCloudLoggedIn
      ? (
        session.cloudProfileSynced
          ? `已同步云端用户：${maskOpenId(session.openId || '') || '已登录'}`
          : `已拿到 openid，但云端用户资料还没同步完成：${maskOpenId(session.openId || '') || '已登录'}`
      )
      : '先完成真实微信登录，后续才能继续做情侣绑定、站外提醒和双人同步。'
  }
}

function syncCurrentUserByOpenId(openId) {
  if (!openId) {
    return null
  }

  const matchedUser = getUsers().find((user) => user.openId && user.openId === openId)

  if (!matchedUser) {
    return null
  }

  updateState('session', (session) => {
    session.currentUserId = matchedUser.userId
  })

  return matchedUser
}

function saveCloudLoginResult(result = {}) {
  const now = new Date().toISOString()

  updateState('session', (session) => {
    session.isCloudLoggedIn = true
    session.openId = result.openid || result.openId || ''
    session.unionId = result.unionid || result.unionId || ''
    session.cloudLoginAt = now
    session.cloudUserId = result.openid || result.openId || ''
    session.cloudRecordId = ''
    session.cloudProfileSynced = false
    session.cloudProfileSyncedAt = ''
    session.cloudProfileSyncError = ''
  })

  syncCurrentUserByOpenId(result.openid || result.openId || '')

  return getCloudAuthState()
}

function saveCloudUserSyncResult(result = {}) {
  const now = new Date().toISOString()

  updateState('session', (session) => {
    session.cloudRecordId = result.recordId || ''
    session.cloudUserId = result.userId || session.cloudUserId || ''
    session.cloudProfileSynced = result.success === true
    session.cloudProfileSyncedAt = result.success === true ? now : ''
    session.cloudProfileSyncError = result.success === true ? '' : (result.errorMessage || 'sync_failed')
  })

  return getCloudAuthState()
}

function syncCloudCurrentUserProfile() {
  const currentUser = getCurrentUser()
  const session = getSession()

  if (!currentUser || !session.openId) {
    return Promise.resolve(getCloudAuthState())
  }

  return wx.cloud.callFunction({
    name: 'upsertCurrentUser',
    data: {
      profile: {
        userId: currentUser.userId,
        nickName: currentUser.nickName || '',
        avatarUrl: currentUser.avatarUrl || '',
        role: currentUser.role || 'member'
      }
    }
  }).then((res) => {
    const result = (res && res.result) || {}

    return saveCloudUserSyncResult({
      success: result.success === true,
      recordId: result.recordId || '',
      userId: result.userId || currentUser.userId,
      errorMessage: result.errorMessage || ''
    })
  }).catch((error) => {
    return saveCloudUserSyncResult({
      success: false,
      errorMessage: (error && (error.message || error.errMsg)) || 'sync_failed'
    })
  })
}

function loginWithWeChat() {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
      reject(new Error('cloud_not_ready'))
      return
    }

    wx.cloud.callFunction({
      name: 'login'
    }).then((res) => {
      const result = (res && res.result) || {}
      const openId = result.openid || result.openId || ''

      if (!openId) {
        reject(new Error('openid_missing'))
        return
      }

      saveCloudLoginResult(result)
      syncCloudCurrentUserProfile().then(resolve)
    }).catch((error) => {
      reject(error)
    })
  })
}

module.exports = {
  getCloudAuthState,
  getAccountStatus,
  loginWithWeChat
}
