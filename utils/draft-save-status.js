const STATUS_VIEW_MAP = {
  saving: {
    text: '正在自动保存...',
    tone: 'saving'
  },
  saved: {
    text: '已自动保存',
    tone: 'saved'
  },
  failed: {
    text: '自动保存失败，请手动保存',
    tone: 'failed'
  }
}

function getDraftSaveStatusView(status) {
  return STATUS_VIEW_MAP[status] || {
    text: '',
    tone: ''
  }
}

module.exports = {
  getDraftSaveStatusView
}
