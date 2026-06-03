Component({
  properties: {
    checklist: {
      type: Object,
      value: {}
    }
  },

  methods: {
    onTaskTap(event) {
      this.triggerEvent('checktoggle', {
        index: event.currentTarget.dataset.index
      })
    }
  }
})
