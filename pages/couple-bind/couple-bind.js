const coupleService = require('../../services/couple')

Page({
  data: {
    inviteCode: '',
    submitting: false
  },

  onInviteCodeInput(event) {
    this.setData({
      inviteCode: String(event.detail.value || '').trim().toUpperCase()
    })
  },

  onSubmitBind() {
    if (this.data.submitting) {
      return
    }

    const inviteCode = String(this.data.inviteCode || '').trim().toUpperCase()

    if (!inviteCode) {
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none'
      })
      return
    }

    this.setData({
      submitting: true
    })

    coupleService.bindByInviteCode(inviteCode)
      .then((state) => {
        if (!state.isBound) {
          wx.showToast({
            title: state.syncError || '绑定失败',
            icon: 'none'
          })
          return
        }

        wx.showToast({
          title: '绑定成功',
          icon: 'success'
        })

        setTimeout(() => {
          wx.navigateBack()
        }, 500)
      })
      .finally(() => {
        this.setData({
          submitting: false
        })
      })
  }
})
