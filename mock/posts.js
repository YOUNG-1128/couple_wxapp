module.exports = [
  {
    postId: 'post-1001',
    coupleId: 'couple-demo',
    visibility: 'couple',
    syncStatus: 'local',
    authorId: 'me',
    authorName: '我',
    authorAvatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=240&q=80',
    content: '今天下班一起去吃了甜品，回来路上风也很温柔。',
    images: [
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80'
    ],
    location: {
      enabled: false,
      mode: 'manual',
      city: {
        code: '',
        name: '',
        province: '',
        country: '中国',
        latitude: null,
        longitude: null
      },
      placeName: '',
      address: '',
      source: 'manual',
      poiId: ''
    },
    linkedFootprintId: null,
    shouldCreateFootprint: false,
    createdAt: '2026-04-24T18:30:00+08:00',
    updatedAt: '2026-04-24T18:30:00+08:00',
    comments: [
      {
        commentId: 'comment-2001',
        postId: 'post-1001',
        userId: 'partner',
        userName: 'TA',
        userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80',
        content: '这家真的好吃，下次还去。',
        createdAt: '2026-04-24T19:05:00+08:00',
        updatedAt: '2026-04-24T19:05:00+08:00',
        syncStatus: 'local'
      }
    ]
  },
  {
    postId: 'post-1002',
    coupleId: 'couple-demo',
    visibility: 'couple',
    syncStatus: 'local',
    authorId: 'partner',
    authorName: 'TA',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80',
    content: '给你留了一束小花，周末见面的时候送你。',
    images: [],
    location: {
      enabled: false,
      mode: 'manual',
      city: {
        code: '',
        name: '',
        province: '',
        country: '中国',
        latitude: null,
        longitude: null
      },
      placeName: '',
      address: '',
      source: 'manual',
      poiId: ''
    },
    linkedFootprintId: null,
    shouldCreateFootprint: false,
    createdAt: '2026-04-23T21:15:00+08:00',
    updatedAt: '2026-04-23T21:15:00+08:00',
    comments: []
  }
]
