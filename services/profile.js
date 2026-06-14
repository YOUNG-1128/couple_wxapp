const { getState, updateState } = require('./local-state')

const ABOUT_TA_STORAGE_PREFIX = 'couple_about_ta_'

function normalizeAboutTaNotes(value) {
  const lines = Array.isArray(value)
    ? value
    : String(value || '').split(/\r?\n/)

  return lines
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 50)
}

function getAboutTaStorageKey(userId = '') {
  return `${ABOUT_TA_STORAGE_PREFIX}${userId || 'local'}`
}

function getProfileData() {
  return getState('profile')
}

function getAboutTaNotes(userId = '') {
  let storedNotes = null

  try {
    storedNotes = wx.getStorageSync(getAboutTaStorageKey(userId))
  } catch (error) {
    storedNotes = null
  }

  if (Array.isArray(storedNotes)) {
    return normalizeAboutTaNotes(storedNotes)
  }

  return normalizeAboutTaNotes(getState('profile').aboutTaNotes || [])
}

function saveAboutTaNotes(userId = '', value = []) {
  const notes = normalizeAboutTaNotes(value)

  updateState('profile', (profile) => {
    profile.aboutTaNotes = notes
  })

  try {
    wx.setStorageSync(getAboutTaStorageKey(userId), notes)
  } catch (error) {
    // Keep the in-memory copy available when local storage is unavailable.
  }

  return notes
}

function toggleChecklistItem(index) {
  const profileData = updateState('profile', (data) => {
    const checklist = data.checklist
    const item = checklist.examples[index]

    if (!item) {
      return
    }

    item.done = !item.done
    checklist.completed += item.done ? 1 : -1
    checklist.completed = Math.max(0, Math.min(checklist.completed, checklist.total))
    checklist.percent = Math.round((checklist.completed / checklist.total) * 100)
  })

  return profileData.checklist
}

module.exports = {
  getProfileData,
  getAboutTaNotes,
  saveAboutTaNotes,
  toggleChecklistItem
}
