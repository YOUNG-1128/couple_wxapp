const momentsService = require('../../services/moments')
const { toDateKey } = require('../../utils/time')

Page({
  data: {
    pageTitle: '共同朋友圈',
    pageDesc: '只属于我们两个人的小世界。',
    feed: [],
    keyword: '',
    authorId: 'all',
    filterDateType: 'all',
    filterDateValue: '',
    hasActiveFilters: false,
    hasDrafts: false,
    draftKeyword: '',
    draftAuthorId: 'all',
    draftDateType: 'all',
    draftDateValue: '',
    showSearchPanel: false,
    showDatePicker: false,
    dateStatsYears: [],
    yearOptions: [],
    monthOptions: [],
    dayOptions: [],
    selectedYear: '',
    selectedMonth: '',
    authorFilters: [],
    emptyText: '还没有动态，发布第一条回忆吧。',
    currentUser: {},
    users: [],
    targetPostId: '',
    activeCommentPostId: '',
    commentDraftMap: {}
  },

  onLoad(options) {
    this.setData({
      targetPostId: options && options.postId ? decodeURIComponent(options.postId) : ''
    })
    this.refreshPageData()
  },

  onShow() {
    this.refreshPageData()
  },

  refreshPageData() {
    const users = momentsService.getUsers()
    const currentUser = momentsService.getCurrentUser()
    const authorFilters = [{ key: 'all', label: '全部' }].concat(users.map((user) => ({
      key: user.userId,
      label: user.nickName
    })))

    Promise.all([
      momentsService.getMomentsFeedAsync({}),
      momentsService.getMomentDraftsAsync()
    ]).finally(() => {
      this.setData({
        users,
        currentUser,
        authorFilters,
        hasDrafts: momentsService.getMomentDrafts().length > 0
      })

      this.refreshDateGroups()
      this.refreshFeed()
    })
  },

  refreshFeed() {
    const hasActiveFilters = this.data.authorId !== 'all' || !!this.data.keyword || !!this.data.filterDateValue
    const feed = momentsService.getMomentsFeed({
      keyword: this.data.keyword,
      dateType: this.data.filterDateType,
      dateValue: this.data.filterDateValue,
      authorId: this.data.authorId,
      postId: this.data.targetPostId
    })

    this.setData({
      feed,
      hasActiveFilters,
      emptyText: this.getEmptyText(feed.length)
    })
  },

  getEmptyText(count) {
    if (count > 0) {
      return ''
    }

    if (this.data.keyword || this.data.filterDateValue || this.data.authorId !== 'all') {
      return '没有找到这段回忆，再换个关键词试试吧'
    }

    return '还没有动态，发布第一条回忆吧。'
  },

  refreshDateGroups() {
    const posts = momentsService.getMomentsFeed({})
    const yearMap = {}

    posts.forEach((post) => {
      const dateKey = toDateKey(post.createdAt)
      const year = dateKey.slice(0, 4)
      const month = dateKey.slice(5, 7)
      const day = dateKey.slice(8, 10)

      if (!yearMap[year]) {
        yearMap[year] = {
          count: 0,
          months: {}
        }
      }

      if (!yearMap[year].months[month]) {
        yearMap[year].months[month] = {
          count: 0,
          days: {}
        }
      }

      if (!yearMap[year].months[month].days[day]) {
        yearMap[year].months[month].days[day] = 0
      }

      yearMap[year].count += 1
      yearMap[year].months[month].count += 1
      yearMap[year].months[month].days[day] += 1
    })

    const years = Object.keys(yearMap)
      .sort((a, b) => Number(b) - Number(a))
      .map((year) => ({
        year,
        count: yearMap[year].count,
        months: Object.keys(yearMap[year].months)
          .sort((a, b) => Number(b) - Number(a))
          .map((month) => ({
            month,
            value: `${year}-${month}`,
            count: yearMap[year].months[month].count,
            days: Object.keys(yearMap[year].months[month].days)
              .sort((a, b) => Number(b) - Number(a))
              .map((day) => ({
                day,
                value: `${year}-${month}-${day}`,
                count: yearMap[year].months[month].days[day]
              }))
          }))
      }))

    this.setData({
      dateStatsYears: years,
      yearOptions: years
    }, () => {
      this.syncDateOptions()
    })
  },

  syncDateOptions() {
    const selectedYearData = this.data.dateStatsYears.find((item) => item.year === this.data.selectedYear)
    const monthOptions = selectedYearData ? selectedYearData.months : []
    const selectedMonthData = monthOptions.find((item) => item.month === this.data.selectedMonth)
    const dayOptions = selectedMonthData ? selectedMonthData.days : []

    this.setData({
      monthOptions,
      dayOptions
    })
  },

  onToggleSearch() {
    const nextShow = !this.data.showSearchPanel

    if (nextShow) {
      const activeDateValue = this.data.filterDateValue || ''
      const activeYear = activeDateValue ? activeDateValue.slice(0, 4) : ''
      const activeMonth = activeDateValue.length >= 7 ? activeDateValue.slice(5, 7) : ''

      this.setData({
        draftKeyword: this.data.keyword,
        draftAuthorId: this.data.authorId,
        draftDateType: this.data.filterDateType,
        draftDateValue: activeDateValue,
        selectedYear: activeYear,
        selectedMonth: activeMonth
      }, () => {
        this.syncDateOptions()
      })
    }

    this.setData({
      showSearchPanel: nextShow,
      showDatePicker: nextShow ? this.data.showDatePicker : false
    })
  },

  onAuthorFilterTap(event) {
    const authorId = event.currentTarget.dataset.authorId || 'all'

    this.setData({ draftAuthorId: authorId })
  },

  onSearchInput(event) {
    this.setData({ draftKeyword: event.detail.value })
  },

  onOpenDatePicker() {
    this.setData({
      showDatePicker: !this.data.showDatePicker
    })
  },

  onCloseDatePicker() {
    this.setData({
      showDatePicker: false
    })
  },

  onPickYear(event) {
    const year = event.currentTarget.dataset.year

    if (!year) {
      return
    }

    this.setData({
      selectedYear: year,
      selectedMonth: '',
      draftDateType: 'year',
      draftDateValue: year
    }, () => {
      this.syncDateOptions()
      this.applyDraftFilters(false)
    })
  },

  onPickMonth(event) {
    const year = event.currentTarget.dataset.year
    const month = event.currentTarget.dataset.month
    const value = event.currentTarget.dataset.value

    if (!year || !month || !value) {
      return
    }

    this.setData({
      selectedYear: year,
      selectedMonth: month,
      draftDateType: 'month',
      draftDateValue: value
    }, () => {
      this.syncDateOptions()
      this.applyDraftFilters(false)
    })
  },

  onPickDay(event) {
    const year = event.currentTarget.dataset.year
    const month = event.currentTarget.dataset.month
    const value = event.currentTarget.dataset.value

    if (!year || !month || !value) {
      return
    }

    this.setData({
      selectedYear: year,
      selectedMonth: month,
      draftDateType: 'day',
      draftDateValue: value
    }, () => {
      this.syncDateOptions()
      this.applyDraftFilters(false)
    })
  },

  onClearDate() {
    this.setData({
      draftDateType: 'all',
      draftDateValue: '',
      selectedYear: '',
      selectedMonth: ''
    }, () => {
      this.syncDateOptions()
      this.applyDraftFilters(false)
    })
  },

  onConfirmSearch() {
    this.applyDraftFilters(true)
    this.setData({
      showDatePicker: false
    })
  },

  onClearAllFilters() {
    this.setData({
      keyword: '',
      authorId: 'all',
      filterDateType: 'all',
      filterDateValue: '',
      targetPostId: '',
      draftKeyword: '',
      draftAuthorId: 'all',
      draftDateType: 'all',
      draftDateValue: '',
      selectedYear: '',
      selectedMonth: '',
      showSearchPanel: false,
      showDatePicker: false
    }, () => {
      this.syncDateOptions()
      this.refreshFeed()
    })
  },

  onOpenDrafts() {
    wx.navigateTo({
      url: '/pages/album-drafts/album-drafts'
    })
  },

  onOpenCompose() {
    wx.navigateTo({
      url: '/pages/album-compose/album-compose'
    })
  },

  applyDraftFilters(closePanel) {
    this.setData({
      keyword: (this.data.draftKeyword || '').trim(),
      authorId: this.data.draftAuthorId || 'all',
      filterDateType: this.data.draftDateType || 'all',
      filterDateValue: this.data.draftDateValue || '',
      showSearchPanel: closePanel ? false : this.data.showSearchPanel
    })
    this.refreshFeed()
  },

  onResetSearchDraft() {
    this.setData({
      draftKeyword: '',
      draftAuthorId: 'all',
      draftDateType: 'all',
      draftDateValue: '',
      selectedYear: '',
      selectedMonth: '',
      showDatePicker: false
    }, () => {
      this.syncDateOptions()
    })
  },

  onPreviewPostImage(event) {
    const { current, urls } = event.currentTarget.dataset

    if (!urls || !urls.length) {
      return
    }

    wx.previewImage({
      current,
      urls
    })
  },

  onOpenComment(event) {
    const postId = event.currentTarget.dataset.postId

    this.setData({
      activeCommentPostId: this.data.activeCommentPostId === postId ? '' : postId
    })
  },

  onCommentInput(event) {
    const postId = event.currentTarget.dataset.postId
    const value = event.detail.value

    this.setData({
      [`commentDraftMap.${postId}`]: value
    })
  },

  onSubmitComment(event) {
    const postId = event.currentTarget.dataset.postId
    const draft = (this.data.commentDraftMap[postId] || '').trim()

    if (!draft) {
      wx.showToast({
        title: '留言不能为空哦',
        icon: 'none'
      })

      return
    }

    momentsService.addCommentAsync(postId, { content: draft }).then((updatedPost) => {
      if (!updatedPost) {
        wx.showToast({
          title: '动态不存在',
          icon: 'none'
        })
        return
      }

      this.setData({
        [`commentDraftMap.${postId}`]: '',
        activeCommentPostId: ''
      })

      this.refreshFeed()

      wx.showToast({
        title: '留言成功',
        icon: 'success'
      })
    }).catch(() => {
      wx.showToast({
        title: '留言失败',
        icon: 'none'
      })
    })
  },

  noop() {

  }
})
