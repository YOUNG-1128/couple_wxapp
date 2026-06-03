const todoService = require('../../services/todo')

Page({
  data: {
    pageTitle: '待办清单',
    pageSubtitle: '把一个人的事和两个人的事都好好记住',
    filters: [
      { key: 'all', label: '全部' },
      { key: 'me', label: '我的' },
      { key: 'partner', label: 'TA 的' },
      { key: 'couple', label: '情侣待办' }
    ],
    activeFilter: 'all',
    todos: [],
    currentUser: {},
    partnerUser: {},
    todayPendingCount: 0,
    totalPendingCount: 0,
    couplePendingCount: 0,
    showCreator: false,
    formTitle: '',
    formNote: '',
    formTarget: 'me',
    formDueDate: ''
  },

  onLoad() {
    this.refreshData()
  },

  onShow() {
    this.refreshData()
  },

  refreshData() {
    return todoService.getTodosAsync(this.data.activeFilter)
      .then((pageData) => {
        this.setData({
          todos: pageData.todos,
          currentUser: pageData.currentUser || {},
          partnerUser: pageData.partnerUser || {},
          todayPendingCount: pageData.todayPendingCount,
          totalPendingCount: pageData.totalPendingCount,
          couplePendingCount: pageData.couplePendingCount,
          formTarget: this.normalizeFormTarget(this.data.formTarget, pageData.currentUser, pageData.partnerUser)
        })
      })
      .catch(() => {
        wx.showToast({
          title: '待办加载失败',
          icon: 'none'
        })
      })
  },

  normalizeFormTarget(formTarget, currentUser, partnerUser) {
    if (formTarget === 'couple') {
      return 'couple'
    }

    const allowed = [currentUser && currentUser.userId, partnerUser && partnerUser.userId].filter(Boolean)

    if (allowed.includes(formTarget)) {
      return formTarget
    }

    return currentUser && currentUser.userId ? currentUser.userId : 'me'
  },

  onFilterTap(event) {
    const filter = event.currentTarget.dataset.filter

    if (!filter || filter === this.data.activeFilter) {
      return
    }

    this.setData({
      activeFilter: filter
    })

    this.refreshData()
  },

  onToggleTodo(event) {
    const todoId = event.currentTarget.dataset.todoId

    if (!todoId) {
      return
    }

    const todo = this.data.todos.find((item) => item.todoId === todoId)

    if (!todo) {
      return
    }

    todoService.toggleTodoStatusAsync(todoId, todo.completed ? 'pending' : 'done')
      .then(() => this.refreshData())
      .catch(() => {
        wx.showToast({
          title: '更新失败',
          icon: 'none'
        })
      })
  },

  onOpenCreator() {
    this.setData({ showCreator: true })
  },

  onCloseCreator() {
    this.setData({ showCreator: false })
  },

  noop() {

  },

  onTitleInput(event) {
    this.setData({ formTitle: event.detail.value })
  },

  onNoteInput(event) {
    this.setData({ formNote: event.detail.value })
  },

  onSelectTarget(event) {
    const target = event.currentTarget.dataset.target

    if (!target) {
      return
    }

    this.setData({ formTarget: target })
  },

  onDueDateChange(event) {
    this.setData({ formDueDate: event.detail.value })
  },

  onClearDueDate() {
    this.setData({ formDueDate: '' })
  },

  onSaveTodo() {
    const title = (this.data.formTitle || '').trim()

    if (!title) {
      wx.showToast({
        title: '待办标题不能为空哦',
        icon: 'none'
      })

      return
    }

    const isCouple = this.data.formTarget === 'couple'

    todoService.createTodoAsync({
      title,
      note: (this.data.formNote || '').trim(),
      type: isCouple ? 'couple' : 'personal',
      ownerId: isCouple ? null : this.data.formTarget,
      dueDate: this.data.formDueDate
    })
      .then(() => {
        this.setData({
          showCreator: false,
          formTitle: '',
          formNote: '',
          formTarget: this.data.currentUser.userId || 'me',
          formDueDate: ''
        })

        return this.refreshData()
      })
      .then(() => {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
      })
      .catch(() => {
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      })
  },

  onDeleteTodo(event) {
    const todoId = event.currentTarget.dataset.todoId

    if (!todoId) {
      return
    }

    wx.showModal({
      title: '删除待办',
      content: '删除后不会恢复，确定删除吗？',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        todoService.removeTodoAsync(todoId)
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
  }
})
