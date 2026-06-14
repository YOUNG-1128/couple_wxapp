Page({
  data: {
    features: [
      { key: 'mailbox', name: '信箱', desc: '留一句只给你看的话', target: '/pages/mailbox/mailbox' },
      { key: 'moments', name: '朋友圈', desc: '收好我们的日常碎片', target: '/pages/album/album' },
      { key: 'todo', name: '待办', desc: '一起完成今天的小目标', target: '/pages/todo/todo' },
      { key: 'anniversary', name: '纪念日', desc: '记住每个重要日子', target: '/pages/anniversary/anniversary' },
      { key: 'footprint', name: '我们的足迹', desc: '点亮一起走过的地方', target: '/pages/footprint/footprint' },
      { key: 'checklist', name: '100件事', desc: '慢慢实现共同愿望', target: '/pages/bucket-list/bucket-list' },
      { key: 'dailyQuestion', name: '每日问答', desc: '每天再了解你一点', target: '/pages/daily-question/daily-question' },
      { key: 'missyou', name: '想你了', desc: '悄悄发送一份想念', target: '/pages/companion/companion' }
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
