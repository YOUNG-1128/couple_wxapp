const { getState, updateState } = require('./local-state')
const relationshipService = require('./relationship')
const { createTempId } = require('../utils/id')
const { formatPostTime } = require('../utils/time')

function getUserById(userId) {
  return getState('users').find((user) => user.userId === userId) || null
}

function getCurrentUser() {
  return relationshipService.getRelationshipContext().currentUser || getState('users')[0]
}

function getPartnerUser(currentUser) {
  const relationshipPartner = relationshipService.getRelationshipContext().partnerUser

  if (relationshipPartner && relationshipPartner.userId) {
    return getUserById(relationshipPartner.userId) || relationshipPartner
  }

  return getState('users').find((user) => currentUser && user.userId !== currentUser.userId) || null
}

function getSession() {
  return getState('session') || {}
}

function canUseCloudMailbox() {
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

function sortByUpdatedAtDesc(list) {
  return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

function getSentSortTime(letter) {
  return letter.sentAt || letter.createdAt || letter.updatedAt
}

function sortBySentAtDesc(list) {
  return [...list].sort((a, b) => new Date(getSentSortTime(b)).getTime() - new Date(getSentSortTime(a)).getTime())
}

function isVisible(letter) {
  if (!letter.visibleAt) {
    return true
  }

  return new Date(letter.visibleAt).getTime() <= Date.now()
}

function formatDateTime(input) {
  if (!input) {
    return '—'
  }

  const date = new Date(input)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')

  return `${y}-${m}-${d} ${h}:${mm}`
}

function formatListTime(input) {
  if (!input) {
    return '—'
  }

  const date = new Date(input)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const now = new Date()
  const sameDay = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  const h = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')

  if (sameDay) {
    return `${h}:${mm}`
  }

  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  return `${m}-${d} ${h}:${mm}`
}

function getStatusText(letter) {
  if (letter.status === 'draft') {
    return '草稿'
  }

  if (letter.status === 'scheduled') {
    return '等待送达'
  }

  if (letter.status === 'delivered') {
    return '已送达'
  }

  return '已发送'
}

function getReadState(letter, currentUserId) {
  if (letter.status === 'draft') {
    return 'draft'
  }

  if (!isVisible(letter)) {
    return 'waiting'
  }

  if (letter.fromUserId === currentUserId) {
    return letter.readAt ? 'read' : 'unread'
  }

  return letter.readAt && letter.readByUserId === currentUserId ? 'read' : 'unread'
}

function getReadStatusText(letter, currentUserId) {
  if (letter.status === 'draft') {
    return ''
  }

  if (!isVisible(letter)) {
    return '等待送达'
  }

  if (letter.fromUserId === currentUserId) {
    return letter.readAt ? '已读' : '未读'
  }

  return letter.readAt && letter.readByUserId === currentUserId ? '已读' : '未读'
}

function getReadReceiptText(letter, currentUserId) {
  if (!isVisible(letter)) {
    return `将在 ${formatDateTime(letter.visibleAt)} 送达`
  }

  if (letter.fromUserId === currentUserId) {
    return letter.readAt ? `TA 已于 ${formatDateTime(letter.readAt)} 阅读` : 'TA 还没有阅读'
  }

  return letter.readAt && letter.readByUserId === currentUserId
    ? `你已于 ${formatDateTime(letter.readAt)} 阅读`
    : '你还没有阅读'
}

function getLetterListText(letter, lockedForMe) {
  if (lockedForMe) {
    return '一封等待送达的信'
  }

  const title = String(letter.title || '').trim()
  const content = String(letter.content || '').trim()
  const images = Array.isArray(letter.images) ? letter.images : []

  if (title) {
    return title
  }

  if (content) {
    return content
  }

  if (images.length) {
    return '一封附有照片的信'
  }

  return '一封还没有写完的信'
}

function decorateLetter(letter, currentUserId) {
  const fromUser = getUserById(letter.fromUserId) || { nickName: '我', avatarUrl: '' }
  const toUser = getUserById(letter.toUserId) || { nickName: 'TA', avatarUrl: '' }
  const incoming = letter.toUserId === currentUserId
  const visible = isVisible(letter)
  const lockedForMe = incoming && !visible && letter.status !== 'draft'
  const unreadForMe = incoming && visible && !letter.readAt && letter.status !== 'draft'
  const readState = getReadState(letter, currentUserId)
  const readIcon = readState === 'read' ? '✔✔' : (readState === 'unread' ? '●' : '◌')

  const displayTime = letter.status === 'draft' ? (letter.updatedAt || letter.createdAt) : getSentSortTime(letter)

  return {
    ...letter,
    title: lockedForMe ? '一封等待送达的信' : (letter.title || ''),
    greeting: lockedForMe ? '' : (letter.greeting || ''),
    content: lockedForMe ? '这封信还没有到约定的送达时间' : (letter.content || ''),
    signature: lockedForMe ? '' : (letter.signature || ''),
    letterDateText: lockedForMe ? '' : (letter.letterDateText || ''),
    images: lockedForMe ? [] : (Array.isArray(letter.images) ? letter.images : []),
    previewTime: formatPostTime(displayTime),
    listTime: formatListTime(displayTime),
    listText: getLetterListText(letter, lockedForMe),
    statusText: getStatusText(letter),
    readStatusText: getReadStatusText(letter, currentUserId),
    fromUser,
    toUser,
    directionText: incoming ? `${fromUser.nickName} 发给我` : `我发给 ${toUser.nickName}`,
    isIncoming: incoming,
    visible,
    lockedForMe,
    isUnreadForMe: unreadForMe,
    readState,
    readIcon,
    noticeStatus: letter.noticeStatus || 'idle'
  }
}

function normalizeCloudLetter(letter = {}) {
  return {
    ...letter,
    letterId: letter.letterId || letter._id || createTempId('letter')
  }
}

function syncLettersToLocal(rawLetters = []) {
  const currentUser = getCurrentUser()
  const partnerUser = getPartnerUser(currentUser)
  const currentUserId = currentUser ? currentUser.userId : ''
  const partnerUserId = partnerUser ? partnerUser.userId : ''
  const normalized = rawLetters.map(normalizeCloudLetter)

  updateState('letters', (letters) => {
    const preserved = letters.filter((item) => {
      const fromMatches = item.fromUserId === currentUserId || (partnerUserId && item.fromUserId === partnerUserId)
      const toMatches = item.toUserId === currentUserId || (partnerUserId && item.toUserId === partnerUserId)

      return !(fromMatches || toMatches)
    })

    preserved.unshift(...normalized)
    letters.splice(0, letters.length, ...preserved)
  })

  return normalized
}

function callCloudFunction(name, data = {}) {
  return wx.cloud.callFunction({
    name,
    data
  }).then((res) => (res && res.result) || {})
}

function buildNoticeFields(payload = {}, now = new Date().toISOString()) {
  return {
    noticeStatus: payload.noticeStatus || 'idle',
    noticeRequestedAt: payload.noticeRequestedAt || null,
    noticeSentAt: payload.noticeSentAt || null,
    noticeMsgId: payload.noticeMsgId || '',
    noticeError: payload.noticeError || '',
    noticeUpdatedAt: payload.noticeStatus && payload.noticeStatus !== 'idle' ? now : null
  }
}

function refreshScheduledLetters() {
  const now = Date.now()

  updateState('letters', (letters) => {
    letters.forEach((letter) => {
      if (letter.status !== 'scheduled' || !letter.visibleAt) {
        return
      }

      if (new Date(letter.visibleAt).getTime() <= now) {
        letter.status = 'delivered'
        letter.updatedAt = new Date().toISOString()
      }
    })
  })
}

function getMailboxPageData() {
  refreshScheduledLetters()

  const currentUser = getCurrentUser()
  const partnerUser = getPartnerUser(currentUser)
  const letters = getState('letters')
    .filter((item) => item.fromUserId === currentUser.userId || item.toUserId === currentUser.userId)
    .map((item) => decorateLetter(item, currentUser.userId))

  return {
    currentUser,
    partnerUser,
    drafts: sortByUpdatedAtDesc(letters.filter((item) => item.status === 'draft')),
    history: sortBySentAtDesc(letters.filter((item) => item.status !== 'draft'))
  }
}

function getMailboxPageDataAsync() {
  if (!canUseCloudMailbox()) {
    return Promise.resolve(getMailboxPageData())
  }

  return callCloudFunction('getMailboxPageData')
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_mailbox_page_data_failed')
      }

      syncLettersToLocal(result.letters || [])
      return getMailboxPageData()
    })
    .catch(() => getMailboxPageData())
}

function getMailboxUsers() {
  const currentUser = getCurrentUser()

  return {
    currentUser,
    partnerUser: getPartnerUser(currentUser)
  }
}

function getDraftById(letterId) {
  if (!letterId) {
    return null
  }

  const currentUser = getCurrentUser()
  const draft = getState('letters').find(
    (item) => item.letterId === letterId && item.status === 'draft' && item.fromUserId === currentUser.userId
  )

  return draft ? decorateLetter(draft, currentUser.userId) : null
}

function getDraftByIdAsync(letterId) {
  if (!letterId) {
    return Promise.resolve(null)
  }

  if (!canUseCloudMailbox()) {
    return Promise.resolve(getDraftById(letterId))
  }

  return callCloudFunction('getDraftById', { letterId })
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_draft_failed')
      }

      const draft = result.draft ? normalizeCloudLetter(result.draft) : null

      if (draft) {
        syncLettersToLocal([draft])
      }

      return draft ? decorateLetter(draft, getCurrentUser().userId) : null
    })
    .catch(() => getDraftById(letterId))
}

function getLatestUnreadIncomingLetter() {
  refreshScheduledLetters()

  const currentUser = getCurrentUser()
  const unreadLetters = getState('letters')
    .filter((item) => (
      item.toUserId === currentUser.userId
      && item.status !== 'draft'
      && isVisible(item)
      && !item.readAt
    ))

  const latest = sortBySentAtDesc(unreadLetters)[0]

  return latest ? decorateLetter(latest, currentUser.userId) : null
}

function getLatestUnreadIncomingLetterAsync() {
  return getMailboxPageDataAsync().then((pageData) => {
    const unread = pageData.history.filter((item) => item.isUnreadForMe)
    return sortBySentAtDesc(unread)[0] || null
  })
}

function sendLetterNow(payload) {
  const currentUser = getCurrentUser()
  const partnerUser = getPartnerUser(currentUser)
  const now = new Date().toISOString()
  const toUserId = payload.toUserId || (partnerUser ? partnerUser.userId : 'partner')
  let letter = null

  updateState('letters', (letters) => {
    if (payload.editingLetterId) {
      const target = letters.find((item) => item.letterId === payload.editingLetterId && item.fromUserId === currentUser.userId)

      if (target) {
        target.toUserId = toUserId
        target.title = payload.title || ''
        target.greeting = payload.greeting || ''
        target.content = payload.content || ''
        target.signature = payload.signature || ''
        target.letterDateText = payload.letterDateText || ''
        target.images = Array.isArray(payload.images) ? payload.images : []
        target.status = 'sent'
        target.sendMode = 'now'
        target.updatedAt = now
        target.sentAt = now
        target.visibleAt = now
        target.openedAt = null
        target.readAt = null
        target.readByUserId = null
        Object.assign(target, buildNoticeFields(payload.notice, now))
        letter = target
        return
      }
    }

    letter = {
      letterId: createTempId('letter'),
      fromUserId: currentUser.userId,
      toUserId,
      title: payload.title || '',
      greeting: payload.greeting || '',
      content: payload.content || '',
      signature: payload.signature || '',
      letterDateText: payload.letterDateText || '',
      images: Array.isArray(payload.images) ? payload.images : [],
      status: 'sent',
      sendMode: 'now',
      createdAt: now,
      updatedAt: now,
      sentAt: now,
      visibleAt: now,
      openedAt: null,
      readAt: null,
      readByUserId: null,
      ...buildNoticeFields(payload.notice, now)
    }

    letters.unshift(letter)
  })

  return decorateLetter(letter, currentUser.userId)
}

function sendLetterNowAsync(payload) {
  if (!canUseCloudMailbox()) {
    return Promise.resolve(sendLetterNow(payload))
  }

  return callCloudFunction('sendLetterNow', payload)
    .then((result) => {
      if (result.success !== true || !result.letter) {
        throw new Error(result.errorMessage || 'send_letter_now_failed')
      }

      const letter = normalizeCloudLetter(result.letter)
      syncLettersToLocal([letter])
      return decorateLetter(letter, getCurrentUser().userId)
    })
}

function sendLetterScheduled(payload) {
  const currentUser = getCurrentUser()
  const partnerUser = getPartnerUser(currentUser)
  const now = new Date().toISOString()
  const toUserId = payload.toUserId || (partnerUser ? partnerUser.userId : 'partner')
  let letter = null

  updateState('letters', (letters) => {
    if (payload.editingLetterId) {
      const target = letters.find((item) => item.letterId === payload.editingLetterId && item.fromUserId === currentUser.userId)

      if (target) {
        target.toUserId = toUserId
        target.title = payload.title || ''
        target.greeting = payload.greeting || ''
        target.content = payload.content || ''
        target.signature = payload.signature || ''
        target.letterDateText = payload.letterDateText || ''
        target.images = Array.isArray(payload.images) ? payload.images : []
        target.status = 'scheduled'
        target.sendMode = 'scheduled'
        target.updatedAt = now
        target.sentAt = now
        target.visibleAt = payload.visibleAt
        target.openedAt = null
        target.readAt = null
        target.readByUserId = null
        Object.assign(target, buildNoticeFields(payload.notice, now))
        letter = target
        return
      }
    }

    letter = {
      letterId: createTempId('letter'),
      fromUserId: currentUser.userId,
      toUserId,
      title: payload.title || '',
      greeting: payload.greeting || '',
      content: payload.content || '',
      signature: payload.signature || '',
      letterDateText: payload.letterDateText || '',
      images: Array.isArray(payload.images) ? payload.images : [],
      status: 'scheduled',
      sendMode: 'scheduled',
      createdAt: now,
      updatedAt: now,
      sentAt: now,
      visibleAt: payload.visibleAt,
      openedAt: null,
      readAt: null,
      readByUserId: null,
      ...buildNoticeFields(payload.notice, now)
    }

    letters.unshift(letter)
  })

  return decorateLetter(letter, currentUser.userId)
}

function sendLetterScheduledAsync(payload) {
  if (!canUseCloudMailbox()) {
    return Promise.resolve(sendLetterScheduled(payload))
  }

  return callCloudFunction('sendLetterScheduled', payload)
    .then((result) => {
      if (result.success !== true || !result.letter) {
        throw new Error(result.errorMessage || 'send_letter_scheduled_failed')
      }

      const letter = normalizeCloudLetter(result.letter)
      syncLettersToLocal([letter])
      return decorateLetter(letter, getCurrentUser().userId)
    })
}

function saveDraft(payload) {
  const currentUser = getCurrentUser()
  const partnerUser = getPartnerUser(currentUser)
  const now = new Date().toISOString()
  const toUserId = payload.toUserId || (partnerUser ? partnerUser.userId : 'partner')
  let draft = null

  updateState('letters', (letters) => {
    if (payload.editingLetterId) {
      const target = letters.find((item) => item.letterId === payload.editingLetterId && item.fromUserId === currentUser.userId)

      if (target) {
        target.toUserId = toUserId
        target.title = payload.title || ''
        target.greeting = payload.greeting || ''
        target.content = payload.content || ''
        target.signature = payload.signature || ''
        target.letterDateText = payload.letterDateText || ''
        target.images = Array.isArray(payload.images) ? payload.images : []
        target.status = 'draft'
        target.sendMode = payload.sendMode || 'now'
        target.updatedAt = now
        target.sentAt = null
        target.visibleAt = payload.visibleAt || null
        target.openedAt = null
        target.readAt = null
        target.readByUserId = null
        Object.assign(target, buildNoticeFields({}, now))
        draft = target
        return
      }
    }

    draft = {
      letterId: createTempId('letter'),
      fromUserId: currentUser.userId,
      toUserId,
      title: payload.title || '',
      greeting: payload.greeting || '',
      content: payload.content || '',
      signature: payload.signature || '',
      letterDateText: payload.letterDateText || '',
      images: Array.isArray(payload.images) ? payload.images : [],
      status: 'draft',
      sendMode: payload.sendMode || 'now',
      createdAt: now,
      updatedAt: now,
      sentAt: null,
      visibleAt: payload.visibleAt || null,
      openedAt: null,
      readAt: null,
      readByUserId: null,
      ...buildNoticeFields({}, now)
    }

    letters.unshift(draft)
  })

  return decorateLetter(draft, currentUser.userId)
}

function saveDraftAsync(payload) {
  if (!canUseCloudMailbox()) {
    return Promise.resolve(saveDraft(payload))
  }

  return callCloudFunction('saveDraft', payload)
    .then((result) => {
      if (result.success !== true || !result.draft) {
        throw new Error(result.errorMessage || 'save_draft_failed')
      }

      const draft = normalizeCloudLetter(result.draft)
      syncLettersToLocal([draft])
      return decorateLetter(draft, getCurrentUser().userId)
    })
}

function removeDraft(letterId) {
  if (!letterId) {
    return false
  }

  const currentUser = getCurrentUser()
  let removed = false

  updateState('letters', (letters) => {
    const index = letters.findIndex(
      (item) => item.letterId === letterId && item.status === 'draft' && item.fromUserId === currentUser.userId
    )

    if (index < 0) {
      return
    }

    letters.splice(index, 1)
    removed = true
  })

  return removed
}

function removeDraftAsync(letterId) {
  if (!canUseCloudMailbox()) {
    return Promise.resolve(removeDraft(letterId))
  }

  return callCloudFunction('removeDraft', { letterId })
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'remove_draft_failed')
      }

      removeDraft(letterId)
      return true
    })
    .catch(() => false)
}

function getLetterDetailOnOpen(letterId) {
  refreshScheduledLetters()

  const currentUser = getCurrentUser()
  let targetLetter = null

  updateState('letters', (letters) => {
    const letter = letters.find((item) => item.letterId === letterId)

    if (!letter) {
      return
    }

    if (letter.toUserId === currentUser.userId && isVisible(letter) && !letter.readAt) {
      const now = new Date().toISOString()
      letter.readAt = now
      letter.readByUserId = currentUser.userId
      letter.openedAt = now
      letter.updatedAt = now
    }

    targetLetter = { ...letter }
  })

  if (!targetLetter) {
    return null
  }

  const fromUser = getUserById(targetLetter.fromUserId) || { nickName: '我', avatarUrl: '' }
  const toUser = getUserById(targetLetter.toUserId) || { nickName: 'TA', avatarUrl: '' }
  const visible = isVisible(targetLetter)
  const lockedForMe = targetLetter.toUserId === currentUser.userId && !visible

  return {
    ...decorateLetter(targetLetter, currentUser.userId),
    title: lockedForMe ? '' : (targetLetter.title || ''),
    greeting: lockedForMe ? '' : (targetLetter.greeting || ''),
    content: lockedForMe ? '' : (targetLetter.content || ''),
    signature: lockedForMe ? '' : (targetLetter.signature || ''),
    letterDateText: lockedForMe ? '' : (targetLetter.letterDateText || ''),
    images: lockedForMe ? [] : (Array.isArray(targetLetter.images) ? targetLetter.images : []),
    fromUser,
    toUser,
    visible,
    sentAtLabel: formatDateTime(targetLetter.sentAt),
    visibleAtLabel: formatDateTime(targetLetter.visibleAt),
    readAtLabel: targetLetter.readAt ? formatDateTime(targetLetter.readAt) : '—',
    readReceiptText: getReadReceiptText(targetLetter, currentUser.userId)
  }
}

function getLetterDetailOnOpenAsync(letterId) {
  if (!letterId) {
    return Promise.resolve(null)
  }

  if (!canUseCloudMailbox()) {
    return Promise.resolve(getLetterDetailOnOpen(letterId))
  }

  return callCloudFunction('getLetterDetailOnOpen', { letterId })
    .then((result) => {
      if (result.success !== true || !result.letter) {
        throw new Error(result.errorMessage || 'get_letter_detail_failed')
      }

      const letter = normalizeCloudLetter(result.letter)
      syncLettersToLocal([letter])
      return getLetterDetailOnOpen(letter.letterId)
    })
    .catch(() => getLetterDetailOnOpen(letterId))
}

function updateLetterNoticeStatus(letterId, noticePatch = {}) {
  if (!letterId) {
    return null
  }

  let targetLetter = null
  const now = new Date().toISOString()

  updateState('letters', (letters) => {
    const letter = letters.find((item) => item.letterId === letterId)

    if (!letter) {
      return
    }

    Object.assign(letter, buildNoticeFields({
      noticeStatus: noticePatch.noticeStatus || letter.noticeStatus || 'idle',
      noticeRequestedAt: noticePatch.noticeRequestedAt || letter.noticeRequestedAt,
      noticeSentAt: noticePatch.noticeSentAt || letter.noticeSentAt,
      noticeMsgId: noticePatch.noticeMsgId || letter.noticeMsgId,
      noticeError: noticePatch.noticeError || ''
    }, now))

    targetLetter = { ...letter }
  })

  if (!targetLetter) {
    return null
  }

  return decorateLetter(targetLetter, getCurrentUser().userId)
}

function updateLetterNoticeStatusAsync(letterId, noticePatch = {}) {
  if (!canUseCloudMailbox()) {
    return Promise.resolve(updateLetterNoticeStatus(letterId, noticePatch))
  }

  return callCloudFunction('updateLetterNoticeStatus', {
    letterId,
    ...noticePatch
  }).finally(() => {
    updateLetterNoticeStatus(letterId, noticePatch)
  })
}

module.exports = {
  canUseCloudMailbox,
  getMailboxPageData,
  getMailboxPageDataAsync,
  getMailboxUsers,
  getDraftById,
  getDraftByIdAsync,
  getLatestUnreadIncomingLetter,
  getLatestUnreadIncomingLetterAsync,
  sendLetterNow,
  sendLetterNowAsync,
  sendLetterScheduled,
  sendLetterScheduledAsync,
  saveDraft,
  saveDraftAsync,
  removeDraft,
  removeDraftAsync,
  getLetterDetailOnOpen,
  getLetterDetailOnOpenAsync,
  updateLetterNoticeStatus
  ,
  updateLetterNoticeStatusAsync
}
