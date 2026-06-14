const anniversaryService = require('../../services/anniversary')
const relationshipService = require('../../services/relationship')
const cloudStorageService = require('../../services/cloud-storage')
const {
  solarToLunar,
  lunarToSolar,
  formatLunarDate,
  getLunarPickerRange,
  isLunarSupported
} = require('../../utils/lunar')

const BACKGROUND_OPTIONS = [
  { name: '樱粉', color: '#F8DDE5' },
  { name: '蜜桃', color: '#F9E1D2' },
  { name: '奶油', color: '#F6EACF' },
  { name: '薄荷', color: '#DDEDE5' },
  { name: '晴蓝', color: '#DCEAF4' },
  { name: '雾紫', color: '#E7E0F2' }
]
const OCCASION_TEMPLATES = [
  { label: '恋爱纪念日', type: 'relationship', title: '恋爱纪念日' },
  { label: '生日', type: 'birthday', title: '生日' },
  { label: '第一次见面', type: 'shared_memory', title: '第一次见面' },
  { label: '自定义', type: 'custom', title: '' }
]
const LUNAR_PICKER_RANGE = getLunarPickerRange()
const LUNAR_SUPPORTED = isLunarSupported()

function getLunarFormState(date, item = {}) {
  const converted = solarToLunar(item.date || date || new Date())
  const lunar = item.calendarType === 'lunar'
    ? {
        year: converted && converted.year,
        month: item.lunarMonth,
        day: item.lunarDay,
        isLeapMonth: item.lunarIsLeapMonth === true
      }
    : converted
  const fallback = { year: new Date().getFullYear(), month: 1, day: 1, isLeapMonth: false }
  const safeLunar = lunar && lunar.year && lunar.month && lunar.day ? lunar : fallback
  const yearIndex = Math.max(0, LUNAR_PICKER_RANGE[0].indexOf(String(safeLunar.year)))

  return {
    formLunarIndexes: [yearIndex, safeLunar.month - 1, safeLunar.day - 1],
    formLunarMonth: safeLunar.month,
    formLunarDay: safeLunar.day,
    formLunarIsLeapMonth: safeLunar.isLeapMonth === true,
    formLunarLeapAvailable: LUNAR_SUPPORTED && Boolean(lunarToSolar(safeLunar.year, safeLunar.month, 1, true)),
    formLunarLabel: formatLunarDate(safeLunar.month, safeLunar.day, safeLunar.isLeapMonth === true)
  }
}

Page({
  data: {
    pageTitle: '纪念日',
    pageSubtitle: '把重要的日子温柔地记下来',
    list: [],
    upcomingList: [],
    pastList: [],
    highlighted: null,
    showCreator: false,
    editingId: '',
    backgroundOptions: BACKGROUND_OPTIONS,
    occasionTemplates: OCCASION_TEMPLATES,
    formTitle: '',
    formDate: '',
    formCalendarType: 'solar',
    lunarSupported: LUNAR_SUPPORTED,
    lunarPickerRange: LUNAR_PICKER_RANGE,
    ...getLunarFormState(new Date()),
    formType: 'custom',
    formRepeatType: 'yearly',
    formNote: '',
    formCoverImage: '',
    formBackgroundColor: BACKGROUND_OPTIONS[0].color,
    saving: false
  },

  onLoad(options) {
    this.pendingEditId = options && options.editId ? options.editId : ''
  },

  onShow() {
    this.refreshData().then(() => {
      if (!this.pendingEditId) {
        return
      }

      const editId = this.pendingEditId
      this.pendingEditId = ''
      this.openEditorById(editId)
    })
  },

  refreshData() {
    return anniversaryService.getAnniversaryPageDataAsync().then((pageData) => {
      this.setData({
        list: pageData.list,
        upcomingList: pageData.upcomingList,
        pastList: pageData.pastList,
        highlighted: pageData.highlighted
      })
    })
  },

  onOpenCreator() {
    this.resetForm()
    this.setData({ showCreator: true })
  },

  onEditAnniversary(event) {
    const id = event.currentTarget.dataset.id
    this.openEditorById(id)
  },

  openEditorById(id) {
    const item = this.data.list.find((entry) => entry.id === id)

    if (!item) {
      return
    }

    this.setData({
      showCreator: true,
      editingId: item.id,
      formTitle: item.title || '',
      formDate: item.date || '',
      formCalendarType: item.calendarType || 'solar',
      ...getLunarFormState(item.date, item),
      formType: item.semanticType || 'custom',
      formRepeatType: item.repeatType || 'none',
      formNote: item.note || '',
      formCoverImage: item.coverImage || '',
      formBackgroundColor: item.backgroundColor || BACKGROUND_OPTIONS[0].color
    })
  },

  onCloseCreator() {
    this.setData({ showCreator: false })
  },

  noop() {

  },

  onTitleInput(event) {
    this.setData({ formTitle: event.detail.value })
  },

  onOccasionTemplateChange(event) {
    const type = event.currentTarget.dataset.type
    const template = OCCASION_TEMPLATES.find((item) => item.type === type)

    if (!template) {
      return
    }

    const currentTitle = (this.data.formTitle || '').trim()
    const templateTitles = OCCASION_TEMPLATES.map((item) => item.title).filter(Boolean)

    this.setData({
      formType: template.type,
      formTitle: !currentTitle || templateTitles.includes(currentTitle) ? template.title : this.data.formTitle
    })
  },

  onDateChange(event) {
    this.setData({ formDate: event.detail.value })
  },

  onCalendarTypeChange(event) {
    const calendarType = event.currentTarget.dataset.calendarType

    if (!calendarType || calendarType === this.data.formCalendarType) {
      return
    }

    if (calendarType === 'lunar' && !this.data.lunarSupported) {
      wx.showToast({
        title: '当前微信版本暂不支持农历',
        icon: 'none'
      })
      return
    }

    if (calendarType === 'solar') {
      this.setData({ formCalendarType: 'solar' })
      return
    }

    const lunarState = getLunarFormState(this.data.formDate || new Date())
    const year = Number(LUNAR_PICKER_RANGE[0][lunarState.formLunarIndexes[0]])
    const date = lunarToSolar(
      year,
      lunarState.formLunarMonth,
      lunarState.formLunarDay,
      lunarState.formLunarIsLeapMonth
    )

    this.setData({
      formCalendarType: 'lunar',
      formDate: date || this.data.formDate,
      ...lunarState
    })
  },

  onLunarDateChange(event) {
    const indexes = (event.detail.value || []).map(Number)
    const year = Number(LUNAR_PICKER_RANGE[0][indexes[0]])
    const month = indexes[1] + 1
    const day = indexes[2] + 1
    const date = lunarToSolar(year, month, day, false)
    const leapAvailable = Boolean(lunarToSolar(year, month, 1, true))

    if (!date) {
      wx.showToast({
        title: '这个农历日期不存在',
        icon: 'none'
      })
      return
    }

    this.setData({
      formDate: date,
      formLunarIndexes: indexes,
      formLunarMonth: month,
      formLunarDay: day,
      formLunarIsLeapMonth: false,
      formLunarLeapAvailable: leapAvailable,
      formLunarLabel: formatLunarDate(month, day, false)
    })
  },

  onLunarLeapChange() {
    if (!this.data.formLunarLeapAvailable) {
      return
    }

    const isLeapMonth = !this.data.formLunarIsLeapMonth
    const year = Number(LUNAR_PICKER_RANGE[0][this.data.formLunarIndexes[0]])
    const date = lunarToSolar(year, this.data.formLunarMonth, this.data.formLunarDay, isLeapMonth)

    if (!date) {
      wx.showToast({
        title: '这个闰月日期不存在',
        icon: 'none'
      })
      return
    }

    this.setData({
      formDate: date,
      formLunarIsLeapMonth: isLeapMonth,
      formLunarLabel: formatLunarDate(this.data.formLunarMonth, this.data.formLunarDay, isLeapMonth)
    })
  },

  onBackgroundChange(event) {
    const color = event.currentTarget.dataset.color

    if (!color) {
      return
    }

    this.setData({
      formBackgroundColor: color,
      formCoverImage: ''
    })
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
        title: '给这个日子起个名字吧',
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
      return anniversaryService.saveAnniversaryAsync({
        id: this.data.editingId,
        title,
        date,
        calendarType: this.data.formCalendarType,
        lunarMonth: this.data.formCalendarType === 'lunar' ? this.data.formLunarMonth : 0,
        lunarDay: this.data.formCalendarType === 'lunar' ? this.data.formLunarDay : 0,
        lunarIsLeapMonth: this.data.formCalendarType === 'lunar' && this.data.formLunarIsLeapMonth,
        type: this.data.formType,
        repeatType: this.data.formRepeatType,
        note: (this.data.formNote || '').trim(),
        coverImage,
        backgroundColor: this.data.formBackgroundColor
      })
    }).then(() => {
      this.setData({
        showCreator: false,
        saving: false
      })

      this.resetForm()
      return this.refreshData().then(() => {
        wx.showToast({
          title: '纪念日已保存',
          icon: 'success'
        })
      })
    }).catch(() => {
      this.setData({ saving: false })
      wx.showToast({
        title: '纪念日保存失败',
        icon: 'none'
      })
    })
  },

  onRemoveAnniversary(event) {
    const id = event.currentTarget.dataset.id

    if (!id) {
      return
    }

    wx.showModal({
      title: '删除纪念日',
      content: '删除后双方都将看不到这条纪念日，确定继续吗？',
      success: (result) => {
        if (!result.confirm) {
          return
        }

        anniversaryService.removeAnniversaryAsync(id)
          .then(() => this.refreshData())
          .then(() => {
            wx.showToast({
              title: '已删除',
              icon: 'success'
            })
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

  resetForm() {
    this.setData({
      editingId: '',
      formTitle: '',
      formDate: '',
      formCalendarType: 'solar',
      ...getLunarFormState(new Date()),
      formType: 'custom',
      formRepeatType: 'yearly',
      formNote: '',
      formCoverImage: '',
      formBackgroundColor: BACKGROUND_OPTIONS[0].color
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
