function normalizeFootprintId(event = {}) {
  const footprintId = String(event.footprintId || '').trim().slice(0, 100)

  if (!footprintId) {
    throw new Error('footprint_id_required')
  }

  return footprintId
}

module.exports = {
  normalizeFootprintId
}
