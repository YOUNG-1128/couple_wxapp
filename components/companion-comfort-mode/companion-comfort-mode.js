Component({
  properties: {
    modes: {
      type: Array,
      value: []
    }
  },

  methods: {
    onModeTap(event) {
      this.triggerEvent('comforttap', {
        text: event.currentTarget.dataset.text
      })
    }
  }
})
