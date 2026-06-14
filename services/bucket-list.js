const { getState, updateState } = require('./local-state')
const relationshipService = require('./relationship')

function canUseCloudBucketList() {
  const session = getState('session') || {}
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

function callCloudFunction(name, data = {}) {
  return wx.cloud.callFunction({ name, data }).then((res) => (res && res.result) || {})
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatCompletedTime(input) {
  if (!input) {
    return ''
  }

  const date = new Date(input)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toSequenceLabel(id) {
  return id >= 100 ? String(id) : pad(id)
}

function decorateItem(item) {
  return {
    ...item,
    sequenceLabel: toSequenceLabel(item.id),
    completedAtLabel: item.completed ? formatCompletedTime(item.completedAt) : ''
  }
}

function getBucketListPageData() {
  const list = getState('bucketList') || []
  const pendingItems = list
    .filter((item) => !item.completed)
    .sort((a, b) => a.id - b.id)
    .map(decorateItem)

  const completedItems = list
    .filter((item) => item.completed)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .map(decorateItem)

  const completedCount = completedItems.length
  const total = list.length
  const percent = total ? Math.round((completedCount / total) * 100) : 0

  return {
    pendingItems,
    completedItems,
    completedCount,
    total,
    percent
  }
}

function mergeCloudProgress(progressRecords = []) {
  const progressMap = progressRecords.reduce((map, record) => {
    map[Number(record.itemId)] = record
    return map
  }, {})

  updateState('bucketList', (bucketList) => {
    bucketList.forEach((item) => {
      const progress = progressMap[item.id]
      item.completed = Boolean(progress && progress.completed)
      item.completedAt = item.completed ? progress.completedAt || null : null
      item.completedByUserId = item.completed ? progress.completedByUserId || '' : ''
      item.updatedAt = progress ? progress.updatedAt || '' : ''
    })
  })

  return getState('bucketList') || []
}

function getBucketListPageDataAsync() {
  if (!canUseCloudBucketList()) {
    return Promise.resolve(getBucketListPageData())
  }

  return callCloudFunction('getBucketListProgress')
    .then((result) => {
      if (result.success !== true) {
        throw new Error(result.errorMessage || 'get_bucket_list_progress_failed')
      }

      mergeCloudProgress(result.progressRecords || [])
      return getBucketListPageData()
    })
    .catch(() => getBucketListPageData())
}

function toggleBucketItem(id) {
  let updated = null

  updateState('bucketList', (bucketList) => {
    const item = bucketList.find((entry) => entry.id === id)

    if (!item) {
      return
    }

    item.completed = !item.completed
    item.completedAt = item.completed ? new Date().toISOString() : null
    updated = { ...item }
  })

  return updated
}

function toggleBucketItemAsync(id) {
  const item = (getState('bucketList') || []).find((entry) => entry.id === id)

  if (!item) {
    return Promise.resolve(null)
  }

  if (!canUseCloudBucketList()) {
    return Promise.resolve(toggleBucketItem(id))
  }

  return callCloudFunction('toggleBucketListItem', {
    itemId: item.id,
    title: item.title,
    completed: !item.completed
  }).then((result) => {
    if (result.success !== true || !result.progressRecord) {
      throw new Error(result.errorMessage || 'toggle_bucket_list_item_failed')
    }

    const progress = result.progressRecord
    updateState('bucketList', (bucketList) => {
      const target = bucketList.find((entry) => entry.id === id)

      if (!target) {
        return
      }

      target.completed = Boolean(progress.completed)
      target.completedAt = progress.completedAt || null
      target.completedByUserId = progress.completedByUserId || ''
      target.updatedAt = progress.updatedAt || ''
    })
    return (getState('bucketList') || []).find((entry) => entry.id === id) || null
  })
}

module.exports = {
  getBucketListPageData,
  getBucketListPageDataAsync,
  mergeCloudProgress,
  toggleBucketItem,
  toggleBucketItemAsync
}
