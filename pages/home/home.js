const anniversaryService = require('../../services/anniversary')
const companionService = require('../../services/companion')
const pendingService = require('../../services/pending')
const todoService = require('../../services/todo')
const dailyMoodService = require('../../services/dailyMood')
const relationshipService = require('../../services/relationship')
const coupleService = require('../../services/couple')
const authService = require('../../services/auth')
const momentsService = require('../../services/moments')
const cloudStorageService = require('../../services/cloud-storage')
const {
  calculateLoveDays,
  formatRelationshipDate,
  getOpeningMode,
  isValidRelationshipDate
} = require('../../utils/relationship')

const TAB_PAGES = ['/pages/home/home', '/pages/hub/hub', '/pages/profile/profile']
const OPENING_STORAGE_KEY = 'couple-opening-v2-last-play-date'
const CONNECTED_STORAGE_PREFIX = 'couple-opening-connected-'
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
    loveInfo: {
      days: 0,
      startDate: '',
      isBound: false,
      hasInvite: false,
      isConfigured: false
    },
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
    openingMode: 'solo',
    openingEyebrow: '',
    openingTitle: '',
    openingSubtitle: '',
    openingMyName: '',
    openingPartnerName: '',
    showOpeningNames: false,
    openingInteractive: false,
    openingBusy: false,
    openingIntent: '',
    openingInviteCode: '',
    openingJoinCode: '',
    openingProfileNickName: '',
    openingProfileAvatar: '',
    relationshipDateDraft: '',
    todayKey: ''
  },

  onLoad(options) {
    this.openingDisposed = false
    this.incomingInviteCode = String((options && options.inviteCode) || '').trim().toUpperCase()
    this.setData({
      todayKey: this.getTodayKey(),
      openingJoinCode: this.incomingInviteCode
    })
  },

  onShow() {
    this.refreshDashboard()
    this.prepareOpening()
  },

  onUnload() {
    this.openingDisposed = true
    this.clearOpeningTimer()
    this.showOpeningTabBar()
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
    this.hideOpeningTabBar()
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
      this.showOpeningTabBar()
      return
    }

    const relationship = relationshipService.getRelationshipContext()
    const bindingState = coupleService.getBindingState()
    const cloudAuth = authService.getCloudAuthState()
    const myName = this.getOpeningName(relationship.currentUser)
    const partnerName = this.getOpeningName(relationship.partnerUser)
    const lineIndex = this.getDateNumber(today) % OPENING_LINES.length
    const justConnected = bindingState.isBound
      && Boolean(bindingState.coupleId)
      && !wx.getStorageSync(`${CONNECTED_STORAGE_PREFIX}${bindingState.coupleId}`)
    const openingMode = getOpeningMode({
      isCloudLoggedIn: cloudAuth.isCloudLoggedIn,
      status: bindingState.status,
      relationshipStartDate: bindingState.relationshipStartDate,
      justConnected
    })
    const resolvedOpeningMode = this.forceRelationshipDateEdit && bindingState.isBound
      ? 'choose-start-date'
      : openingMode
    this.forceRelationshipDateEdit = false
    const hasProfileDetails = Boolean(bindingState.isBound && myName && partnerName)
    const interactive = resolvedOpeningMode !== 'story'
    const copy = this.getOpeningCopy(resolvedOpeningMode, lineIndex, bindingState)

    if (resolvedOpeningMode === 'solo' && this.incomingInviteCode) {
      copy.title = 'TA 在这里等你'
      copy.subtitle = '沿着邀请里的轨迹，去见那个特别的人'
    }

    this.setData({
      openingReady: true,
      openingMode: resolvedOpeningMode,
      openingInteractive: interactive,
      openingEyebrow: copy.eyebrow,
      openingTitle: copy.title,
      openingSubtitle: copy.subtitle,
      openingInviteCode: bindingState.inviteCode || '',
      relationshipDateDraft: bindingState.relationshipStartDate || today,
      openingMyName: myName || '我',
      openingPartnerName: partnerName || 'TA',
      showOpeningNames: bindingState.isBound || hasProfileDetails
    })

    this.syncLoveInfo(bindingState)

    if (!interactive) {
      wx.setStorageSync(OPENING_STORAGE_KEY, today)
      this.openingTimer = setTimeout(() => {
        this.finishOpening()
      }, OPENING_DURATION)
    }
  },

  getOpeningCopy(mode, lineIndex, bindingState) {
    const map = {
      solo: {
        eyebrow: 'A PLACE FOR TWO',
        title: '这里会收藏两个人的故事',
        subtitle: '等那个特别的人，来到同一个方向'
      },
      inviting: {
        eyebrow: 'INVITATION SENT',
        title: '邀请已经出发',
        subtitle: '等 TA 沿着这条轨迹来到你身边'
      },
      'just-connected': {
        eyebrow: 'OUR STORY',
        title: '从现在开始，这里属于你们',
        subtitle: '两条轨迹，有了同一个方向'
      },
      'choose-start-date': {
        eyebrow: 'OUR FIRST DAY',
        title: '我们的故事，从哪一天开始？',
        subtitle: '选一个对你们特别的日子'
      },
      story: {
        eyebrow: formatRelationshipDate(bindingState.relationshipStartDate),
        title: OPENING_LINES[lineIndex],
        subtitle: `我们已经一起走过 ${calculateLoveDays(bindingState.relationshipStartDate, this.getTodayKey())} 天`
      }
    }

    return map[mode] || map.solo
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

  hideOpeningTabBar() {
    if (this.openingTabBarHidden || typeof wx.hideTabBar !== 'function') {
      return
    }

    this.openingTabBarHidden = true
    wx.hideTabBar({
      animation: false,
      fail: () => {
        this.openingTabBarHidden = false
      }
    })
  },

  showOpeningTabBar() {
    if (!this.openingTabBarHidden || typeof wx.showTabBar !== 'function') {
      return
    }

    this.openingTabBarHidden = false
    wx.showTabBar({
      animation: false
    })
  },

  finishOpening() {
    if (!this.data.showOpening) {
      return
    }

    this.clearOpeningTimer()
    this.openingPreparing = false
    this.setData({
      showOpening: false,
      openingReady: false
    })
    this.showOpeningTabBar()
  },

  onSkipOpening() {
    if (this.data.openingMode === 'just-connected') {
      const bindingState = coupleService.getBindingState()
      if (bindingState.coupleId) {
        wx.setStorageSync(`${CONNECTED_STORAGE_PREFIX}${bindingState.coupleId}`, true)
      }
    }

    wx.setStorageSync(OPENING_STORAGE_KEY, this.getTodayKey())
    this.finishOpening()
  },

  onReplayOpening() {
    this.prepareOpening(true)
  },

  refreshDashboard() {
    const relationship = relationshipService.getRelationshipContext()
    const myUser = relationship.currentUser || null
    const partnerUser = relationship.partnerUser || null

    this.syncLoveInfo(coupleService.getBindingState())

    const todayTodoList = todoService.getTodayPendingTodos(2)
    Promise.all([
      pendingService.getPendingActionsAsync(),
      anniversaryService.getUpcomingForHomeAsync(30),
      dailyMoodService.getTodayStatusMapAsync()
    ]).then(([pendingActions, upcomingAnniversaries, todayStatusMap]) => {
      const myStatus = myUser ? todayStatusMap[myUser.userId] : null
      const partnerStatus = partnerUser ? todayStatusMap[partnerUser.userId] : null

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

  syncLoveInfo(bindingState = coupleService.getBindingState()) {
    const startDate = bindingState.relationshipStartDate || ''

    this.setData({
      loveInfo: {
        days: startDate ? calculateLoveDays(startDate, this.getTodayKey()) : 0,
        startDate: startDate ? formatRelationshipDate(startDate) : '',
        isBound: bindingState.isBound,
        hasInvite: bindingState.hasInvite,
        isConfigured: Boolean(startDate)
      }
    })
  },

  onOpenRelationshipFlow() {
    this.forceRelationshipDateEdit = coupleService.getBindingState().isBound
    this.prepareOpening(true)
  },

  ensureOpeningLogin() {
    const cloudAuth = authService.getCloudAuthState()

    const loginPromise = cloudAuth.isCloudLoggedIn
      ? Promise.resolve(cloudAuth)
      : authService.loginWithWeChat()

    return loginPromise.then(() => coupleService.getBindingStatus())
  },

  enterOpeningProfile(intent) {
    const currentUser = momentsService.getCurrentUser() || {}

    this.setData({
      openingMode: 'profile',
      openingInteractive: true,
      openingIntent: intent,
      openingProfileNickName: this.getOpeningName(currentUser),
      openingProfileAvatar: currentUser.avatarUrl || '',
      openingEyebrow: 'BEFORE WE MEET',
      openingTitle: '先让 TA 知道，是你在这里等候',
      openingSubtitle: '昵称和头像都可以以后再慢慢补上'
    })
  },

  beginOpeningIntent(intent) {
    if (this.data.openingBusy) {
      return
    }

    this.setData({ openingBusy: true })
    this.ensureOpeningLogin()
      .then((state) => {
        if (state.isBound) {
          this.syncLoveInfo(state)
          if (state.relationshipStartDate) {
            this.finishOpening()
            return
          }

          this.showOpeningState('choose-start-date', state)
          return
        }

        if (state.hasInvite) {
          this.showOpeningState('inviting', state)
          return
        }

        this.enterOpeningProfile(intent)
      })
      .catch(() => {
        wx.showToast({ title: '暂时没能进入，再试一次吧', icon: 'none' })
      })
      .finally(() => this.setData({ openingBusy: false }))
  },

  onOpeningInvite() {
    this.beginOpeningIntent('invite')
  },

  onOpeningJoin() {
    this.beginOpeningIntent('join')
  },

  onOpeningProfileInput(event) {
    this.setData({
      openingProfileNickName: event.detail.value
    })
  },

  onOpeningChooseAvatar() {
    const currentUser = momentsService.getCurrentUser()

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const avatarUrl = res.tempFilePaths && res.tempFilePaths[0]

        if (!avatarUrl || !currentUser) {
          return
        }

        this.setData({ openingBusy: true })
        cloudStorageService.uploadFile(avatarUrl, {
          category: 'avatars',
          ownerId: currentUser.userId
        }).then((cloudAvatarUrl) => {
          this.setData({ openingProfileAvatar: cloudAvatarUrl })
        }).catch(() => {
          wx.showToast({ title: '头像上传失败，可以稍后再试', icon: 'none' })
        }).finally(() => this.setData({ openingBusy: false }))
      }
    })
  },

  onContinueOpeningProfile() {
    const currentUser = momentsService.getCurrentUser()

    if (!currentUser || this.data.openingBusy) {
      return
    }

    const nickName = String(this.data.openingProfileNickName || '').trim()
    const avatarUrl = this.data.openingProfileAvatar || ''

    momentsService.updateUserProfile(currentUser.userId, {
      nickName: nickName || currentUser.nickName,
      avatarUrl: avatarUrl || currentUser.avatarUrl
    })

    this.setData({ openingBusy: true })
    authService.syncCloudCurrentUserProfile()
      .then(() => {
        if (this.data.openingIntent === 'invite') {
          return coupleService.createInviteCode().then((state) => {
            if (!state.hasInvite && !state.isBound) {
              wx.showToast({ title: state.syncError || '邀请暂时没能出发', icon: 'none' })
              this.showOpeningState('solo', state)
              return
            }

            if (state.isBound) {
              this.showOpeningState('just-connected', state)
              this.syncLoveInfo(state)
              return
            }

            this.showOpeningState('inviting', state)
          })
        }

        this.showOpeningState('joining', coupleService.getBindingState())
        return null
      })
      .catch(() => {
        wx.showToast({ title: '资料保存失败，再试一次吧', icon: 'none' })
      })
      .finally(() => this.setData({ openingBusy: false }))
  },

  showOpeningState(mode, bindingState = coupleService.getBindingState()) {
    const relationship = relationshipService.getRelationshipContext()
    const myName = this.getOpeningName(relationship.currentUser)
    const partnerName = this.getOpeningName(relationship.partnerUser)
    const copy = mode === 'joining'
      ? {
        eyebrow: 'FOLLOW THE LIGHT',
        title: '沿着轨迹去见 TA',
        subtitle: '输入 TA 发给你的相遇暗号'
      }
      : this.getOpeningCopy(mode, 0, bindingState)

    this.setData({
      openingMode: mode,
      openingInteractive: mode !== 'story',
      openingEyebrow: copy.eyebrow,
      openingTitle: copy.title,
      openingSubtitle: copy.subtitle,
      openingInviteCode: bindingState.inviteCode || '',
      openingMyName: myName || '我',
      openingPartnerName: partnerName || 'TA',
      showOpeningNames: bindingState.isBound,
      myUser: relationship.currentUser || this.data.myUser,
      partnerUser: relationship.partnerUser || this.data.partnerUser
    })
  },

  onOpeningJoinCodeInput(event) {
    this.setData({
      openingJoinCode: String(event.detail.value || '').trim().toUpperCase()
    })
  },

  onSubmitOpeningJoin() {
    const inviteCode = this.data.openingJoinCode

    if (!inviteCode || this.data.openingBusy) {
      return
    }

    this.setData({ openingBusy: true })
    coupleService.bindByInviteCode(inviteCode)
      .then((state) => {
        if (!state.isBound) {
          wx.showToast({ title: state.syncError || '没有找到这条轨迹', icon: 'none' })
          return
        }

        this.showOpeningState('just-connected', state)
        this.syncLoveInfo(state)
        this.refreshDashboard()
      })
      .finally(() => this.setData({ openingBusy: false }))
  },

  onCopyOpeningInvite() {
    if (!this.data.openingInviteCode) {
      return
    }

    wx.setClipboardData({
      data: this.data.openingInviteCode
    })
  },

  onShareAppMessage() {
    const inviteCode = this.data.openingInviteCode || coupleService.getBindingState().inviteCode

    return {
      title: '我在这里等你，一起收藏我们的故事',
      path: inviteCode ? `/pages/home/home?inviteCode=${inviteCode}` : '/pages/home/home'
    }
  },

  onRefreshOpeningBinding() {
    if (this.data.openingBusy) {
      return
    }

    this.setData({ openingBusy: true })
    coupleService.getBindingStatus()
      .then((state) => {
        if (state.isBound) {
          this.showOpeningState('just-connected', state)
          this.syncLoveInfo(state)
          this.refreshDashboard()
          return
        }

        this.showOpeningState('inviting', state)
        wx.showToast({ title: '邀请还在路上', icon: 'none' })
      })
      .finally(() => this.setData({ openingBusy: false }))
  },

  onEnterHomeWhileWaiting() {
    wx.setStorageSync(OPENING_STORAGE_KEY, this.getTodayKey())
    this.finishOpening()
  },

  onContinueConnected() {
    const state = coupleService.getBindingState()
    if (state.coupleId) {
      wx.setStorageSync(`${CONNECTED_STORAGE_PREFIX}${state.coupleId}`, true)
    }
    this.showOpeningState('choose-start-date', state)
  },

  onRelationshipDateChange(event) {
    this.setData({
      relationshipDateDraft: event.detail.value
    })
  },

  onSaveRelationshipDate() {
    const date = this.data.relationshipDateDraft

    if (!isValidRelationshipDate(date, this.getTodayKey()) || this.data.openingBusy) {
      wx.showToast({ title: '请选择今天或更早的日期', icon: 'none' })
      return
    }

    this.setData({ openingBusy: true })
    coupleService.updateRelationshipStartDate(date)
      .then((state) => {
        if (!state.relationshipStartDate) {
          wx.showToast({ title: state.syncError || '日期保存失败', icon: 'none' })
          return
        }

        this.syncLoveInfo(state)
        wx.setStorageSync(OPENING_STORAGE_KEY, this.getTodayKey())
        this.finishOpening()
        wx.showToast({ title: '这一天，记住了', icon: 'none' })
      })
      .finally(() => this.setData({ openingBusy: false }))
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
