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

function getPartnerUser(currentUser) {
  if (!currentUser) {
    return null
  }

  return getUsers().find((user) => user.userId !== currentUser.userId) || null
}

function formatBindingError(errorCode = '') {
  const map = {
    binding_status_failed: '绑定状态获取失败',
    create_invite_failed: '邀请码生成失败',
    bind_failed: '绑定失败',
    invite_code_invalid: '邀请码无效或已失效',
    cannot_bind_self: '不能绑定自己生成的邀请码',
    current_user_already_bound: '当前账号已经绑定',
    invite_owner_already_bound: '对方已经被绑定',
    invite_owner_not_found: '邀请码对应用户不存在',
    invite_code_required: '请输入邀请码',
    user_not_found: '当前用户还没同步到云端',
    openid_missing: '当前登录态无效，请重新登录'
  }

  return map[errorCode] || errorCode || ''
}

function saveBindingState(result = {}) {
  const session = getSession()
  const currentUser = getCurrentUser()
  const previousCoupleId = session.coupleId || ''
  const previousInviteCode = session.inviteCode || ''
  const previousStatus = session.bindingStatus || 'unbound'
  const previousPartnerProfile = session.partnerProfile || null
  const nextStatus = result.success === true
    ? (result.status || 'unbound')
    : previousStatus

  updateState('session', (state) => {
    state.coupleId = result.success === true ? (result.coupleId || '') : previousCoupleId
    state.inviteCode = result.success === true ? (result.inviteCode || '') : previousInviteCode
    state.bindingStatus = nextStatus
    state.cloudBindingSynced = result.success === true
    state.cloudBindingSyncError = result.success === true ? '' : formatBindingError(result.errorMessage || 'binding_sync_failed')
    state.partnerProfile = result.success === true ? (result.partnerProfile || null) : previousPartnerProfile
  })

  if (currentUser) {
    updateState('users', (users) => {
      const target = users.find((item) => item.userId === currentUser.userId)

      if (target) {
        if (result.success === true) {
          target.coupleId = result.coupleId || ''
          target.inviteCodeOwned = result.inviteCode || ''
        }
      }

      const partnerProfile = result.partnerProfile
      if (result.success === true && partnerProfile) {
        const partner = users.find((item) => item.userId !== currentUser.userId)

        if (partner) {
          partner.nickName = partnerProfile.nickName || partner.nickName
          partner.avatarUrl = partnerProfile.avatarUrl || partner.avatarUrl
          partner.coupleId = result.coupleId || partner.coupleId
        }
      }
    })
  }

  return getBindingState()
}

function getBindingState() {
  const session = getSession()
  const currentUser = getCurrentUser()
  const localPartner = getPartnerUser(currentUser)
  const isBound = session.bindingStatus === 'bound' && Boolean(session.coupleId)
  const hasInvite = session.bindingStatus === 'pending' && Boolean(session.inviteCode)
  const partnerProfile = session.partnerProfile || (isBound && localPartner ? {
    userId: localPartner.userId,
    nickName: localPartner.nickName,
    avatarUrl: localPartner.avatarUrl
  } : null)

  return {
    isBound,
    hasInvite,
    coupleId: session.coupleId || '',
    inviteCode: session.inviteCode || '',
    status: session.bindingStatus || 'unbound',
    statusLabel: isBound ? '已绑定' : (hasInvite ? '等待对方绑定' : '未绑定'),
    statusDesc: isBound
      ? `已和 ${partnerProfile ? partnerProfile.nickName : 'TA'} 绑定`
      : (hasInvite
        ? '邀请码已生成，等待对方输入'
        : '还没有建立情侣关系'),
    partnerProfile,
    syncError: session.cloudBindingSyncError || ''
  }
}

function getBindingStatus() {
  if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
    return Promise.resolve(getBindingState())
  }

  return wx.cloud.callFunction({
    name: 'getCoupleBindingStatus'
  }).then((res) => {
    const result = (res && res.result) || {}

    return saveBindingState({
      success: result.success === true,
      coupleId: result.coupleId || '',
      inviteCode: result.inviteCode || '',
      status: result.status || 'unbound',
      partnerProfile: result.partnerProfile || null,
      errorMessage: result.errorMessage || ''
    })
  }).catch((error) => saveBindingState({
    success: false,
    errorMessage: (error && (error.message || error.errMsg)) || 'binding_status_failed'
  }))
}

function createInviteCode() {
  return wx.cloud.callFunction({
    name: 'createCoupleInviteCode'
  }).then((res) => {
    const result = (res && res.result) || {}

    return saveBindingState({
      success: result.success === true,
      coupleId: result.coupleId || '',
      inviteCode: result.inviteCode || '',
      status: result.status || 'pending',
      partnerProfile: result.partnerProfile || null,
      errorMessage: result.errorMessage || ''
    })
  }).catch((error) => saveBindingState({
    success: false,
    errorMessage: (error && (error.message || error.errMsg)) || 'create_invite_failed'
  }))
}

function bindByInviteCode(inviteCode) {
  return wx.cloud.callFunction({
    name: 'bindCoupleByInviteCode',
    data: {
      inviteCode: (inviteCode || '').trim().toUpperCase()
    }
  }).then((res) => {
    const result = (res && res.result) || {}

    return saveBindingState({
      success: result.success === true,
      coupleId: result.coupleId || '',
      inviteCode: '',
      status: result.status || 'bound',
      partnerProfile: result.partnerProfile || null,
      errorMessage: result.errorMessage || ''
    })
  }).catch((error) => saveBindingState({
    success: false,
    errorMessage: (error && (error.message || error.errMsg)) || 'bind_failed'
  }))
}

module.exports = {
  getBindingState,
  getBindingStatus,
  createInviteCode,
  bindByInviteCode,
  formatBindingError
}
