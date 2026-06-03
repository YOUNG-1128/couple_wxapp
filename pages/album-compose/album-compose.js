const momentsService = require('../../services/moments')
const footprintService = require('../../services/footprint')

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
    currentUser: {},
    composeContent: '',
    composeImages: [],
    selectedLocation: createEmptyLocationState()
  },

  onLoad(options) {
    const draftId = options && options.draftId ? options.draftId : ''

    this.setData({ draftId })
    this.loadPageData()
  },

  onShow() {
    this.loadPageData()
  },

  loadPageData() {
    const currentUser = momentsService.getCurrentUser()
    momentsService.getMomentDraftByIdAsync(this.data.draftId).then((draft) => {
      this.setData({
        currentUser,
        composeContent: draft ? draft.content : '',
        composeImages: draft ? (draft.images || []) : [],
        selectedLocation: this.buildLocationStateFromDraft(draft ? draft.location : null)
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
    const content = (this.data.composeContent || '').trim()
    const images = this.data.composeImages || []

    if (!content && !images.length) {
      wx.showToast({
        title: '写点什么或选张照片再存草稿吧',
        icon: 'none'
      })
      return
    }

    momentsService.saveMomentDraftAsync({
      draftId: this.data.draftId,
      content,
      images,
      location: this.buildLocationPayload()
    }).then((draft) => {
      this.setData({
        draftId: draft.draftId
      })

      wx.showToast({
        title: '已保存到草稿箱',
        icon: 'success'
      })

      setTimeout(() => {
        this.goBackToAlbum()
      }, 220)
    }).catch(() => {
      wx.showToast({
        title: '草稿保存失败',
        icon: 'none'
      })
    })
  },

  onPublishPost() {
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

    momentsService.publishMomentAsync({
      draftId: this.data.draftId,
      content,
      images,
      location,
      shouldCreateFootprint: location.enabled === true
    }).then(() => {
      wx.showToast({
        title: '发布成功',
        icon: 'success'
      })

      setTimeout(() => {
        this.goBackToAlbum()
      }, 260)
    }).catch(() => {
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      })
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
