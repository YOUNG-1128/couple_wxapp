const capsuleService = require('../../services/capsule')

Page({
  data: {
    capsules: capsuleService.getCapsuleData().capsules,
    form: {
      title: '',
      content: '',
      openAt: capsuleService.getDefaultOpenDate(),
      type: 'week_later'
    },
    types: [
      {
        label: '一周后打开',
        value: 'week_later'
      },
      {
        label: '生日打开',
        value: 'birthday'
      },
      {
        label: '纪念日打开',
        value: 'anniversary'
      },
      {
        label: '自定义日期',
        value: 'custom'
      }
    ],
    selectedCapsule: null,
    showDetail: false,
    saving: false,
    openingCapsuleId: ''
  },

  onShow() {
    this.refreshData()
  },

  refreshData() {
    return capsuleService.getCapsuleDataAsync().then((data) => {
      this.setData({ capsules: data.capsules })
    })
  },

  onTitleInput(event) {
    this.setData({
      'form.title': event.detail.value
    })
  },

  onContentInput(event) {
    this.setData({
      'form.content': event.detail.value
    })
  },

  onOpenAtInput(event) {
    this.setData({
      'form.openAt': event.detail.value
    })
  },

  onTypeTap(event) {
    this.setData({
      'form.type': event.currentTarget.dataset.value
    })
  },

  onSealTap() {
    const form = this.data.form

    if (!form.title || !form.content || !form.openAt || this.data.saving) {
      wx.showToast({
        title: '先把胶囊写完整',
        icon: 'none'
      })
      return
    }

    this.setData({ saving: true })
    capsuleService.createCapsuleAsync(form).then((result) => {
      this.setData({
        capsules: result.capsules,
        form: {
          title: '',
          content: '',
          openAt: capsuleService.getDefaultOpenDate(),
          type: 'week_later'
        }
      })

      wx.showToast({
        title: '已封存到时光胶囊',
        icon: 'none'
      })
    }).catch(() => {
      wx.showToast({
        title: '胶囊封存失败',
        icon: 'none'
      })
    }).finally(() => this.setData({ saving: false }))
  },

  onCapsuleTap(event) {
    const capsule = this.data.capsules.find((item) => item.id === event.currentTarget.dataset.id)

    if (!capsule) {
      return
    }

    if (capsule.status === 'locked') {
      wx.showToast({
        title: '还没到开启日期',
        icon: 'none'
      })
      return
    }

    if (this.data.openingCapsuleId) {
      return
    }

    this.setData({ openingCapsuleId: capsule.id })
    capsuleService.openCapsuleAsync(capsule.id).then((opened) => {
      this.setData({
        capsules: capsuleService.getCapsuleData().capsules,
        selectedCapsule: opened,
        showDetail: true
      })
    }).catch(() => {
      wx.showToast({
        title: '胶囊暂时无法开启',
        icon: 'none'
      })
    }).finally(() => this.setData({ openingCapsuleId: '' }))
  },

  onCloseDetail() {
    this.setData({
      selectedCapsule: null,
      showDetail: false
    })
  },

  noop() {

  },
})
