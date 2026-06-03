Component({
  properties: {
    entry: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onTap() {
      this.triggerEvent('footprinttap')
    }
  }
})
