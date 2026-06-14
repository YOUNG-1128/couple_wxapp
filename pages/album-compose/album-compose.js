const momentsService = require('../../services/moments')
const footprintService = require('../../services/footprint')
const cloudStorageService = require('../../services/cloud-storage')

const MAX_IMAGE_COUNT = 4

function createEmptyLocationState() {
  return {
    enabled: false,
    mode: 'manual',
    city: null,
    keyword: '',
    results: [],
    locating: false
  }
}

Page({
  data: {
    draftId: '',
    postId: '',
    isEditing: false,
    currentUser: {},
    composeContent: '',
    composeImages: [],
    selectedLocation: createEmptyLocationState(),
    submitting: false
  },

  onLoad(options) {
    const draftId = options && options.draftId ? options.draftId : ''
    const postId = options && options.postId ? decodeURIComponent(options.postId) : ''

    this.setData({
      draftId,
      postId,
      isEditing: Boolean(postId)
    })
    this.loadPageData()
  },

  onShow() {
    this.loadPageData()
  },

  loadPageData() {
    const currentUser = momentsService.getCurrentUser()
    const loadRecord = this.data.isEditing
      ? momentsService.getPostByIdAsync(this.data.postId)
      : momentsService.getMomentDraftByIdAsync(this.data.draftId)

    loadRecord.then((record) => {
      if (this.data.isEditing && !record) {
        wx.showToast({
          title: '动态不存在或无法编辑',
          icon: 'none'
        })
        return
      }

      this.setData({
        currentUser,
        composeContent: record ? record.content : '',
        composeImages: record ? (record.images || []) : [],
        selectedLocation: this.buildLocationStateFromDraft(record ? record.location : null)
      })
    })
  },

  buildLocationStateFromDraft(location) {
    const city = location && location.city && location.city.name ? location.city : null

    if (!city) {
      return createEmptyLocationState()
    }

    return {
      enabled: location.enabled === true,
      mode: location.mode || 'manual',
      city,
      keyword: city.name,
      results: [],
      locating: false
    }
  },

  buildLocationPayload() {
    const selectedLocation = this.data.selectedLocation || {}
    const city = selectedLocation.city

    if (!city || !city.name) {
      return {
        enabled: false,
        mode: selectedLocation.mode || 'manual',
        city: {
          code: '',
          name: '',
          province: '',
          country: '中国',
          latitude: null,
          longitude: null
        },
        placeName: '',
        address: '',
        source: 'manual',
        poiId: ''
      }
    }

    return {
      enabled: true,
      mode: selectedLocation.mode || 'manual',
      city: {
        code: city.code || '',
        name: city.name || '',
        province: city.province || '',
        country: city.country || '中国',
        latitude: city.latitude,
        longitude: city.longitude
      },
      placeName: '',
      address: '',
      source: selectedLocation.mode === 'auto' ? 'location-api' : 'manual',
      poiId: ''
    }
  },

  onComposeInput(event) {
    this.setData({
      composeContent: event.detail.value
    })
  },

  onLocationKeywordInput(event) {
    const keyword = event.detail.value || ''
    const selectedLocation = this.data.selectedLocation || createEmptyLocationState()
    const selectedCity = selectedLocation.city
    const selectedText = selectedCity ? selectedCity.name : ''

    this.setData({
      selectedLocation: {
        ...selectedLocation,
        keyword,
        city: keyword === selectedText ? selectedCity : null,
        mode: 'manual',
        results: keyword.trim() ? footprintService.searchCitiesByKeyword(keyword) : []
      }
    })
  },

  onSelectLocationCity(event) {
    const index = Number(event.currentTarget.dataset.index)
    const selectedLocation = this.data.selectedLocation || createEmptyLocationState()
    const city = (selectedLocation.results || [])[index]

    if (!city) {
      return
    }

    this.setData({
      selectedLocation: {
        ...selectedLocation,
        enabled: true,
        mode: 'manual',
        city,
        keyword: city.name,
        results: []
      }
    })
  },

  onLocateCurrentCity() {
    const selectedLocation = this.data.selectedLocation || createEmptyLocationState()

    if (selectedLocation.locating) {
      return
    }

    this.setData({
      selectedLocation: {
        ...selectedLocation,
        locating: true
      }
    })

    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const city = footprintService.resolveCityFromCoordinates({
          latitude: res.latitude,
          longitude: res.longitude
        })

        if (!city) {
          this.setData({
            selectedLocation: {
              ...selectedLocation,
              locating: false
            }
          })
          wx.showToast({
            title: '暂时无法识别当前城市',
            icon: 'none'
          })
          return
        }

        this.setData({
          selectedLocation: {
            ...selectedLocation,
            enabled: true,
            mode: 'auto',
            city,
            keyword: city.name,
            results: [],
            locating: false
          }
        })

        wx.showToast({
          title: `已识别为${city.name}`,
          icon: 'none'
        })
      },
      fail: () => {
        this.setData({
          selectedLocation: {
            ...selectedLocation,
            locating: false
          }
        })
        wx.showToast({
          title: '定位失败，请手动选择城市',
          icon: 'none'
        })
      }
    })
  },

  onClearLocation() {
    this.setData({
      selectedLocation: createEmptyLocationState()
    })
  },

  onChooseImages() {
    const remainCount = MAX_IMAGE_COUNT - this.data.composeImages.length

    if (remainCount <= 0) {
      wx.showToast({
        title: `最多选择${MAX_IMAGE_COUNT}张`,
        icon: 'none'
      })
      return
    }

    wx.chooseImage({
      count: remainCount,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        this.setData({
          composeImages: this.data.composeImages.concat(res.tempFilePaths).slice(0, MAX_IMAGE_COUNT)
        })
      },
      fail: (err) => {
        const errMsg = (err && err.errMsg) || ''

        if (errMsg.includes('auth') || errMsg.includes('deny')) {
          wx.showToast({
            title: '需要相册权限才能选择照片哦',
            icon: 'none'
          })
        }
      }
    })
  },

  onRemoveComposeImage(event) {
    const index = Number(event.currentTarget.dataset.index)

    this.setData({
      composeImages: this.data.composeImages.filter((_, idx) => idx !== index)
    })
  },

  onPreviewComposeImage(event) {
    const current = event.currentTarget.dataset.current
    const urls = this.data.composeImages

    if (!urls.length) {
      return
    }

    wx.previewImage({
      current,
      urls
    })
  },

  onSaveDraft() {
    if (this.data.submitting || this.data.isEditing) {
      return
    }

    const content = (this.data.composeContent || '').trim()
    const images = this.data.composeImages || []

    if (!content && !images.length) {
      wx.showToast({
        title: '写点什么或选张照片再存草稿吧',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })

    this.uploadComposeImages().then((uploadedImages) => momentsService.saveMomentDraftAsync({
      draftId: this.data.draftId,
      content,
      images: uploadedImages,
      location: this.buildLocationPayload()
    })).then((draft) => {
      this.setData({
        draftId: draft.draftId,
        submitting: false
      })

      wx.showToast({
        title: '已保存到草稿箱',
        icon: 'success'
      })

      setTimeout(() => {
        this.goBackToAlbum()
      }, 220)
    }).catch(() => {
      this.setData({ submitting: false })
      wx.showToast({
        title: '图片上传或草稿保存失败',
        icon: 'none'
      })
    })
  },

  onPublishPost() {
    if (this.data.submitting) {
      return
    }

    const content = (this.data.composeContent || '').trim()
    const images = this.data.composeImages || []
    const location = this.buildLocationPayload()

    if (!content && !images.length) {
      wx.showToast({
        title: '写点什么或选择一张照片吧',
        icon: 'none'
      })
      return
    }

    this.setData({ submitting: true })

    this.uploadComposeImages().then((uploadedImages) => {
      const payload = {
        content,
        images: uploadedImages,
        location,
        shouldCreateFootprint: location.enabled === true
      }

      if (this.data.isEditing) {
        return momentsService.updatePostAsync(this.data.postId, payload)
      }

      return momentsService.publishMomentAsync({
        draftId: this.data.draftId,
        ...payload
      })
    }).then(() => {
      this.setData({ submitting: false })
      wx.showToast({
        title: this.data.isEditing ? '修改成功' : '发布成功',
        icon: 'success'
      })

      setTimeout(() => {
        this.goBackToAlbum()
      }, 260)
    }).catch(() => {
      this.setData({ submitting: false })
      wx.showToast({
        title: this.data.isEditing ? '图片上传或修改失败' : '图片上传或发布失败',
        icon: 'none'
      })
    })
  },

  uploadComposeImages() {
    const currentUser = this.data.currentUser || {}

    return cloudStorageService.uploadFiles(this.data.composeImages || [], {
      category: 'moments',
      ownerId: currentUser.userId || 'anonymous'
    }).then((images) => {
      this.setData({ composeImages: images })
      return images
    })
  },

  goBackToAlbum() {
    const pages = getCurrentPages()
    const albumIndex = pages.findIndex((page) => page.route === 'pages/album/album')

    if (albumIndex >= 0) {
      const delta = pages.length - albumIndex - 1

      if (delta > 0) {
        wx.navigateBack({ delta })
        return
      }
    }

    wx.redirectTo({
      url: '/pages/album/album'
    })
  }
})
