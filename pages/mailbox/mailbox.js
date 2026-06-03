const mailboxService = require('../../services/mailbox')

Page({
  data: {
    currentUser: null,
    partnerUser: null,
    history: [],
    hasDrafts: false,
    unreadIncomingCount: 0,
    showReader: false,
    readerReady: false,
    readerLetter: null,
    readerDate: '',
    readerSign: '—— 我'
  },

  onShow() {
    this.refreshPageData()
  },

  refreshPageData() {
    mailboxService.getMailboxPageDataAsync().then((pageData) => {
      const unreadIncomingCount = pageData.history.filter((item) => item.isUnreadForMe).length

      this.setData({
        currentUser: pageData.currentUser,
        partnerUser: pageData.partnerUser,
        history: pageData.history,
        hasDrafts: pageData.drafts.length > 0,
        unreadIncomingCount
      })
    })
  },

  onOpenCompose() {
    wx.navigateTo({
      url: '/pages/mailbox-compose/mailbox-compose'
    })
  },

  onOpenDrafts() {
    wx.navigateTo({
      url: '/pages/mailbox-drafts/mailbox-drafts'
    })
  },

  onOpenHistoryDetail(event) {
    const letterId = event.currentTarget.dataset.id
    if (!letterId) {
      return
    }

    mailboxService.getLetterDetailOnOpenAsync(letterId).then((detail) => {
      if (!detail) {
        return
      }

      this.setData({
        showReader: true,
        readerReady: false,
        readerLetter: detail,
        readerDate: this.formatPaperDate(detail.sentAt || detail.createdAt),
        readerSign: detail.fromUser && detail.fromUser.nickName ? `—— ${detail.fromUser.nickName}` : '—— 我'
      })

      this.refreshPageData()

      setTimeout(() => {
        this.setData({ readerReady: true })
      }, 24)
    })
  },

  onCloseReader() {
    this.setData({
      showReader: false,
      readerReady: false,
      readerLetter: null
    })
  },

  onPreviewReaderImage(event) {
    const current = event.currentTarget.dataset.src
    const letter = this.data.readerLetter

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
  },

  noop() {
  }
})
