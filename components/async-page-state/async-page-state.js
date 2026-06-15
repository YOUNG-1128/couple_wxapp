Component({
  properties: {
    mode: {
      type: String,
      value: ''
    },
    message: {
      type: String,
      value: ''
    },
    retryText: {
      type: String,
      value: '重新加载'
    }
  },

  methods: {
    onRetry() {
      this.triggerEvent('retry')
    }
  }
})
