const { getState, updateState } = require('./local-state')

function getProfileData() {
  return getState('profile')
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
  toggleChecklistItem
}
