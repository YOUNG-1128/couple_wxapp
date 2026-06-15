const mailboxService = require('../../services/mailbox')

Page({
  data: {
    currentUser: null,
    partnerUser: null,
    history: [],
    archived: [],
    activeList: 'history',
    hasDrafts: false,
    unreadIncomingCount: 0,
    showReader: false,
    readerReady: false,
    readerLetter: null
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
        archived: pageData.archived,
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

  onSelectList(event) {
    const activeList = event.currentTarget.dataset.list

    if (activeList === 'history' || activeList === 'archived') {
      this.setData({ activeList })
    }
  },

  onToggleArchive(event) {
    const letterId = event.currentTarget.dataset.id
    const archived = event.currentTarget.dataset.archived === true

    if (!letterId) {
      return
    }

    mailboxService.setLetterArchivedAsync(letterId, archived)
      .then((updated) => {
        if (!updated) {
          throw new Error('archive_update_failed')
        }

        this.refreshPageData()
        wx.showToast({
          title: archived ? '已归档' : '已恢复',
          icon: 'success'
        })
      })
      .catch(() => {
        wx.showToast({
          title: '操作失败，请稍后重试',
          icon: 'none'
        })
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
        readerLetter: detail
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

  noop() {
  }
})
