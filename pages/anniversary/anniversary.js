const anniversaryService = require('../../services/anniversary')
const relationshipService = require('../../services/relationship')
const cloudStorageService = require('../../services/cloud-storage')

Page({
  data: {
    pageTitle: '纪念日',
    pageSubtitle: '把重要的日子温柔地记下来',
    list: [],
    highlighted: null,
    showCreator: false,
    typeOptions: [],
    formTitle: '',
    formDate: '',
    formType: '恋爱纪念日',
    formRepeatType: 'yearly',
    formNote: '',
    formCoverImage: '',
    saving: false
  },

  onShow() {
    this.refreshData()
  },

  refreshData() {
    const pageData = anniversaryService.getAnniversaryPageData()

    this.setData({
      list: pageData.list,
      highlighted: pageData.highlighted,
      typeOptions: pageData.types
    })
  },

  onOpenCreator() {
    this.setData({ showCreator: true })
  },

  onCloseCreator() {
    this.setData({ showCreator: false })
  },

  noop() {

  },

  onTitleInput(event) {
    this.setData({ formTitle: event.detail.value })
  },

  onDateChange(event) {
    this.setData({ formDate: event.detail.value })
  },

  onTypeChange(event) {
    const index = Number(event.detail.value)
    const option = this.data.typeOptions[index]

    if (!option) {
      return
    }

    this.setData({ formType: option })
  },

  onRepeatChange(event) {
    this.setData({
      formRepeatType: event.currentTarget.dataset.repeatType
    })
  },

  onNoteInput(event) {
    this.setData({ formNote: event.detail.value })
  },

  onChooseCoverImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const path = (res.tempFilePaths || [])[0]

        if (!path) {
          return
        }

        this.setData({
          formCoverImage: path
        })
      },
      fail: () => {
        wx.showToast({
          title: '需要相册权限才能选择照片哦',
          icon: 'none'
        })
      }
    })
  },

  onPreviewCoverImage() {
    if (!this.data.formCoverImage) {
      return
    }

    wx.previewImage({
      current: this.data.formCoverImage,
      urls: [this.data.formCoverImage]
    })
  },

  onRemoveCoverImage() {
    this.setData({
      formCoverImage: ''
    })
  },

  onSaveAnniversary() {
    if (this.data.saving) {
      return
    }

    const title = (this.data.formTitle || '').trim()
    const date = this.data.formDate

    if (!title) {
      wx.showToast({
        title: '标题不能为空哦',
        icon: 'none'
      })
      return
    }

    if (!date) {
      wx.showToast({
        title: '请选择日期',
        icon: 'none'
      })
      return
    }

    const relationship = relationshipService.getRelationshipContext()
    const currentUser = relationship.currentUser || {}

    this.setData({ saving: true })

    cloudStorageService.uploadFile(this.data.formCoverImage, {
      category: 'anniversaries',
      ownerId: currentUser.userId || 'anonymous'
    }).then((coverImage) => {
      anniversaryService.createAnniversary({
        title,
        date,
        type: this.data.formType,
        repeatType: this.data.formRepeatType,
        note: (this.data.formNote || '').trim(),
        coverImage
      })

      this.setData({
        showCreator: false,
        formTitle: '',
        formDate: '',
        formType: '恋爱纪念日',
        formRepeatType: 'yearly',
        formNote: '',
        formCoverImage: '',
        saving: false
      })

      this.refreshData()

      wx.showToast({
        title: '纪念日已保存',
        icon: 'success'
      })
    }).catch(() => {
      this.setData({ saving: false })
      wx.showToast({
        title: '封面上传失败',
        icon: 'none'
      })
    })
  },

  onOpenDetail(event) {
    const id = event.currentTarget.dataset.id

    if (!id) {
      return
    }

    wx.navigateTo({
      url: `/pages/anniversary-detail/anniversary-detail?id=${id}`
    })
  }
})
