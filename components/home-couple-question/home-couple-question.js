Component({
  properties: {
    question: {
      type: Object,
      value: {}
    }
  },

  data: {
    answerText: ''
  },

  methods: {
    onInput(event) {
      this.setData({
        answerText: event.detail.value
      })
    },

    onSubmit() {
      if (!this.data.answerText) {
        wx.showToast({
          title: '先写下你的答案',
          icon: 'none'
        })
        return
      }

      this.triggerEvent('answer', {
        answer: this.data.answerText
      })

      this.setData({
        answerText: ''
      })
    }
  }
})
