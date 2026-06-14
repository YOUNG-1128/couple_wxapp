const mailboxService = require('../../services/mailbox')

Page({
  data: {
    letter: null,
    isVisible: true,
    paperReady: false
  },

  onLoad(options) {
    const letterId = options && options.letterId ? options.letterId : ''

    if (!letterId) {
      wx.showToast({
        title: '信件不存在',
        icon: 'none'
      })
      return
    }

    const detail = mailboxService.getLetterDetailOnOpen(letterId)

    if (!detail) {
      wx.showToast({
        title: '信件不存在',
        icon: 'none'
      })
      return
    }

    this.setData({
      letter: detail,
      isVisible: !!detail.visible
    })

    setTimeout(() => {
      this.setData({
        paperReady: true
      })
    }, 24)
  },

  onPreviewImage(event) {
    const current = event.currentTarget.dataset.src
    const letter = this.data.letter

    if (!letter || !letter.images || !letter.images.length) {
      return
    }

    wx.previewImage({
      current,
      urls: letter.images
    })
  }
})
