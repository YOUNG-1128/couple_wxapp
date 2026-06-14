const momentsService = require('../../services/moments')
const dailyMoodService = require('../../services/dailyMood')
const { toDateKey } = require('../../utils/time')
const { MOOD_OPTIONS, buildMoodTrend } = require('../../utils/mood-trend')

Page({
  data: {
    options: MOOD_OPTIONS,
    selectedMood: '',
    note: '',
    currentUser: {},
    trend: {
      recordedDays: 0,
      items: []
    }
  },

  onShow() {
    const currentUser = momentsService.getCurrentUser()

    if (!currentUser) {
      return
    }

    dailyMoodService.getStatusRecordsAsync().then(() => {
      const todayMood = dailyMoodService.getTodayMood(currentUser.userId)

      this.setData({
        currentUser,
        selectedMood: todayMood ? todayMood.status : '',
        note: todayMood ? todayMood.note : '',
        trend: buildMoodTrend(
          dailyMoodService.getStatusRecords(),
          currentUser.userId,
          toDateKey(new Date())
        )
      })
    })
  },

  onSelectMood(event) {
    this.setData({
      selectedMood: event.currentTarget.dataset.mood
    })
  },

  onNoteInput(event) {
    this.setData({
      note: event.detail.value
    })
  },

  onSave() {
    const selectedMood = this.data.selectedMood
    const currentUser = this.data.currentUser

    if (!selectedMood) {
      wx.showToast({
        title: '先选择一个状态吧',
        icon: 'none'
      })

      return
    }

    dailyMoodService.saveTodayStatusAsync({
      userId: currentUser.userId,
      status: selectedMood,
      note: (this.data.note || '').trim()
    }).then(() => {
      wx.showToast({
        title: '今日状态已保存',
        icon: 'success'
      })

      setTimeout(() => {
        wx.navigateBack()
      }, 300)
    }).catch(() => {
      wx.showToast({
        title: '状态保存失败',
        icon: 'none'
      })
    })
  }
})
