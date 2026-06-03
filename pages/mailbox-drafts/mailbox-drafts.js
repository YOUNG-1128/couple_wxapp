const mailboxService = require('../../services/mailbox')

Page({
  data: {
    drafts: []
  },

  onShow() {
    this.refreshDrafts()
  },

  refreshDrafts() {
    mailboxService.getMailboxPageDataAsync().then((pageData) => {
      this.setData({
        drafts: pageData.drafts
      })
    })
  },

  onNewCompose() {
    wx.navigateTo({
      url: '/pages/mailbox-compose/mailbox-compose'
    })
  },

  onEditDraft(event) {
    const letterId = event.currentTarget.dataset.id

    if (!letterId) {
      return
    }

    wx.navigateTo({
      url: `/pages/mailbox-compose/mailbox-compose?draftId=${letterId}`
    })
  },

  onDeleteDraft(event) {
    const letterId = event.currentTarget.dataset.id

    if (!letterId) {
      return
    }

    wx.showModal({
      title: '删除草稿',
      content: '这封草稿删除后将无法恢复，确定要删除吗？',
      confirmColor: '#e85d75',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        mailboxService.removeDraftAsync(letterId).then((removed) => {
          if (!removed) {
            wx.showToast({
              title: '草稿删除失败',
              icon: 'none'
            })
            return
          }

          this.refreshDrafts()
          wx.showToast({
            title: '草稿已删除',
            icon: 'success'
          })
        })
      }
    })
  }
})
