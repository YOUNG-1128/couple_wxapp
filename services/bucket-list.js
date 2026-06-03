const { getState, updateState } = require('./local-state')

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
    icon: item.completed ? '❤️' : '🤍',
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

module.exports = {
  getBucketListPageData,
  toggleBucketItem
}
