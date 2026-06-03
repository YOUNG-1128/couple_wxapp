const mailboxService = require('../../services/mailbox')

Page({
  data: {
    letter: null,
    paperDate: '',
    senderSign: '—— 我',
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

    const paperDate = this.formatPaperDate(detail.sentAt || detail.createdAt)

    this.setData({
      letter: detail,
      paperDate,
      senderSign: detail.fromUser && detail.fromUser.nickName ? `—— ${detail.fromUser.nickName}` : '—— 我',
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
  },

  formatPaperDate(input) {
    if (!input) {
      return ''
    }

    const date = new Date(input)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')

    return `${y}.${m}.${d}`
  }
})
