const test = require('node:test')
const assert = require('node:assert/strict')
const { buildAnniversaryTimeline } = require('../services/anniversary-memory')

test('纪念日时间线自动聚合同月同日的动态和已送达信件', () => {
  const groups = buildAnniversaryTimeline({
    date: '2024-04-23',
    calendarType: 'solar'
  }, [
    {
      postId: 'post-1',
      content: '一起吃晚饭',
      images: ['cloud://photo'],
      createdAt: '2026-04-23T18:00:00+08:00'
    }
  ], [
    {
      letterId: 'letter-1',
      title: '写给你',
      content: '今天也很想你',
      status: 'delivered',
      sentAt: '2025-04-23T12:00:00+08:00'
    },
    {
      letterId: 'draft-1',
      title: '草稿',
      status: 'draft',
      createdAt: '2026-04-23T12:00:00+08:00'
    }
  ])

  assert.equal(groups.length, 2)
  assert.equal(groups[0].year, '2026')
  assert.equal(groups[0].items[0].type, 'post')
  assert.equal(groups[1].items[0].type, 'letter')
})
