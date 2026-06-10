const homeMock = require('../../mock/home')
const anniversaryService = require('../../services/anniversary')
const companionService = require('../../services/companion')
const pendingService = require('../../services/pending')
const todoService = require('../../services/todo')
const dailyMoodService = require('../../services/dailyMood')
const relationshipService = require('../../services/relationship')
const coupleService = require('../../services/couple')

const TAB_PAGES = ['/pages/home/home', '/pages/hub/hub', '/pages/profile/profile']
const OPENING_STORAGE_KEY = 'couple-opening-v2-last-play-date'
const OPENING_DURATION = 4100
const OPENING_STATUS_WAIT = 1200
const OPENING_LINES = [
  '今天也是喜欢你的一天',
  '很高兴，今天也有你',
  '我们又一起收藏了一天',
  '欢迎回到我们的小世界'
]
const STATUS_OPTIONS = [
  { value: 'happy', label: '开心' },
  { value: 'calm', label: '平静' },
  { value: 'normal', label: '一般' },
  { value: 'tired', label: '有点累' },
  { value: 'busy', label: '忙碌' },
  { value: 'stressed', label: '压力大' },
  { value: 'miss', label: '想你' },
  { value: 'chat', label: '想聊天' },
  { value: 'hug', label: '需要抱抱' },
  { value: 'alone', label: '需要独处' }
]

const STATUS_LABEL_MAP = STATUS_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label
  return acc
}, {})

Page({
  data: {
    loveInfo: homeMock.loveInfo,
    heroLine: '今天也是喜欢你的一天',
    myUser: null,
    partnerUser: null,
    myStatusText: '',
    partnerStatusText: '',
    myStatusNote: '',
    partnerStatusNote: '',
    hasMyStatus: false,
    hasPartnerStatus: false,
    showStatusPanel: false,
    statusOptions: STATUS_OPTIONS,
    selectedMyStatus: '',

    todayTasks: [],
    monthAnniversaries: [],

    showOpening: false,
    openingReady: false,
    openingMode: 'waiting',
    openingEyebrow: '',
    openingTitle: '',
    openingSubtitle: '',
    openingMyName: '',
    openingPartnerName: '',
    showOpeningNames: false
  },

  onLoad() {
    this.openingDisposed = false
  },

  onShow() {
    this.refreshDashboard()
    this.prepareOpening()
  },

  onUnload() {
    this.openingDisposed = true
    this.clearOpeningTimer()
  },

  prepareOpening(force = false) {
    const today = this.getTodayKey()

    if (
      this.openingPreparing
      || this.data.showOpening
      || (!force && !this.shouldPlayOpening(today))
    ) {
      return
    }

    this.openingPreparing = true
    this.setData({
      showOpening: true,
      openingReady: false
    })

    Promise.race([
      coupleService.getBindingStatus(),
      new Promise((resolve) => setTimeout(resolve, OPENING_STATUS_WAIT))
    ]).then(() => {
      this.openingPreparing = false
      this.startOpening(today)
    })
  },

  startOpening(today) {
    if (this.openingDisposed || !this.data.showOpening) {
      return
    }

    const relationship = relationshipService.getRelationshipContext()
    const isBound = relationship.isBound
    const myName = this.getOpeningName(relationship.currentUser)
    const partnerName = this.getOpeningName(relationship.partnerUser)
    const lineIndex = this.getDateNumber(today) % OPENING_LINES.length
    const hasProfileDetails = Boolean(isBound && myName && partnerName)
    const openingMode = !isBound ? 'waiting' : (hasProfileDetails ? 'story' : 'connected')

    this.setData({
      openingReady: true,
      openingMode,
      openingEyebrow: openingMode === 'story'
        ? this.data.loveInfo.startDate
        : (openingMode === 'connected' ? 'OUR STORY' : 'A PLACE FOR TWO'),
      openingTitle: openingMode === 'story'
        ? OPENING_LINES[lineIndex]
        : (openingMode === 'connected' ? '从现在开始，收藏我们的每一天' : '这里会收藏两个人的故事'),
      openingSubtitle: openingMode === 'story'
        ? `我们已经一起走过 ${this.data.loveInfo.days} 天`
        : (openingMode === 'connected' ? '两条轨迹，从此有了同一个方向' : '先找到那个特别的人吧'),
      openingMyName: myName,
      openingPartnerName: partnerName,
      showOpeningNames: hasProfileDetails
    })

    wx.setStorageSync(OPENING_STORAGE_KEY, today)

    this.openingTimer = setTimeout(() => {
      this.finishOpening()
    }, OPENING_DURATION)
  },

  shouldPlayOpening(today) {
    if (this.isDevelopmentVersion()) {
      return true
    }

    return wx.getStorageSync(OPENING_STORAGE_KEY) !== today
  },

  isDevelopmentVersion() {
    if (typeof wx.getAccountInfoSync !== 'function') {
      return true
    }

    try {
      const accountInfo = wx.getAccountInfoSync()
      const envVersion = accountInfo
        && accountInfo.miniProgram
        && accountInfo.miniProgram.envVersion

      return !envVersion || envVersion === 'develop'
    } catch (error) {
      return true
    }
  },

  getOpeningName(user) {
    const name = String((user && user.nickName) || '').trim()

    return name && name !== '我' && name.toUpperCase() !== 'TA' ? name : ''
  },

  getTodayKey() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const date = String(now.getDate()).padStart(2, '0')

    return `${year}-${month}-${date}`
  },

  getDateNumber(dateKey) {
    return Number(String(dateKey).replace(/-/g, '')) || 0
  },

  clearOpeningTimer() {
    if (this.openingTimer) {
      clearTimeout(this.openingTimer)
      this.openingTimer = null
    }
  },

  finishOpening() {
    if (!this.data.showOpening) {
      return
    }

    const shouldOpenBinding = this.data.openingReady && this.data.openingMode === 'waiting'

    this.clearOpeningTimer()
    this.openingPreparing = false
    this.setData({
      showOpening: false,
      openingReady: false
    })

    if (shouldOpenBinding) {
      wx.navigateTo({ url: '/pages/couple-bind/couple-bind' })
    }
  },

  onSkipOpening() {
    this.finishOpening()
  },

  onReplayOpening() {
    this.prepareOpening(true)
  },

  refreshDashboard() {
    const relationship = relationshipService.getRelationshipContext()
    const myUser = relationship.currentUser || null
    const partnerUser = relationship.partnerUser || null

    const todayStatusMap = dailyMoodService.getTodayStatusMap()
    const myStatus = myUser ? todayStatusMap[myUser.userId] : null
    const partnerStatus = partnerUser ? todayStatusMap[partnerUser.userId] : null

    const todayTodoList = todoService.getTodayPendingTodos(2)
    const upcomingAnniversaries = anniversaryService.getUpcomingForHome(30)

    pendingService.getPendingActionsAsync().then((pendingActions) => {
      this.setData({
        myUser,
        partnerUser,
        hasMyStatus: Boolean(myStatus),
        hasPartnerStatus: Boolean(partnerStatus),
        myStatusText: myStatus ? this.getStatusLabel(myStatus.status) : '今天怎么样？',
        partnerStatusText: partnerStatus ? this.getStatusLabel(partnerStatus.status) : '设置状态',
        myStatusNote: myStatus ? (myStatus.note || '') : '',
        partnerStatusNote: partnerStatus ? (partnerStatus.note || '') : '',
        selectedMyStatus: myStatus ? myStatus.status : '',

        todayTasks: this.buildTodayTasks(todayTodoList, pendingActions),
        monthAnniversaries: upcomingAnniversaries
      })
    })
  },

  getStatusLabel(status) {
    return STATUS_LABEL_MAP[status] || status
  },

  buildTodayTasks(todos, pendingActions) {
    const todoTasks = (todos || []).map((todo) => ({
      id: `todo-${todo.todoId}`,
      type: 'todo',
      title: todo.title,
      subtitle: todo.dueDate ? `今日待办 · ${todo.dueDate}` : '今日待办',
      actionText: '去完成',
      targetPage: '/pages/todo/todo'
    }))

    const interactiveTasks = (pendingActions || []).map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle,
      actionText: item.actionText || '去处理',
      targetPage: item.targetPage,
      targetSection: item.targetSection || ''
    }))

    return [...interactiveTasks, ...todoTasks]
  },

  onTaskTap(event) {
    const targetPage = event.currentTarget.dataset.targetPage
    const targetSection = event.currentTarget.dataset.targetSection || ''

    if (!targetPage || targetPage === '/pages/home/home') {
      return
    }

    if (TAB_PAGES.includes(targetPage)) {
      wx.switchTab({ url: targetPage })
      return
    }

    const url = targetSection ? `${targetPage}?section=${targetSection}` : targetPage

    wx.navigateTo({ url })
  },

  onAnniversaryTap() {
    wx.navigateTo({ url: '/pages/anniversary/anniversary' })
  },

  onSendMissYou() {
    companionService.sendMissYouAsync().then((result) => {
      this.refreshDashboard()

      wx.showToast({
        title: result ? '已告诉 TA：我在想你' : '想你信号已发出',
        icon: 'none'
      })
    }).catch(() => {
      wx.showToast({
        title: '发送失败',
        icon: 'none'
      })
    })
  },

  onOpenMyStatusPanel() {
    this.setData({
      showStatusPanel: true
    })
  },

  onCloseStatusPanel() {
    this.setData({
      showStatusPanel: false
    })
  },

  onSelectMyStatus(event) {
    const status = event.currentTarget.dataset.status

    if (!status || !this.data.myUser) {
      return
    }

    dailyMoodService.upsertTodayStatus({
      userId: this.data.myUser.userId,
      status,
      note: this.data.myStatusNote || ''
    })

    this.setData({
      showStatusPanel: false
    })

    this.refreshDashboard()

    wx.showToast({
      title: '今日状态已更新',
      icon: 'none'
    })
  },

  noop() {

  }
})
