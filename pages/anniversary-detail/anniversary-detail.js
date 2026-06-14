const anniversaryService = require('../../services/anniversary')
const anniversaryMemoryService = require('../../services/anniversary-memory')
const cloudStorageService = require('../../services/cloud-storage')
const relationshipService = require('../../services/relationship')

const BACKGROUND_OPTIONS = [
  { name: '樱粉', color: '#F8DDE5' },
  { name: '蜜桃', color: '#F9E1D2' },
  { name: '奶油', color: '#F6EACF' },
  { name: '薄荷', color: '#DDEDE5' },
  { name: '晴蓝', color: '#DCEAF4' },
  { name: '雾紫', color: '#E7E0F2' }
]

function getHeroCountdownState(detail = {}) {
  const daysUntil = Number(detail.daysUntil)

  if (!Number.isFinite(daysUntil) || daysUntil === 0) {
    return {
      heroCountLabel: '就是今天',
      heroCountNumber: 0
    }
  }

  return {
    heroCountLabel: daysUntil > 0 ? '距离这个日子还有' : '这个日子已经过去',
    heroCountNumber: Math.abs(daysUntil)
  }
}

Page({
  data: {
    detail: null,
    headerTitle: '',
    startDateLabel: '',
    heroCountLabel: '',
    heroCountNumber: 0,
    timeline: [],
    timelineLoading: true,
    backgroundOptions: BACKGROUND_OPTIONS,
    showBackgroundPanel: false,
    backgroundSaving: false
  },

  onLoad(options) {
    const id = options && options.id ? options.id : ''

    if (!id) {
      return
    }

    anniversaryService.getAnniversaryByIdAsync(id).then((detail) => {
      if (!detail) {
        wx.showToast({
          title: '纪念日不存在',
          icon: 'none'
        })
        return
      }

      this.setData({
        detail,
        headerTitle: detail.title,
        ...getHeroCountdownState(detail),
        startDateLabel: detail.calendarType === 'lunar'
          ? `${detail.displayDate} · ${detail.date}`
          : `${detail.displayDate} ${this.getWeekdayLabel(detail.displayDate)}`
      })
      return anniversaryMemoryService.getAnniversaryTimelineAsync(detail)
    }).then((timeline) => {
      this.setData({
        timeline: timeline || [],
        timelineLoading: false
      })
    }).catch(() => {
      this.setData({ timelineLoading: false })
    })
  },

  getWeekdayLabel(dateStr) {
    const date = new Date(`${dateStr}T00:00:00`)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    const labels = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

    return labels[date.getDay()]
  },

  onPreviewCover() {
    const detail = this.data.detail

    if (!detail || !detail.coverImage) {
      return
    }

    wx.previewImage({
      current: detail.coverImage,
      urls: [detail.coverImage]
    })
  },

  onToggleBackgroundPanel() {
    if (this.data.backgroundSaving) {
      return
    }

    this.setData({
      showBackgroundPanel: !this.data.showBackgroundPanel
    })
  },

  onSelectBackgroundColor(event) {
    const color = event.currentTarget.dataset.color

    if (!color || this.data.backgroundSaving) {
      return
    }

    this.saveBackground({
      coverImage: '',
      backgroundColor: color
    })
  },

  onChooseBackgroundImage() {
    if (this.data.backgroundSaving) {
      return
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (result) => {
        const path = (result.tempFilePaths || [])[0]

        if (!path) {
          return
        }

        const relationship = relationshipService.getRelationshipContext()
        const currentUser = relationship.currentUser || {}

        this.setData({ backgroundSaving: true })
        cloudStorageService.uploadFile(path, {
          category: 'anniversaries',
          ownerId: currentUser.userId || 'anonymous'
        }).then((coverImage) => {
          return this.saveBackground({
            coverImage,
            backgroundColor: this.data.detail.backgroundColor || BACKGROUND_OPTIONS[0].color
          }, true)
        }).catch(() => {
          this.showBackgroundSaveError()
        })
      },
      fail: (error) => {
        if (!error || !/cancel/i.test(error.errMsg || '')) {
          wx.showToast({
            title: '需要相册权限才能选择照片哦',
            icon: 'none'
          })
        }
      }
    })
  },

  onRemoveBackgroundImage() {
    const detail = this.data.detail

    if (!detail || !detail.coverImage || this.data.backgroundSaving) {
      return
    }

    this.saveBackground({
      coverImage: '',
      backgroundColor: detail.backgroundColor || BACKGROUND_OPTIONS[0].color
    })
  },

  saveBackground(appearance, isAlreadySaving = false) {
    const detail = this.data.detail

    if (!detail) {
      return Promise.resolve()
    }

    if (!isAlreadySaving) {
      this.setData({ backgroundSaving: true })
    }

    return anniversaryService.saveAnniversaryAsync({
      ...detail,
      ...appearance
    }).then(() => anniversaryService.getAnniversaryByIdAsync(detail.id))
      .then((updatedDetail) => {
        this.setData({
          detail: updatedDetail || {
            ...detail,
            ...appearance
          },
          ...getHeroCountdownState(updatedDetail || detail),
          showBackgroundPanel: false,
          backgroundSaving: false
        })
        wx.showToast({
          title: '背景已更新',
          icon: 'success'
        })
      })
      .catch(() => {
        this.showBackgroundSaveError()
      })
  },

  showBackgroundSaveError() {
    this.setData({ backgroundSaving: false })
    wx.showToast({
      title: '背景更新失败，请重试',
      icon: 'none'
    })
  },

  onEditInfo() {
    const detail = this.data.detail

    if (!detail || !detail.id) {
      return
    }

    wx.redirectTo({
      url: `/pages/anniversary/anniversary?editId=${detail.id}`
    })
  },

  onRemoveAnniversary() {
    const detail = this.data.detail

    if (!detail || !detail.id) {
      return
    }

    wx.showModal({
      title: '删除纪念日',
      content: '删除后双方都将看不到这条纪念日，确定继续吗？',
      success: (result) => {
        if (!result.confirm) {
          return
        }

        anniversaryService.removeAnniversaryAsync(detail.id)
          .then(() => {
            wx.showToast({
              title: '已删除',
              icon: 'success'
            })
            setTimeout(() => {
              wx.navigateBack()
            }, 350)
          })
          .catch(() => {
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            })
          })
      }
    })
  },

  onOpenMemory(event) {
    const type = event.currentTarget.dataset.type
    const id = event.currentTarget.dataset.id
    const date = event.currentTarget.dataset.date

    if (type === 'letter' && id) {
      wx.navigateTo({
        url: `/pages/letter/letter?letterId=${id}`
      })
      return
    }

    if (type === 'post') {
      wx.navigateTo({
        url: `/pages/album/album${date ? `?date=${date}` : ''}`
      })
    }
  },

  onPreviewMemoryImage(event) {
    const { current, urls } = event.currentTarget.dataset

    if (!urls || !urls.length) {
      return
    }

    wx.previewImage({
      current,
      urls
    })
  }
})
