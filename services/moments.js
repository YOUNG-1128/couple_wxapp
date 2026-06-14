const { getState, updateState } = require('./local-state')
const footprintService = require('./footprint')
const relationshipService = require('./relationship')
const { createTempId } = require('../utils/id')
const { formatPostTime, formatCommentTime, toDateKey } = require('../utils/time')
const { normalizeCity, createFootprintFromPost } = require('../utils/footprint')

function getUsers() {
  return getState('users')
}

function getSession() {
  return getState('session')
}

function canUseCloudMoments() {
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

function getCurrentUser() {
  const { currentUserId } = getSession()

  return getUsers().find((user) => user.userId === currentUserId) || getUsers()[0]
}

function switchCurrentUser(userId) {
  updateState('session', (session) => {
    const exists = getUsers().some((user) => user.userId === userId)

    if (exists) {
      session.currentUserId = userId
    }
  })

  return getCurrentUser()
}

function updateUserProfile(userId, patch) {
  updateState('users', (users) => {
    const target = users.find((user) => user.userId === userId)

    if (!target) {
      return
    }

    if (typeof patch.nickName === 'string') {
      target.nickName = patch.nickName
    }

    if (typeof patch.avatarUrl === 'string') {
      target.avatarUrl = patch.avatarUrl
    }
  })

  return getUsers().find((user) => user.userId === userId) || null
}

function normalizeComment(comment) {
  const author = getUsers().find((user) => user.userId === comment.userId)

  return {
    ...comment,
    userName: author ? author.nickName : comment.userName,
    userAvatar: author ? author.avatarUrl : comment.userAvatar,
    displayTime: formatCommentTime(comment.createdAt)
  }
}

function normalizePost(post) {
  const author = getUsers().find((user) => user.userId === post.authorId)
  const currentUser = getCurrentUser()

  return {
    ...post,
    authorName: author ? author.nickName : post.authorName,
    authorAvatar: author ? author.avatarUrl : post.authorAvatar,
    displayTime: formatPostTime(post.createdAt),
    location: buildDefaultLocation(post.location),
    comments: (post.comments || []).map(normalizeComment),
    canRemove: Boolean(currentUser && post.authorId === currentUser.userId)
  }
}

function normalizeCloudPost(post = {}) {
  return {
    ...post,
    postId: post.postId || post.draftId || createTempId('post'),
    location: buildDefaultLocation(post.location),
    comments: Array.isArray(post.comments) ? post.comments : []
  }
}

function normalizeCloudDraft(draft = {}) {
  return {
    ...draft,
    draftId: draft.draftId || draft.postId || createTempId('moment-draft'),
    location: buildDefaultLocation(draft.location)
  }
}

function byNewest(a, b) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

function matchKeyword(post, keyword) {
  const value = keyword.trim().toLowerCase()

  if (!value) {
    return true
  }

  const postContent = (post.content || '').toLowerCase()
  const authorName = (post.authorName || '').toLowerCase()
  const commentContent = (post.comments || [])
    .map((comment) => (comment.content || '').toLowerCase())
    .join(' ')

  return postContent.includes(value) || authorName.includes(value) || commentContent.includes(value)
}

function matchDate(post, dateType, dateValue) {
  if (!dateValue || !dateType || dateType === 'all') {
    return true
  }

  const postDate = toDateKey(post.createdAt)

  if (dateType === 'year') {
    return postDate.slice(0, 4) === dateValue
  }

  if (dateType === 'month') {
    return postDate.slice(0, 7) === dateValue
  }

  return postDate === dateValue
}

function matchAuthor(post, authorId) {
  if (!authorId || authorId === 'all') {
    return true
  }

  return post.authorId === authorId
}

function getMomentsFeed(filters = {}) {
  const posts = getState('posts').map(normalizePost).sort(byNewest)
  const keyword = filters.keyword || ''
  const date = filters.date || ''
  const dateType = filters.dateType || (date ? 'day' : 'all')
  const dateValue = filters.dateValue || date
  const authorId = filters.authorId || 'all'
  const postId = filters.postId || ''

  if (!keyword && !dateValue && !postId && (authorId === 'all' || !authorId)) {
    return posts
  }

  return posts.filter((post) => {
    return (!postId || post.postId === postId)
      && matchKeyword(post, keyword)
      && matchDate(post, dateType, dateValue)
      && matchAuthor(post, authorId)
  })
}

function syncCloudPostsToLocal(posts = []) {
  const normalized = posts.map(normalizeCloudPost)

  updateState('posts', (statePosts) => {
    statePosts.splice(0, statePosts.length, ...normalized)
  })

  return normalized
}

function syncCloudDraftsToLocal(drafts = []) {
  const currentUser = getCurrentUser()
  const normalized = drafts.map(normalizeCloudDraft)

  updateState('momentDrafts', (stateDrafts) => {
    const preserved = stateDrafts.filter((draft) => draft.authorId !== currentUser.userId)
    preserved.unshift(...normalized)
    stateDrafts.splice(0, stateDrafts.length, ...preserved)
  })

  return normalized
}

function callCloudFunction(name, data = {}) {
  return wx.cloud.callFunction({
    name,
    data
  }).then((res) => (res && res.result) || {})
}

function getMomentsFeedAsync(filters = {}) {
  if (!canUseCloudMoments()) {
    return Promise.resolve(getMomentsFeed(filters))
  }

  return callCloudFunction('getPostsFeed')
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_posts_feed_failed')
      }

      syncCloudPostsToLocal(result.posts || [])
      return getMomentsFeed(filters)
    })
    .catch(() => getMomentsFeed(filters))
}

function getPostById(postId) {
  const post = getState('posts').find((item) => item.postId === postId)
  const currentUser = getCurrentUser()

  if (!post || !currentUser || post.authorId !== currentUser.userId) {
    return null
  }

  return normalizePost(post)
}

function getPostByIdAsync(postId) {
  if (!postId) {
    return Promise.resolve(null)
  }

  return getMomentsFeedAsync({}).then(() => getPostById(postId))
}

function buildDefaultLocation(location = {}) {
  const cityInfo = normalizeCity(location.city, {
    latitude: location.latitude,
    longitude: location.longitude
  })

  return {
    enabled: location.enabled === true,
    mode: location.mode || 'manual',
    city: cityInfo,
    placeName: location.placeName || '',
    address: location.address || '',
    source: location.source || 'manual',
    poiId: location.poiId || ''
  }
}

function createPost(payload) {
  const currentUser = getCurrentUser()
  const now = new Date().toISOString()

  const post = {
    postId: createTempId('post'),
    coupleId: getSession().coupleId,
    visibility: 'couple',
    syncStatus: 'local',
    authorId: currentUser.userId,
    authorName: currentUser.nickName,
    authorAvatar: currentUser.avatarUrl,
    content: payload.content || '',
    images: payload.images || [],
    location: buildDefaultLocation(payload.location),
    linkedFootprintId: payload.linkedFootprintId || null,
    shouldCreateFootprint: payload.shouldCreateFootprint === true,
    createdAt: now,
    updatedAt: now,
    comments: []
  }

  updateState('posts', (posts) => {
    posts.unshift(post)
  })

  return normalizePost(post)
}

function sortByUpdatedAtDesc(list) {
  return [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

function getMomentDrafts() {
  const currentUser = getCurrentUser()

  return sortByUpdatedAtDesc(
    getState('momentDrafts')
      .filter((draft) => draft.authorId === currentUser.userId)
      .map((draft) => ({
        ...draft,
        authorName: currentUser.nickName,
        authorAvatar: currentUser.avatarUrl,
        location: buildDefaultLocation(draft.location),
        displayTime: formatPostTime(draft.updatedAt)
      }))
  )
}

function getMomentDraftsAsync() {
  if (!canUseCloudMoments()) {
    return Promise.resolve(getMomentDrafts())
  }

  return callCloudFunction('getMomentDrafts')
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_moment_drafts_failed')
      }

      syncCloudDraftsToLocal(result.drafts || [])
      return getMomentDrafts()
    })
    .catch(() => getMomentDrafts())
}

function getMomentDraftById(draftId) {
  if (!draftId) {
    return null
  }

  const draft = getState('momentDrafts').find((item) => item.draftId === draftId)

  if (!draft) {
    return null
  }

  return {
    ...draft,
    location: buildDefaultLocation(draft.location)
  }
}

function getMomentDraftByIdAsync(draftId) {
  if (!draftId) {
    return Promise.resolve(null)
  }

  if (!canUseCloudMoments()) {
    return Promise.resolve(getMomentDraftById(draftId))
  }

  return callCloudFunction('getMomentDraftById', { draftId })
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_moment_draft_failed')
      }

      const draft = result.draft ? normalizeCloudDraft(result.draft) : null
      if (draft) {
        syncCloudDraftsToLocal([draft])
      }

      return draft || null
    })
    .catch(() => getMomentDraftById(draftId))
}

function saveMomentDraft(payload) {
  const currentUser = getCurrentUser()
  const now = new Date().toISOString()
  const draftId = payload.draftId || createTempId('moment-draft')
  let targetDraft = null

  updateState('momentDrafts', (drafts) => {
    targetDraft = drafts.find((item) => item.draftId === draftId && item.authorId === currentUser.userId)

    if (targetDraft) {
      targetDraft.content = payload.content || ''
      targetDraft.images = payload.images || []
      targetDraft.location = buildDefaultLocation(payload.location)
      targetDraft.updatedAt = now
      return
    }

    targetDraft = {
      draftId,
      authorId: currentUser.userId,
      content: payload.content || '',
      images: payload.images || [],
      location: buildDefaultLocation(payload.location),
      createdAt: now,
      updatedAt: now
    }

    drafts.unshift(targetDraft)
  })

  return targetDraft
}

function saveMomentDraftAsync(payload) {
  if (!canUseCloudMoments()) {
    return Promise.resolve(saveMomentDraft(payload))
  }

  return callCloudFunction('saveMomentDraft', payload)
    .then((result) => {
      if (result.success !== true || !result.draft) {
        throw new Error(result.errorMessage || 'save_moment_draft_failed')
      }

      const draft = normalizeCloudDraft(result.draft)
      syncCloudDraftsToLocal([draft])
      return draft
    })
}

function removeMomentDraft(draftId) {
  if (!draftId) {
    return
  }

  updateState('momentDrafts', (drafts) => {
    const index = drafts.findIndex((draft) => draft.draftId === draftId)

    if (index >= 0) {
      drafts.splice(index, 1)
    }
  })
}

function removeMomentDraftAsync(draftId) {
  if (!canUseCloudMoments()) {
    removeMomentDraft(draftId)
    return Promise.resolve(true)
  }

  return callCloudFunction('removeMomentDraft', { draftId })
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'remove_moment_draft_failed')
      }

      removeMomentDraft(draftId)
      return true
    })
    .catch(() => false)
}

function removePost(postId) {
  const currentUser = getCurrentUser()
  const post = getState('posts').find((item) => item.postId === postId)

  if (!post || !currentUser || post.authorId !== currentUser.userId) {
    return false
  }

  updateState('posts', (posts) => {
    const index = posts.findIndex((item) => item.postId === postId)

    if (index >= 0) {
      posts.splice(index, 1)
    }
  })
  updateState('footprints', (footprints) => {
    for (let index = footprints.length - 1; index >= 0; index -= 1) {
      if (footprints[index].sourceType === 'post' && footprints[index].sourceId === postId) {
        footprints.splice(index, 1)
      }
    }
  })

  return true
}

function removePostAsync(postId) {
  if (!canUseCloudMoments()) {
    return Promise.resolve(removePost(postId))
  }

  return callCloudFunction('removePost', { postId })
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'remove_post_failed')
      }

      return removePost(postId)
    })
}

function syncLinkedFootprintForPost(post) {
  const footprintPayload = createFootprintFromPost(post)
  let linkedFootprint = null

  updateState('footprints', (footprints) => {
    const index = footprints.findIndex((item) => item.sourceType === 'post' && item.sourceId === post.postId)

    if (!footprintPayload) {
      if (index >= 0) {
        footprints.splice(index, 1)
      }
      return
    }

    if (index >= 0) {
      const existing = footprints[index]
      linkedFootprint = {
        ...existing,
        ...footprintPayload,
        footprintId: existing.footprintId,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString()
      }
      footprints.splice(index, 1, linkedFootprint)
      return
    }

    linkedFootprint = footprintPayload
    footprints.unshift(linkedFootprint)
  })

  post.linkedFootprintId = linkedFootprint ? linkedFootprint.footprintId : null
  return linkedFootprint
}

function syncCloudLinkedFootprint(postId, footprint) {
  updateState('footprints', (footprints) => {
    const index = footprints.findIndex((item) => item.sourceType === 'post' && item.sourceId === postId)

    if (!footprint) {
      if (index >= 0) {
        footprints.splice(index, 1)
      }
      return
    }

    if (index >= 0) {
      footprints.splice(index, 1, footprint)
      return
    }

    footprints.unshift(footprint)
  })
}

function updatePost(postId, payload = {}) {
  const currentUser = getCurrentUser()
  let targetPost = null

  updateState('posts', (posts) => {
    targetPost = posts.find((item) => item.postId === postId && item.authorId === currentUser.userId)

    if (!targetPost) {
      return
    }

    targetPost.content = String(payload.content || '').trim()
    targetPost.images = Array.isArray(payload.images) ? payload.images.slice(0, 4) : []
    targetPost.location = buildDefaultLocation(payload.location)
    targetPost.shouldCreateFootprint = payload.shouldCreateFootprint === true
    targetPost.updatedAt = new Date().toISOString()
  })

  if (!targetPost) {
    return null
  }

  syncLinkedFootprintForPost(targetPost)
  return normalizePost(targetPost)
}

function updatePostAsync(postId, payload) {
  if (!canUseCloudMoments()) {
    return Promise.resolve(updatePost(postId, payload))
  }

  return callCloudFunction('updatePost', {
    postId,
    ...payload
  }).then((result) => {
    if (result.success !== true || !result.post) {
      throw new Error(result.errorMessage || 'update_post_failed')
    }

    const post = normalizeCloudPost(result.post)
    updateState('posts', (posts) => {
      const index = posts.findIndex((item) => item.postId === post.postId)

      if (index >= 0) {
        posts.splice(index, 1, post)
      } else {
        posts.unshift(post)
      }
    })

    syncCloudLinkedFootprint(post.postId, result.footprint || null)
    return normalizePost(post)
  })
}

function createLinkedFootprintForPost(post) {
  const footprintPayload = createFootprintFromPost(post)

  if (!footprintPayload) {
    return null
  }

  return footprintService.createFootprint({
    sourceType: footprintPayload.sourceType,
    sourceId: footprintPayload.sourceId,
    title: footprintPayload.title,
    city: footprintPayload.city,
    placeName: footprintPayload.placeName,
    address: footprintPayload.address,
    date: footprintPayload.date,
    note: footprintPayload.note,
    images: footprintPayload.images
  })
}

function publishMoment(payload) {
  const post = createPost({
    content: payload.content,
    images: payload.images,
    location: payload.location,
    linkedFootprintId: payload.linkedFootprintId,
    shouldCreateFootprint: payload.shouldCreateFootprint
  })
  const linkedFootprint = createLinkedFootprintForPost(post)

  if (linkedFootprint) {
    updateState('posts', (posts) => {
      const targetPost = posts.find((item) => item.postId === post.postId)

      if (!targetPost) {
        return
      }

      targetPost.linkedFootprintId = linkedFootprint.footprintId
    })

    post.linkedFootprintId = linkedFootprint.footprintId
  }

  if (payload.draftId) {
    removeMomentDraft(payload.draftId)
  }

  return post
}

function publishMomentAsync(payload) {
  if (!canUseCloudMoments()) {
    return Promise.resolve(publishMoment(payload))
  }

  return callCloudFunction('publishPost', payload)
    .then((result) => {
      if (result.success !== true || !result.post) {
        throw new Error(result.errorMessage || 'publish_post_failed')
      }

      const post = normalizeCloudPost(result.post)
      syncCloudPostsToLocal([post, ...getState('posts')])

      if (payload.draftId) {
        removeMomentDraft(payload.draftId)
      }

      const linkedFootprint = result.footprint || null

      if (linkedFootprint) {
        post.linkedFootprintId = linkedFootprint.footprintId

        updateState('footprints', (footprints) => {
          const exists = footprints.some((item) => item.footprintId === linkedFootprint.footprintId)

          if (!exists) {
            footprints.unshift(linkedFootprint)
          }
        })
      }

      return normalizePost(post)
    })
}

function addComment(postId, payload) {
  const currentUser = getCurrentUser()
  const now = new Date().toISOString()
  const newComment = {
    commentId: createTempId('comment'),
    postId,
    userId: currentUser.userId,
    userName: currentUser.nickName,
    userAvatar: currentUser.avatarUrl,
    content: payload.content,
    createdAt: now,
    updatedAt: now,
    syncStatus: 'local'
  }

  let targetPost = null

  updateState('posts', (posts) => {
    targetPost = posts.find((post) => post.postId === postId)

    if (!targetPost) {
      return
    }

    if (!Array.isArray(targetPost.comments)) {
      targetPost.comments = []
    }

    targetPost.comments.push(newComment)
    targetPost.updatedAt = now
  })

  if (!targetPost) {
    return null
  }

  return normalizePost(targetPost)
}

function addCommentAsync(postId, payload) {
  if (!canUseCloudMoments()) {
    return Promise.resolve(addComment(postId, payload))
  }

  return callCloudFunction('addPostComment', {
    postId,
    content: payload.content
  }).then((result) => {
    if (result.success !== true || !result.post) {
      throw new Error(result.errorMessage || 'add_post_comment_failed')
    }

    const post = normalizeCloudPost(result.post)
    updateState('posts', (posts) => {
      const index = posts.findIndex((item) => item.postId === post.postId)

      if (index >= 0) {
        posts.splice(index, 1, post)
        return
      }

      posts.unshift(post)
    })

    return normalizePost(post)
  })
}

module.exports = {
  getUsers,
  getCurrentUser,
  switchCurrentUser,
  updateUserProfile,
  getMomentsFeed,
  getMomentsFeedAsync,
  getPostById,
  getPostByIdAsync,
  createPost,
  getMomentDrafts,
  getMomentDraftsAsync,
  getMomentDraftById,
  getMomentDraftByIdAsync,
  saveMomentDraft,
  saveMomentDraftAsync,
  removeMomentDraft,
  removeMomentDraftAsync,
  removePost,
  removePostAsync,
  updatePost,
  updatePostAsync,
  publishMoment,
  publishMomentAsync,
  addComment
  ,
  addCommentAsync
}
