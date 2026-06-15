function normalizePaginationInput(event = {}) {
  const offset = Math.max(0, Number(event.offset) || 0)
  const requestedPageSize = Math.max(1, Number(event.pageSize) || 10)

  return {
    offset,
    pageSize: Math.min(20, requestedPageSize)
  }
}

module.exports = {
  normalizePaginationInput
}
