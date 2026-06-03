const questionDailyService = require('../../services/question-daily')

Page({
  data: {
    records: [],
    activeRecordId: ''
  },

  onShow() {
    this.refreshData()
  },

  refreshData() {
    return questionDailyService.getHistoryRecordsAsync()
      .then((records) => {
        this.setData({
          records
        })
      })
      .catch(() => {
        wx.showToast({
          title: '历史问答加载失败',
          icon: 'none'
        })
      })
  },

  onToggleDetail(event) {
    const recordId = event.currentTarget.dataset.recordId

    if (!recordId) {
      return
    }

    this.setData({
      activeRecordId: this.data.activeRecordId === recordId ? '' : recordId
    })
  }
})
