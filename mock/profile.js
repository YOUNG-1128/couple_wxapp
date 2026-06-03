module.exports = {
  preferences: [
    {
      label: '喜欢的饮品',
      value: '热拿铁，少糖'
    },
    {
      label: '偏爱的约会',
      value: '散步、看电影、吃甜点'
    },
    {
      label: '需要被照顾时',
      value: '先抱抱，再慢慢说'
    }
  ],
  checklist: {
    completed: 18,
    total: 100,
    percent: 18,
    examples: [
      {
        text: '一起看一场日落',
        done: true
      },
      {
        text: '给对方写一封信',
        done: true
      },
      {
        text: '一起做一顿晚餐',
        done: false
      },
      {
        text: '去一个没去过的城市',
        done: false
      }
    ]
  },
  account: {
    self: '已登录',
    partner: '等待对方绑定',
    desc: '账号绑定状态仅展示，真实绑定逻辑稍后接入。'
  },
  privacy: {
    title: '隐私设置',
    desc: '管理回忆、心情和账号相关的可见范围。'
  }
}
