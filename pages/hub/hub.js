Page({
  data: {
    features: [
      { key: 'mailbox', icon: '💌', name: '信箱', desc: '看看今天的小留言', target: '/pages/mailbox/mailbox' },
      { key: 'moments', icon: '📷', name: '朋友圈', desc: '记录我们的日常', target: '/pages/album/album' },
      { key: 'todo', icon: '✅', name: '待办', desc: '一起完成小目标', target: '/pages/todo/todo' },
      { key: 'anniversary', icon: '🎂', name: '纪念日', desc: '重要日子提醒', target: '/pages/anniversary/anniversary' },
      { key: 'footprint', icon: '🗺️', name: '我们的足迹', desc: '把一起走过的地方点亮', target: '/pages/footprint/footprint' },
      { key: 'checklist', icon: '🧩', name: '100件事', desc: '慢慢打卡小愿望', target: '/pages/bucket-list/bucket-list' },
      { key: 'dailyQuestion', icon: '❓', name: '每日问答', desc: '今天也认真了解你', target: '/pages/daily-question/daily-question' },
      { key: 'missyou', icon: '💗', name: '想你按钮', desc: '一键发送想念', target: '/pages/companion/companion' }
    ]
  },

  onFeatureTap(event) {
    const target = event.currentTarget.dataset.target

    if (!target) {
      return
    }

    wx.navigateTo({ url: target })
  }
})
