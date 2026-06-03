Component({
  properties: {
    privacy: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('privacytap')
    }
  }
})
