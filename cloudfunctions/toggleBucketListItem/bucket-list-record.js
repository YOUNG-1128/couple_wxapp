function normalizeBucketItemInput(event = {}) {
  const itemId = Number(event.itemId)
  const title = String(event.title || '').trim().slice(0, 60)

  if (!Number.isInteger(itemId) || itemId < 1 || itemId > 100) {
    throw new Error('item_id_invalid')
  }

  if (!title) {
    throw new Error('title_required')
  }

  return {
    itemId,
    title,
    completed: event.completed === true
  }
}

module.exports = {
  normalizeBucketItemInput
}
