const mailboxService = require('../../services/mailbox')
const cloudStorageService = require('../../services/cloud-storage')
const { buildLetterSendConfirmation } = require('../../utils/letter-send-confirmation')

const MAX_IMAGE_COUNT = 9
const MAX_CONTENT_LENGTH = 2000
const LETTER_SUBSCRIBE_TEMPLATE_IDS = ['REPLACE_WITH_LETTER_NOTICE_TEMPLATE_ID']

Page({
  data: {
    draftId: '',
    currentUser: null,
    partnerUser: null,
    title: '',
    greeting: '',
    content: '',
    signature: '',
    letterDateText: '',
    images: [],
    sendMode: 'now',
    scheduleDate: '',
    scheduleTime: '',
    sending: false
  },

  onLoad(options) {
    this.skipAutoSave = false
    this.lastSavedSnapshot = ''
    const draftId = options && options.draftId ? options.draftId : ''

    this.setData({ draftId })
    this.loadPageData()
  },

  onShow() {
    this.loadPageData()
  },

  onHide() {
    this.tryAutoSaveDraft()
  },

  onUnload() {
    this.tryAutoSaveDraft()
  },

  loadPageData() {
    const { currentUser, partnerUser } = mailboxService.getMailboxUsers()
    mailboxService.getDraftByIdAsync(this.data.draftId).then((draft) => {
      const schedule = draft && draft.visibleAt ? new Date(draft.visibleAt) : null

      this.setData({
        currentUser,
        partnerUser,
        title: draft ? draft.title : '',
        greeting: draft ? (draft.greeting || '') : '',
        content: draft ? draft.content : '',
        signature: draft ? (draft.signature || '') : '',
        letterDateText: draft ? (draft.letterDateText || '') : '',
        images: draft ? (draft.images || []) : [],
        sendMode: draft && draft.sendMode ? draft.sendMode : 'now',
        scheduleDate: schedule && !Number.isNaN(schedule.getTime()) ? this.formatDate(schedule) : '',
        scheduleTime: schedule && !Number.isNaN(schedule.getTime()) ? this.formatTime(schedule) : ''
      })

      this.syncSavedDraftState({
        draftId: draft ? draft.letterId : this.data.draftId
      })
    })
  },

  onTitleInput(event) {
    this.setData({ title: event.detail.value })
  },

  onGreetingInput(event) {
    this.setData({ greeting: event.detail.value })
  },

  onContentInput(event) {
    const raw = event.detail.value || ''
    const content = raw.slice(0, MAX_CONTENT_LENGTH)

    this.setData({
      content
    })
  },

  onSignatureInput(event) {
    this.setData({ signature: event.detail.value })
  },

  onLetterDateInput(event) {
    this.setData({ letterDateText: event.detail.value })
  },

  onSelectSendMode(event) {
    this.setData({ sendMode: event.currentTarget.dataset.mode })
  },

  onScheduleDateChange(event) {
    this.setData({ scheduleDate: event.detail.value })
  },

  onScheduleTimeChange(event) {
    this.setData({ scheduleTime: event.detail.value })
  },

  onChooseImages() {
    const remain = MAX_IMAGE_COUNT - this.data.images.length

    if (remain <= 0) {
      wx.showToast({
        title: `最多${MAX_IMAGE_COUNT}张图片`,
        icon: 'none'
      })
      return
    }

    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        this.setData({
          images: this.data.images.concat(res.tempFilePaths).slice(0, MAX_IMAGE_COUNT)
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

  onRemoveImage(event) {
    const index = Number(event.currentTarget.dataset.index)

    this.setData({
      images: this.data.images.filter((_, i) => i !== index)
    })
  },

  onPreviewImage(event) {
    const current = event.currentTarget.dataset.src

    wx.previewImage({
      current,
      urls: this.data.images
    })
  },

  hasDraftContent() {
    return Boolean(
      (this.data.title || '').trim()
      || (this.data.greeting || '').trim()
      || (this.data.content || '').trim()
      || (this.data.signature || '').trim()
      || (this.data.letterDateText || '').trim()
      || (Array.isArray(this.data.images) && this.data.images.length)
      || (this.data.sendMode === 'scheduled' && (this.data.scheduleDate || this.data.scheduleTime))
    )
  },

  buildDraftPayload() {
    return {
      editingLetterId: this.data.draftId,
      title: (this.data.title || '').trim(),
      greeting: (this.data.greeting || '').trim(),
      content: (this.data.content || '').trim(),
      signature: (this.data.signature || '').trim(),
      letterDateText: (this.data.letterDateText || '').trim(),
      images: this.data.images || [],
      sendMode: this.data.sendMode,
      visibleAt: this.data.sendMode === 'scheduled' ? this.combineScheduleAt() : '',
      toUserId: this.data.partnerUser ? this.data.partnerUser.userId : 'partner'
    }
  },

  buildDraftSnapshot() {
    const payload = this.buildDraftPayload()

    return JSON.stringify({
      editingLetterId: payload.editingLetterId || '',
      title: payload.title,
      greeting: payload.greeting,
      content: payload.content,
      signature: payload.signature,
      letterDateText: payload.letterDateText,
      images: payload.images,
      sendMode: payload.sendMode,
      visibleAt: payload.visibleAt,
      toUserId: payload.toUserId
    })
  },

  syncSavedDraftState(extra = {}) {
    this.lastSavedSnapshot = this.buildDraftSnapshot()

    if (extra && extra.draftId && extra.draftId !== this.data.draftId) {
      this.setData({
        draftId: extra.draftId
      })
    }
  },

  saveDraftRecord(options = {}) {
    if (!this.hasDraftContent()) {
      return Promise.resolve(null)
    }

    return this.uploadLetterImages().then(() => {
      const payload = this.buildDraftPayload()
      return mailboxService.saveDraftAsync(payload)
    }).then((draft) => {
      this.syncSavedDraftState({
        draftId: draft.letterId
      })

      if (options.showToast) {
        wx.showToast({
          title: options.toastText || '草稿已保存',
          icon: 'none'
        })
      }

      return draft
    })
  },

  tryAutoSaveDraft() {
    if (this.skipAutoSave || this.data.sending || !this.hasDraftContent()) {
      return
    }

    const snapshot = this.buildDraftSnapshot()

    if (snapshot === this.lastSavedSnapshot) {
      return
    }

    this.saveDraftRecord().catch(() => {})
  },

  onSaveDraft() {
    if (!this.hasDraftContent()) {
      wx.showToast({
        title: '写点内容再保存吧',
        icon: 'none'
      })
      return
    }

    this.saveDraftRecord({
      showToast: true
    }).then(() => {
      this.skipAutoSave = true

      setTimeout(() => {
        this.goBackMailbox()
      }, 220)
    }).catch(() => {
      wx.showToast({
        title: '草稿保存失败',
        icon: 'none'
      })
    })
  },

  onSend() {
    if (this.data.sending) {
      return
    }

    const content = (this.data.content || '').trim()
    const hasImages = Array.isArray(this.data.images) && this.data.images.length > 0

    if (!content && !hasImages) {
      wx.showToast({
        title: '写点内容或加一张图片吧',
        icon: 'none'
      })
      return
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      wx.showToast({
        title: `最多${MAX_CONTENT_LENGTH}个字`,
        icon: 'none'
      })
      return
    }

    if (!this.validateScheduledSend()) {
      return
    }

    const confirmation = buildLetterSendConfirmation({
      sendMode: this.data.sendMode,
      receiverName: this.data.partnerUser ? this.data.partnerUser.nickName : 'TA',
      scheduleDate: this.data.scheduleDate,
      scheduleTime: this.data.scheduleTime
    })

    wx.showModal({
      ...confirmation,
      confirmColor: '#e85d75',
      success: (res) => {
        if (!res.confirm) {
          return
        }

        this.prepareAndSendLetter(content)
      }
    })
  },

  validateScheduledSend() {
    if (this.data.sendMode !== 'scheduled') {
      return true
    }

    const visibleAt = this.combineScheduleAt()

    if (!visibleAt) {
      wx.showToast({
        title: '请选择定时时间',
        icon: 'none'
      })
      return false
    }

    if (new Date(visibleAt).getTime() <= Date.now()) {
      wx.showToast({
        title: '请选择未来时间',
        icon: 'none'
      })
      return false
    }

    return true
  },

  prepareAndSendLetter(content) {
    this.setData({ sending: true })

    this.uploadLetterImages().then(() => {
      this.sendPreparedLetter(content)
    }).catch(() => {
      this.setData({ sending: false })
      wx.showToast({
        title: '图片上传失败',
        icon: 'none'
      })
    })
  },

  sendPreparedLetter(content) {
    if (this.data.sendMode === 'scheduled') {
      const visibleAt = this.combineScheduleAt()

      mailboxService.sendLetterScheduledAsync({
        editingLetterId: this.data.draftId,
        title: (this.data.title || '').trim(),
        greeting: (this.data.greeting || '').trim(),
        content,
        signature: (this.data.signature || '').trim(),
        letterDateText: (this.data.letterDateText || '').trim(),
        images: this.data.images,
        visibleAt,
        toUserId: this.data.partnerUser ? this.data.partnerUser.userId : 'partner',
        notice: {
          noticeStatus: 'pending',
          noticeRequestedAt: new Date().toISOString()
        }
      }).then(() => {
        this.skipAutoSave = true
        this.setData({ sending: false })
        wx.showToast({
          title: '已经约好送达时间',
          icon: 'none'
        })

        setTimeout(() => {
          this.goBackMailbox()
        }, 240)
      }).catch(() => {
        this.setData({ sending: false })
        wx.showToast({
          title: '暂时没能约好时间',
          icon: 'none'
        })
      })
      return
    }

    const noticeRequestedAt = new Date().toISOString()
    mailboxService.sendLetterNowAsync({
      editingLetterId: this.data.draftId,
      title: (this.data.title || '').trim(),
      greeting: (this.data.greeting || '').trim(),
      content,
      signature: (this.data.signature || '').trim(),
      letterDateText: (this.data.letterDateText || '').trim(),
      images: this.data.images,
      toUserId: this.data.partnerUser ? this.data.partnerUser.userId : 'partner',
      notice: {
        noticeStatus: 'pending',
        noticeRequestedAt
      }
    }).then((letter) => {
      this.skipAutoSave = true

      return this.requestLetterNoticeSubscription()
        .then((subscriptionResult) => this.trySendExternalNotice(letter, subscriptionResult))
        .finally(() => {
          this.setData({ sending: false })
          wx.showToast({
            title: '信已经寄出',
            icon: 'none'
          })

          setTimeout(() => {
            this.goBackMailbox()
          }, 240)
        })
    }).catch(() => {
      this.setData({ sending: false })
      wx.showToast({
        title: '信暂时没寄出去',
        icon: 'none'
      })
    })
  },

  uploadLetterImages() {
    const currentUser = this.data.currentUser || {}

    return cloudStorageService.uploadFiles(this.data.images || [], {
      category: 'letters',
      ownerId: currentUser.userId || 'anonymous'
    }).then((images) => {
      this.setData({ images })
      return images
    })
  },

  requestLetterNoticeSubscription() {
    const templateIds = LETTER_SUBSCRIBE_TEMPLATE_IDS.filter((item) => item && !item.includes('REPLACE_WITH'))

    if (!templateIds.length || typeof wx.requestSubscribeMessage !== 'function') {
      return Promise.resolve({
        available: false,
        accepted: false,
        reason: 'template_not_configured'
      })
    }

    return new Promise((resolve) => {
      wx.requestSubscribeMessage({
        tmplIds: templateIds,
        success: (res) => {
          const accepted = templateIds.some((tmplId) => res[tmplId] === 'accept')
          resolve({
            available: true,
            accepted,
            detail: res
          })
        },
        fail: (err) => {
          resolve({
            available: true,
            accepted: false,
            error: err
          })
        }
      })
    })
  },

  trySendExternalNotice(letter, subscriptionResult) {
    if (!letter || !letter.letterId) {
      return Promise.resolve()
    }

    if (!subscriptionResult || subscriptionResult.accepted !== true) {
      mailboxService.updateLetterNoticeStatusAsync(letter.letterId, {
        noticeStatus: subscriptionResult && subscriptionResult.available ? 'denied' : 'skipped',
        noticeRequestedAt: letter.noticeRequestedAt || new Date().toISOString(),
        noticeError: subscriptionResult && subscriptionResult.reason ? subscriptionResult.reason : ''
      })
      return Promise.resolve()
    }

    if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
      mailboxService.updateLetterNoticeStatusAsync(letter.letterId, {
        noticeStatus: 'pending',
        noticeRequestedAt: letter.noticeRequestedAt || new Date().toISOString(),
        noticeError: 'cloud_not_ready'
      })
      return Promise.resolve()
    }

    return wx.cloud.callFunction({
      name: 'sendLetterSubscribeNotice',
      data: {
        letterId: letter.letterId,
        toUserId: letter.toUserId,
        templateKey: 'letter_new_notice'
      }
    }).then((res) => {
      const result = (res && res.result) || {}

      mailboxService.updateLetterNoticeStatusAsync(letter.letterId, {
        noticeStatus: result.success === true ? 'sent' : 'failed',
        noticeRequestedAt: letter.noticeRequestedAt || new Date().toISOString(),
        noticeSentAt: result.success === true ? new Date().toISOString() : null,
        noticeMsgId: result.msgId || '',
        noticeError: result.success === true ? '' : (result.errorMessage || 'send_failed')
      })
    }).catch((error) => {
      const errMsg = error && error.errMsg ? error.errMsg : 'cloud_call_failed'

      mailboxService.updateLetterNoticeStatusAsync(letter.letterId, {
        noticeStatus: 'failed',
        noticeRequestedAt: letter.noticeRequestedAt || new Date().toISOString(),
        noticeError: errMsg
      })
    })
  },

  combineScheduleAt() {
    if (!this.data.scheduleDate || !this.data.scheduleTime) {
      return ''
    }

    const date = new Date(`${this.data.scheduleDate}T${this.data.scheduleTime}:00`)

    if (Number.isNaN(date.getTime())) {
      return ''
    }

    return date.toISOString()
  },

  goBackMailbox() {
    const pages = getCurrentPages()
    const mailboxIndex = pages.findIndex((page) => page.route === 'pages/mailbox/mailbox')

    if (mailboxIndex >= 0) {
      const delta = pages.length - mailboxIndex - 1

      if (delta > 0) {
        wx.navigateBack({ delta })
        return
      }
    }

    wx.redirectTo({
      url: '/pages/mailbox/mailbox'
    })
  },

  formatDate(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')

    return `${y}-${m}-${d}`
  },

  formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')

    return `${h}:${m}`
  }
})
