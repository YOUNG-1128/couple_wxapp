const { getState, updateState } = require('./local-state')

const TODAY = '2026-04-23'

function getCapsuleData() {
  const capsuleData = getState('capsule')

  capsuleData.capsules.forEach(updateCapsuleStatus)

  return capsuleData
}

function createCapsule(payload) {
  const capsule = {
    id: `capsule-${Date.now()}`,
    title: payload.title,
    content: payload.content,
    createdAt: TODAY,
    openAt: payload.openAt,
    type: payload.type,
    isOpened: false,
    status: getStatus(payload.openAt, false),
    ownerRole: 'me',
    visibility: 'couple'
  }

  const capsuleData = updateState('capsule', (data) => {
    data.capsules.unshift(capsule)
  })

  return {
    capsule,
    capsules: capsuleData.capsules
  }
}

function openCapsule(id) {
  const capsuleData = updateState('capsule', (data) => {
    const capsule = data.capsules.find((item) => item.id === id)

    if (!capsule || capsule.status === 'locked') {
      return
    }

    capsule.isOpened = true
    capsule.status = 'opened'
  })

  return capsuleData.capsules.find((item) => item.id === id)
}

function getStatus(openAt, isOpened) {
  if (isOpened) {
    return 'opened'
  }

  return openAt <= TODAY ? 'available' : 'locked'
}

function updateCapsuleStatus(capsule) {
  capsule.status = getStatus(capsule.openAt, capsule.isOpened)
}

module.exports = {
  getCapsuleData,
  createCapsule,
  openCapsule
}
