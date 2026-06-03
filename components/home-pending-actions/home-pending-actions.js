Component({
  properties: {
    list: {
      type: Array,
      value: []
    }
  },

  methods: {
    onItemTap(event) {
      this.triggerEvent('actiontap', {
        item: event.currentTarget.dataset.item
      })
    }
  }
})
