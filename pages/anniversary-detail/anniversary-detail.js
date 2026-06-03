const anniversaryService = require('../../services/anniversary')

Page({
  data: {
    detail: null,
    headerTitle: '',
    countText: '',
    countLabel: '',
    startDateLabel: ''
  },

  onLoad(options) {
    const id = options && options.id ? options.id : ''

    if (!id) {
      return
    }

    const detail = anniversaryService.getAnniversaryById(id)

    if (!detail) {
      return
    }

    const countInfo = this.buildCountInfo(detail)

    this.setData({
      detail,
      headerTitle: detail.title,
      countText: String(countInfo.value),
      countLabel: countInfo.label,
      startDateLabel: `起始日：${detail.displayDate} ${this.getWeekdayLabel(detail.displayDate)}`
    })
  },

  buildCountInfo(detail) {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const base = new Date(`${detail.displayDate}T00:00:00`)

    if (detail.repeatType === 'yearly') {
      return {
        label: '距离下次',
        value: Math.max(0, detail.daysUntil)
      }
    }

    if (Number.isNaN(base.getTime())) {
      return {
        label: '已经',
        value: 0
      }
    }

    const diffDays = Math.floor((todayStart.getTime() - base.getTime()) / (24 * 60 * 60 * 1000))

    if (diffDays >= 0) {
      return {
        label: '已经',
        value: diffDays + 1
      }
    }

    return {
      label: '还有',
      value: Math.abs(diffDays)
    }
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
  }
})
