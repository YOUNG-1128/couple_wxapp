Component({
  properties: {
    notes: {
      type: Array,
      value: []
    }
  },

  methods: {
    onEdit() {
      this.triggerEvent('edit')
    }
  }
})
