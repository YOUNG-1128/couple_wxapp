module.exports = {
  mailbox: {
    title: '心情小信箱',
    placeholder: '写下此刻的心情，先放在这里。',
    tags: ['开心', '想你', '有点累', '需要抱抱']
  },
  comfortModes: [
    '抱抱你',
    '陪你一下',
    '晚点再聊'
  ],
  missHistory: [
    {
      id: 'miss-001',
      senderUserId: 'me',
      receiverUserId: 'partner',
      createdAt: '2026-04-25T09:12:00+08:00',
      readStatus: 'read',
      message: '我想你了',
      source: 'home-quick-heart',
      weekTag: 'current'
    },
    {
      id: 'miss-002',
      senderUserId: 'partner',
      receiverUserId: 'me',
      createdAt: '2026-04-24T22:06:00+08:00',
      readStatus: 'unread',
      message: '我想你了',
      source: 'home-quick-heart',
      weekTag: 'current'
    },
    {
      id: 'miss-003',
      senderUserId: 'me',
      receiverUserId: 'partner',
      createdAt: '2026-04-21T13:40:00+08:00',
      readStatus: 'read',
      message: '我想你了',
      source: 'home-quick-heart',
      weekTag: 'current'
    }
  ],
  moodRecords: [
    {
      id: 'mood-001',
      content: '今天一起聊天很开心。',
      tag: '开心',
      time: '周二 21:10',
      dateKey: '2026-04-21',
      weekTag: 'current'
    }
  ],
  mailboxInbox: [
    {
      id: 'mailbox-001',
      type: 'received',
      content: '今天路过那家甜品店，又想起我们上次一起去的时候。',
      readStatus: 'unread',
      createdAt: '2026-04-23 18:20',
      senderRole: 'partner'
    }
  ],
  questionEntry: {
    title: '今日情侣问答',
    question: '今天最想听到对方说哪句话？',
    desc: '留一个小问题，等见面或者睡前一起回答。'
  },
  recentMood: null
}
