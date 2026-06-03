Component({
  properties: {
    mailbox: {
      type: Object,
      value: {}
    }
  },

  data: {
    activeTag: '',
    moodText: ''
  },

  methods: {
    onInput(event) {
      this.setData({
        moodText: event.detail.value
      })
    },

    onTagTap(event) {
      this.setData({
        activeTag: event.currentTarget.dataset.tag
      })
    },

    onSubmit() {
      this.triggerEvent('moodsubmit', {
        content: this.data.moodText,
        tag: this.data.activeTag
      })

      this.setData({
        activeTag: '',
        moodText: ''
      })
    }
  }
})
