Component({
  properties: {
    album: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onViewAll() {
      this.triggerEvent('albumtap')
    }
  }
})
