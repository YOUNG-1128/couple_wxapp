const momentsService = require('../../services/moments')

Page({
  data: {
    drafts: [],
    emptyText: '草稿箱还是空的，先去写下一条瞬间吧。'
  },

  onShow() {
    this.refreshDrafts()
  },

  refreshDrafts() {
    momentsService.getMomentDraftsAsync().then((drafts) => {
      this.setData({
        drafts
      })
    })
  },

  onEditDraft(event) {
    const draftId = event.currentTarget.dataset.draftId

    if (!draftId) {
      return
    }

    wx.navigateTo({
      url: `/pages/album-compose/album-compose?draftId=${draftId}`
    })
  },

  onNewCompose() {
    wx.navigateTo({
      url: '/pages/album-compose/album-compose'
    })
  },

  onDeleteDraft(event) {
    const draftId = event.currentTarget.dataset.draftId

    if (!draftId) {
      return
    }

    wx.showModal({
      title: '删除草稿',
      content: '这条朋友圈草稿删除后将无法恢复，确定要删除吗？',
      confirmColor: '#e85d75',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        momentsService.removeMomentDraftAsync(draftId).then((removed) => {
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
