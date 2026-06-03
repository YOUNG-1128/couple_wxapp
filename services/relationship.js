const { getState } = require('./local-state')

function getUsers() {
  return getState('users') || []
}

function getSession() {
  return getState('session') || {}
}

function getCurrentUser() {
  const session = getSession()

  return getUsers().find((user) => user.userId === session.currentUserId) || getUsers()[0] || null
}

function getRelationshipContext() {
  const session = getSession()
  const currentUser = getCurrentUser()
  const localPartner = currentUser
    ? getUsers().find((user) => user.userId !== currentUser.userId) || null
    : null
  const partnerProfile = session.partnerProfile || (localPartner ? {
    userId: localPartner.userId,
    nickName: localPartner.nickName,
    avatarUrl: localPartner.avatarUrl
  } : null)

  return {
    currentUser,
    partnerUser: partnerProfile,
    coupleId: session.coupleId || '',
    bindingStatus: session.bindingStatus || 'unbound',
    isBound: session.bindingStatus === 'bound' && Boolean(session.coupleId)
  }
}

module.exports = {
  getRelationshipContext,
  getCurrentUser
}
