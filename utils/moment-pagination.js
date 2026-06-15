function paginateMoments(items = [], options = {}) {
  const offset = Math.max(0, Number(options.offset) || 0)
  const pageSize = Math.max(1, Number(options.pageSize) || 10)
  const pageItems = items.slice(offset, offset + pageSize)

  return {
    items: pageItems,
    hasMore: offset + pageItems.length < items.length,
    nextOffset: offset + pageItems.length
  }
}

module.exports = {
  paginateMoments
}
