const profileService = require('../../services/profile')
const statsService = require('../../services/stats')
const momentsService = require('../../services/moments')
const authService = require('../../services/auth')
const coupleService = require('../../services/couple')
const cloudStorageService = require('../../services/cloud-storage')

Page({
  data: {
    ...profileService.getProfileData(),
    recentStats: statsService.getRecentStatusStats(),
    users: [],
    currentUser: {},
    nickNameDraft: '',
    cloudAuth: authService.getCloudAuthState(),
    loggingIn: false,
    bindingState: coupleService.getBindingState(),
    creatingInvite: false,
    aboutTaNotes: [],
    aboutTaDraft: '',
    aboutTaPlaceholder: '例如：\n喜欢热拿铁，少糖\n最近很想去海边\n难过时先抱抱，不要急着讲道理',
    aboutTaEditorVisible: false
  },

  onShow() {
    const currentUser = momentsService.getCurrentUser()
    const currentUserId = currentUser ? currentUser.userId : ''

    this.setData({
      recentStats: statsService.getRecentStatusStats(),
      users: momentsService.getUsers(),
      currentUser,
      nickNameDraft: currentUser ? currentUser.nickName : '',
      cloudAuth: authService.getCloudAuthState(),
      bindingState: coupleService.getBindingState(),
      aboutTaNotes: profileService.getAboutTaNotes(currentUserId)
    })

    if (this.data.cloudAuth.isCloudLoggedIn) {
      coupleService.getBindingStatus().then((bindingState) => {
        this.setData({
          bindingState
        })
      })
    }
  },


  onPrivacyTap() {
    wx.showToast({
      title: '隐私设置即将上线',
      icon: 'none'
    })
  },

  noop() {},

  onOpenAboutTaEditor() {
    this.setData({
      aboutTaDraft: this.data.aboutTaNotes.join('\n'),
      aboutTaEditorVisible: true
    })
  },

  onCloseAboutTaEditor() {
    this.setData({
      aboutTaEditorVisible: false
    })
  },

  onAboutTaInput(event) {
    this.setData({
      aboutTaDraft: event.detail.value
    })
  },

  onSaveAboutTa() {
    const currentUser = this.data.currentUser || {}
    const aboutTaNotes = profileService.saveAboutTaNotes(currentUser.userId || '', this.data.aboutTaDraft)

    this.setData({
      aboutTaNotes,
      aboutTaDraft: aboutTaNotes.join('\n'),
      aboutTaEditorVisible: false
    })

    wx.showToast({
      title: aboutTaNotes.length ? '已经记下来啦' : '已清空记录',
      icon: 'none'
    })
  },

  onWechatLogin() {
    if (this.data.loggingIn) {
      return
    }

    this.setData({
      loggingIn: true
    })

    authService.loginWithWeChat()
      .then(() => {
        const currentUser = momentsService.getCurrentUser()
        const cloudAuth = authService.getCloudAuthState()

        this.setData({
          users: momentsService.getUsers(),
          currentUser,
          nickNameDraft: currentUser ? currentUser.nickName : '',
          cloudAuth,
          bindingState: coupleService.getBindingState()
        })

        if (cloudAuth.isCloudLoggedIn) {
          coupleService.getBindingStatus().then((bindingState) => {
            this.setData({
              bindingState
            })
          })
        }

        wx.showToast({
          title: cloudAuth.cloudProfileSynced ? '微信登录并同步成功' : '微信登录成功',
          icon: cloudAuth.cloudProfileSynced ? 'success' : 'none'
        })
      })
      .catch((error) => {
        const errMsg = error && error.message ? error.message : ''
        const detail = errMsg || (error && error.errMsg) || 'unknown_error'

        wx.showModal({
          title: '微信登录失败',
          content: errMsg === 'cloud_not_ready'
            ? '当前还没有可用的云能力，请先在开发者工具里开通云开发并部署 login / upsertCurrentUser 云函数。'
            : `错误信息：${detail}`,
          showCancel: false
        })
      })
      .finally(() => {
        this.setData({
          loggingIn: false
        })
      })
  },

  onCreateInviteCode() {
    if (this.data.creatingInvite) {
      return
    }

    if (!this.data.cloudAuth.isCloudLoggedIn || !this.data.cloudAuth.cloudProfileSynced) {
      wx.showToast({
        title: '请先完成微信登录同步',
        icon: 'none'
      })
      return
    }

    this.setData({
      creatingInvite: true
    })

    coupleService.createInviteCode()
      .then((bindingState) => {
        this.setData({
          bindingState
        })

        wx.showToast({
          title: bindingState.hasInvite ? '邀请码已生成' : (bindingState.syncError || '生成失败'),
          icon: bindingState.hasInvite ? 'success' : 'none'
        })
      })
      .finally(() => {
        this.setData({
          creatingInvite: false
        })
      })
  },

  onOpenBindPage() {
    if (!this.data.cloudAuth.isCloudLoggedIn || !this.data.cloudAuth.cloudProfileSynced) {
      wx.showToast({
        title: '请先完成微信登录同步',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: '/pages/couple-bind/couple-bind'
    })
  },

  onRefreshBindingStatus() {
    if (!this.data.cloudAuth.isCloudLoggedIn) {
      return
    }

    coupleService.getBindingStatus().then((bindingState) => {
      this.setData({
        bindingState
      })
    })
  },

  onCopyInviteCode() {
    const inviteCode = this.data.bindingState.inviteCode

    if (!inviteCode) {
      return
    }

    wx.setClipboardData({
      data: inviteCode,
      success: () => {
        wx.showToast({
          title: '邀请码已复制',
          icon: 'success'
        })
      }
    })
  },

  onShareAppMessage() {
    const inviteCode = this.data.bindingState.inviteCode || ''

    return {
      title: inviteCode ? `来和我一起记录我们的故事，暗号是 ${inviteCode}` : '来和我一起记录我们的故事',
      path: inviteCode
        ? `/pages/home/home?inviteCode=${encodeURIComponent(inviteCode)}`
        : '/pages/home/home'
    }
  },


  onSwitchUser(event) {
    if (this.data.cloudAuth.isCloudLoggedIn) {
      return
    }

    const userId = event.currentTarget.dataset.userId

    if (!userId) {
      return
    }

    const currentUser = momentsService.switchCurrentUser(userId)

    this.setData({
      users: momentsService.getUsers(),
      currentUser,
      nickNameDraft: currentUser.nickName,
      aboutTaNotes: profileService.getAboutTaNotes(currentUser.userId)
    })
  },

  onEditNickName() {
    const currentUser = this.data.currentUser

    if (!currentUser || !currentUser.userId) {
      return
    }

    wx.showModal({
      title: '给自己取个昵称',
      editable: true,
      placeholderText: '输入昵称',
      content: currentUser.nickName || '',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        const nickName = String(res.content || '').trim().slice(0, 20)

        if (!nickName) {
          wx.showToast({
            title: '昵称不能为空哦',
            icon: 'none'
          })
          return
        }

        momentsService.updateUserProfile(currentUser.userId, {
          nickName
        })

        const syncProfile = this.data.cloudAuth.isCloudLoggedIn
          ? authService.syncCloudCurrentUserProfile()
          : Promise.resolve()

        syncProfile.finally(() => {
          this.setData({
            users: momentsService.getUsers(),
            currentUser: momentsService.getCurrentUser(),
            nickNameDraft: nickName,
            cloudAuth: authService.getCloudAuthState()
          })

          wx.showToast({
            title: '昵称已更新',
            icon: 'success'
          })
        })
      }
    })
  },

  onChooseAvatar() {
    const currentUser = this.data.currentUser

    if (!currentUser || !currentUser.userId) {
      return
    }

    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const avatarUrl = res.tempFilePaths && res.tempFilePaths[0]

        if (!avatarUrl) {
          return
        }

        cloudStorageService.uploadFile(avatarUrl, {
          category: 'avatars',
          ownerId: currentUser.userId
        }).then((cloudAvatarUrl) => {
          momentsService.updateUserProfile(currentUser.userId, { avatarUrl: cloudAvatarUrl })

          return this.data.cloudAuth.isCloudLoggedIn
            ? authService.syncCloudCurrentUserProfile()
            : null
        }).then(() => {
          this.setData({
            users: momentsService.getUsers(),
            currentUser: momentsService.getCurrentUser(),
            cloudAuth: authService.getCloudAuthState()
          })

          wx.showToast({
            title: '头像已更新',
            icon: 'success'
          })
        }).catch(() => {
          wx.showToast({
            title: '头像上传失败',
            icon: 'none'
          })
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
  }
})
