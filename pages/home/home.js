const homeMock = require('../../mock/home')
const anniversaryService = require('../../services/anniversary')
const companionService = require('../../services/companion')
const pendingService = require('../../services/pending')
const todoService = require('../../services/todo')
const momentsService = require('../../services/moments')
const dailyMoodService = require('../../services/dailyMood')

const TAB_PAGES = ['/pages/home/home', '/pages/hub/hub', '/pages/profile/profile']
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
    monthAnniversaries: []
  },

  onShow() {
    this.refreshDashboard()
  },

  refreshDashboard() {
    const users = momentsService.getUsers()
    const myUser = users.find((item) => item.userId === 'me') || users[0] || null
    const partnerUser = users.find((item) => item.userId === 'partner') || users.find((item) => item.userId !== (myUser && myUser.userId)) || null

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
