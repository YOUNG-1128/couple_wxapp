const bucketListService = require('../../services/bucket-list')

const COMPLETE_TOASTS = [
  '又一起完成了一件小事 ❤️',
  '我们的故事又多了一点点'
]

Page({
  data: {
    title: '情侣100件事',
    pendingItems: [],
    completedItems: [],
    completedCount: 0,
    total: 100,
    percent: 0,
    togglingItemId: 0
  },

  onLoad() {
    this.refreshData()
  },

  onShow() {
    this.refreshData()
  },

  refreshData() {
    return bucketListService.getBucketListPageDataAsync().then((pageData) => {
      this.setData({
        pendingItems: pageData.pendingItems,
        completedItems: pageData.completedItems,
        completedCount: pageData.completedCount,
        total: pageData.total,
        percent: pageData.percent
      })
    })
  },

  onToggleItem(event) {
    const id = Number(event.currentTarget.dataset.id)

    if (!id || this.data.togglingItemId) {
      return
    }

    this.setData({ togglingItemId: id })
    bucketListService.toggleBucketItemAsync(id).then((updated) => {
      if (!updated) {
        return
      }

      return this.refreshData().then(() => {
        if (updated.completed) {
          const message = COMPLETE_TOASTS[Math.floor(Math.random() * COMPLETE_TOASTS.length)]

          wx.showToast({
            title: message,
            icon: 'none'
          })
          return
        }

        wx.showToast({
          title: '已取消完成',
          icon: 'none'
        })
      })
    }).catch(() => {
      wx.showToast({
        title: '更新失败，请稍后重试',
        icon: 'none'
      })
    }).finally(() => this.setData({ togglingItemId: 0 }))
  }
})
