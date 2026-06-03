const companionService = require('../../services/companion')

Page({
  data: {
    ...companionService.getCompanionData(),
    scrollIntoView: ''
  },

  onLoad(options) {
    const section = options && options.section ? options.section : ''

    if (!section) {
      return
    }

    this.setData({
      scrollIntoView: this.getSectionAnchor(section)
    })
  },

  onShow() {
    companionService.markReceivedMissSignalsAsReadAsync().then(() => {
      return companionService.getCompanionDataAsync()
    }).then((data) => {
      this.setData({
        ...data,
        scrollIntoView: this.data.scrollIntoView
      })
    })
  },

  getSectionAnchor(section) {
    if (section === 'missHistory') {
      return 'miss-history-section'
    }

    return ''
  },

  onSendMissYou() {
    companionService.sendMissYouAsync().then(() => {
      return companionService.getCompanionDataAsync()
    }).then((data) => {
      this.setData({
        ...data,
        scrollIntoView: 'miss-history-section'
      })

      wx.showToast({
        title: '已把想念送给 TA',
        icon: 'none'
      })
    })
  }
})
