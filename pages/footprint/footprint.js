const footprintService = require('../../services/footprint')
const { buildLinkedPostUrl } = require('../../utils/footprint-navigation')
const cloudStorageService = require('../../services/cloud-storage')
const {
  MAX_FOOTPRINT_IMAGE_COUNT,
  appendFootprintImages,
  removeFootprintImage
} = require('../../utils/footprint-images')

Page({
  data: {
    cityCount: 0,
    footprintCount: 0,
    markers: [],
    markerCityMap: {},
    footprints: [],
    relatedPosts: [],
    activeCity: '',
    listTitle: '全部足迹',
    relatedPostsTitle: '',
    emptyText: '还没有点亮的地方，去记录第一次共同足迹吧',
    mapCenter: {
      latitude: 31.2304,
      longitude: 121.4737
    },
    mapScale: 4,

    showCreator: false,
    formTitle: '',
    formKeyword: '',
    formPlaceName: '',
    formDate: '',
    formNote: '',
    formImages: [],
    searchResults: [],
    selectedCity: null,
    locatingCity: false,
    savingFootprint: false
  },

  onShow() {
    this.refreshPageData(this.data.activeCity || '')
  },

  refreshPageData(activeCity = '') {
    return footprintService.getFootprintPageDataAsync(activeCity)
      .then((pageData) => {
        this.setData({
          cityCount: pageData.cityCount,
          footprintCount: pageData.footprintCount,
          markers: pageData.markers,
          markerCityMap: pageData.markerCityMap,
          footprints: pageData.footprints,
          relatedPosts: pageData.relatedPosts,
          activeCity: pageData.activeCity,
          listTitle: pageData.listTitle,
          relatedPostsTitle: pageData.relatedPostsTitle,
          mapCenter: {
            latitude: pageData.center.latitude,
            longitude: pageData.center.longitude
          },
          mapScale: pageData.center.scale || 4
        })
      })
      .catch(() => {
        wx.showToast({
          title: '足迹加载失败',
          icon: 'none'
        })
      })
  },

  onOpenCreator() {
    this.setData({
      showCreator: true,
      locatingCity: false
    })
  },

  onCloseCreator() {
    this.setData({
      showCreator: false,
      formTitle: '',
      formKeyword: '',
      formPlaceName: '',
      formDate: '',
      formNote: '',
      formImages: [],
      searchResults: [],
      selectedCity: null,
      locatingCity: false
    })
  },

  noop() {
  },

  onTitleInput(event) {
    this.setData({
      formTitle: event.detail.value
    })
  },

  onKeywordInput(event) {
    const keyword = event.detail.value || ''
    const selectedCity = this.data.selectedCity
    const selectedText = selectedCity ? selectedCity.name : ''

    this.setData({
      formKeyword: keyword,
      selectedCity: keyword === selectedText ? selectedCity : null,
      searchResults: keyword.trim() ? footprintService.searchCitiesByKeyword(keyword) : []
    })
  },

  onPlaceNameInput(event) {
    this.setData({
      formPlaceName: event.detail.value
    })
  },

  onLocateCity() {
    if (this.data.locatingCity) {
      return
    }

    this.setData({
      locatingCity: true
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
            locatingCity: false
          })
          wx.showToast({
            title: '暂时无法识别当前城市',
            icon: 'none'
          })
          return
        }

        this.setData({
          locatingCity: false,
          selectedCity: city,
          formKeyword: city.name,
          searchResults: []
        })

        wx.showToast({
          title: `已识别为${city.name}`,
          icon: 'none'
        })
      },
      fail: () => {
        this.setData({
          locatingCity: false
        })
        wx.showToast({
          title: '定位失败，请手动选择城市',
          icon: 'none'
        })
      }
    })
  },

  onSelectCity(event) {
    const index = Number(event.currentTarget.dataset.index)
    const city = this.data.searchResults[index]

    if (!city) {
      return
    }

    this.setData({
      selectedCity: city,
      formKeyword: city.name,
      searchResults: []
    })
  },

  onDateChange(event) {
    this.setData({
      formDate: event.detail.value
    })
  },

  onNoteInput(event) {
    this.setData({
      formNote: event.detail.value
    })
  },

  onChooseFootprintImages() {
    const remain = MAX_FOOTPRINT_IMAGE_COUNT - this.data.formImages.length

    if (remain <= 0) {
      wx.showToast({
        title: `最多选择${MAX_FOOTPRINT_IMAGE_COUNT}张图片`,
        icon: 'none'
      })
      return
    }

    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        this.setData({
          formImages: appendFootprintImages(this.data.formImages, res.tempFilePaths || [])
        })
      }
    })
  },

  onRemoveFootprintImage(event) {
    this.setData({
      formImages: removeFootprintImage(this.data.formImages, event.currentTarget.dataset.index)
    })
  },

  onPreviewFootprintImage(event) {
    const current = event.currentTarget.dataset.src
    const images = event.currentTarget.dataset.images || this.data.formImages

    if (!current || !images.length) {
      return
    }

    wx.previewImage({
      current,
      urls: images
    })
  },

  onSaveFootprint() {
    if (this.data.savingFootprint) {
      return
    }

    const title = (this.data.formTitle || '').trim()
    const placeName = (this.data.formPlaceName || '').trim()
    const date = this.data.formDate
    const note = (this.data.formNote || '').trim()
    const selectedCity = this.data.selectedCity

    if (!selectedCity) {
      wx.showToast({
        title: '请从候选列表中选择城市',
        icon: 'none'
      })
      return
    }

    this.setData({ savingFootprint: true })
    cloudStorageService.uploadFiles(this.data.formImages, {
      category: 'footprints',
      ownerId: footprintService.getCurrentUserId()
    }).then((images) => footprintService.createFootprintAsync({
      sourceType: 'manual',
      sourceId: '',
      title,
      city: {
        code: selectedCity.code,
        name: selectedCity.name,
        province: selectedCity.province,
        country: selectedCity.country,
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
        source: 'manual'
      },
      placeName,
      address: '',
      date,
      note,
      images
    }))
      .then(() => {
        this.onCloseCreator()
        return this.refreshPageData(selectedCity.name)
      })
      .then(() => {
        wx.showToast({
          title: '足迹已保存',
          icon: 'success'
        })
      })
      .catch(() => {
        wx.showToast({
          title: '保存失败，请稍后重试',
          icon: 'none'
        })
      })
      .finally(() => {
        this.setData({ savingFootprint: false })
      })
  },

  onMarkerTap(event) {
    const markerId = Number(event.detail.markerId)
    const city = this.data.markerCityMap[markerId] || ''

    if (!city) {
      return
    }

    this.refreshPageData(city)
  },

  onViewAll() {
    this.refreshPageData('')
  },

  onOpenLinkedPost(event) {
    const postId = event.currentTarget.dataset.postId
    const url = buildLinkedPostUrl(postId)

    if (!url) {
      return
    }

    wx.navigateTo({ url })
  }
})
