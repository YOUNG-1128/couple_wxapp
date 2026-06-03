const questionDailyService = require('../../services/question-daily')

Page({
  data: {
    pageData: null,
    answerDraft: ''
  },

  onShow() {
    this.refreshData()
  },

  refreshData() {
    return questionDailyService.getTodayPageDataAsync()
      .then((pageData) => {
        this.setData({
          pageData,
          answerDraft: ''
        })

        if (pageData.analysisReady && pageData.hasUnreadResult) {
          return questionDailyService.markResultViewedAsync(pageData.recordId).then(() => {
            this.setData({
              'pageData.hasUnreadResult': false
            })
          })
        }
      })
      .catch((error) => {
        const message = error && (error.message || error.errMsg) ? String(error.message || error.errMsg) : '问答加载失败'
        wx.showToast({
          title: message.slice(0, 20),
          icon: 'none'
        })
      })
  },

  onInput(event) {
    this.setData({
      answerDraft: event.detail.value
    })
  },

  onSubmit() {
    const answer = (this.data.answerDraft || '').trim()

    if (!answer) {
      wx.showToast({
        title: '先写下你的答案吧',
        icon: 'none'
      })
      return
    }

    questionDailyService.submitAnswerAsync(answer)
      .then(() => this.refreshData())
      .then(() => {
        wx.showToast({
          title: '已提交今日回答',
          icon: 'success'
        })
      })
      .catch((error) => {
        const message = error && (error.message || error.errMsg) ? String(error.message || error.errMsg) : '提交失败'
        wx.showToast({
          title: message.slice(0, 20),
          icon: 'none'
        })
      })
  },

  onGenerateAnalysis() {
    questionDailyService.generateAIAnalysisAsync()
      .then((analysis) => {
        if (!analysis || !analysis.recordId) {
          wx.showToast({
            title: '等双方都回答后再生成哦',
            icon: 'none'
          })
          return
        }

        return this.refreshData().then(() => {
          wx.showToast({
            title: '已生成今天的观察',
            icon: 'none'
          })
        })
      })
      .catch((error) => {
        const message = error && (error.message || error.errMsg) ? String(error.message || error.errMsg) : '等双方都回答后再生成哦'
        wx.showToast({
          title: message.slice(0, 20),
          icon: 'none'
        })
      })
  },

  onOpenHistory() {
    wx.navigateTo({
      url: '/pages/question-history/question-history'
    })
  }
})
