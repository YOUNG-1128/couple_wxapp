const profileService = require('../../services/profile')
const statsService = require('../../services/stats')
const momentsService = require('../../services/moments')
const authService = require('../../services/auth')
const coupleService = require('../../services/couple')

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
    creatingInvite: false
  },

  onShow() {
    const currentUser = momentsService.getCurrentUser()

    this.setData({
      recentStats: statsService.getRecentStatusStats(),
      users: momentsService.getUsers(),
      currentUser,
      nickNameDraft: currentUser ? currentUser.nickName : '',
      account: authService.getAccountStatus(),
      cloudAuth: authService.getCloudAuthState(),
      bindingState: coupleService.getBindingState()
    })

    if (this.data.cloudAuth.isCloudLoggedIn) {
      coupleService.getBindingStatus().then((bindingState) => {
        this.setData({
          bindingState,
          account: authService.getAccountStatus()
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
          account: authService.getAccountStatus(),
          cloudAuth,
          bindingState: coupleService.getBindingState()
        })

        if (cloudAuth.isCloudLoggedIn) {
          coupleService.getBindingStatus().then((bindingState) => {
            this.setData({
              bindingState,
              account: authService.getAccountStatus()
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
          bindingState,
          account: authService.getAccountStatus()
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
        bindingState,
        account: authService.getAccountStatus()
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
      nickNameDraft: currentUser.nickName
    })
  },

  onNickNameInput(event) {
    this.setData({
      nickNameDraft: event.detail.value
    })
  },

  onSaveNickName() {
    const currentUser = this.data.currentUser
    const nickName = (this.data.nickNameDraft || '').trim()

    if (!currentUser || !currentUser.userId) {
      return
    }

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

    this.setData({
      users: momentsService.getUsers(),
      currentUser: momentsService.getCurrentUser(),
      nickNameDraft: nickName
    })

    wx.showToast({
      title: '昵称已更新',
      icon: 'success'
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

        momentsService.updateUserProfile(currentUser.userId, { avatarUrl })

        this.setData({
          users: momentsService.getUsers(),
          currentUser: momentsService.getCurrentUser()
        })

        wx.showToast({
          title: '头像已更新',
          icon: 'success'
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
