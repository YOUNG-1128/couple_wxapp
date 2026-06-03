const capsuleService = require('../../services/capsule')

Page({
  data: {
    capsules: capsuleService.getCapsuleData().capsules,
    form: {
      title: '',
      content: '',
      openAt: '2026-04-30',
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
    showDetail: false
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

    if (!form.title || !form.content || !form.openAt) {
      wx.showToast({
        title: '先把胶囊写完整',
        icon: 'none'
      })
      return
    }

    const result = capsuleService.createCapsule(form)

    this.setData({
      capsules: result.capsules,
      form: {
        title: '',
        content: '',
        openAt: '2026-04-30',
        type: 'week_later'
      }
    })

    wx.showToast({
      title: '已封存到时光胶囊',
      icon: 'none'
    })
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

    const opened = capsuleService.openCapsule(capsule.id)

    this.setData({
      capsules: capsuleService.getCapsuleData().capsules,
      selectedCapsule: opened,
      showDetail: true
    })
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
