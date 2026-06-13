function buildLetterSendConfirmation(options = {}) {
  const receiverName = String(options.receiverName || 'TA')

  if (options.sendMode === 'scheduled') {
    const scheduleText = [options.scheduleDate, options.scheduleTime].filter(Boolean).join(' ')

    return {
      title: '确认定时发送',
      content: `信件将在 ${scheduleText} 对 ${receiverName} 可见，确定保存这个发送计划吗？`,
      confirmText: '确认'
    }
  }

  return {
    title: '确认发送',
    content: `确定现在发送给${receiverName}吗？发送后无法撤回。`,
    confirmText: '发送'
  }
}

module.exports = {
  buildLetterSendConfirmation
}
