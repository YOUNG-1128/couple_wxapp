const test = require('node:test')
const assert = require('node:assert/strict')
const {
  lunarToSolar,
  solarToLunar,
  formatLunarDate
} = require('../utils/lunar')
const {
  decorateAnniversary,
  groupAnniversaries
} = require('../utils/anniversary')

test('农历生日可以换算为对应公历日期', () => {
  assert.equal(lunarToSolar(2026, 1, 1, false), '2026-02-17')
  assert.deepEqual(solarToLunar('2026-02-17'), {
    year: 2026,
    month: 1,
    day: 1,
    isLeapMonth: false
  })
})

test('冬月日期兼容 Intl 返回的十一月称呼', () => {
  assert.equal(lunarToSolar(2002, 11, 6, false), '2002-12-09')
  assert.deepEqual(solarToLunar('2002-12-09'), {
    year: 2002,
    month: 11,
    day: 6,
    isLeapMonth: false
  })
})

test('农历纪念日按下一次真实公历日期计算倒计时', () => {
  const item = decorateAnniversary({
    title: 'TA 的农历生日',
    date: '2025-02-28',
    calendarType: 'lunar',
    lunarMonth: 2,
    lunarDay: 1,
    lunarIsLeapMonth: false,
    repeatType: 'yearly'
  }, new Date('2026-03-01T00:00:00'))

  assert.equal(item.nextDate, '2026-03-19')
  assert.equal(item.displayDate, '农历二月初一')
  assert.equal(formatLunarDate(2, 1, false), '农历二月初一')
})

test('春节前仍能找到属于上一农历年的下一次日期', () => {
  const item = decorateAnniversary({
    title: '腊月生日',
    date: '2025-02-02',
    calendarType: 'lunar',
    lunarMonth: 12,
    lunarDay: 15,
    lunarIsLeapMonth: false,
    repeatType: 'yearly'
  }, new Date('2026-01-20T00:00:00'))

  assert.equal(item.nextDate, '2026-02-02')
})

test('一次性纪念日已经过去时显示正数天数', () => {
  const item = decorateAnniversary({
    title: '毕业旅行',
    date: '2026-06-01',
    calendarType: 'solar',
    repeatType: 'none'
  }, new Date('2026-06-12T00:00:00'))

  assert.equal(item.daysUntil, -11)
  assert.equal(item.countdownText, '已经过去 11 天')
})

test('每年重复纪念日显示下一次是一起纪念的第几次', () => {
  const item = decorateAnniversary({
    title: '第一次约会',
    date: '2023-08-20',
    calendarType: 'solar',
    repeatType: 'yearly'
  }, new Date('2026-06-12T00:00:00'))

  assert.equal(item.nextDate, '2026-08-20')
  assert.equal(item.occurrenceCount, 4)
  assert.equal(item.occurrenceText, '这是我们一起纪念的第 4 次')
})

test('纪念日按即将到来和已经过去分组', () => {
  const list = [
    decorateAnniversary({
      id: 'past',
      title: '过去的一次旅行',
      date: '2026-05-01',
      calendarType: 'solar',
      repeatType: 'none'
    }, new Date('2026-06-12T00:00:00')),
    decorateAnniversary({
      id: 'yearly',
      title: '每年的纪念日',
      date: '2023-08-20',
      calendarType: 'solar',
      repeatType: 'yearly'
    }, new Date('2026-06-12T00:00:00')),
    decorateAnniversary({
      id: 'future',
      title: '未来的一次旅行',
      date: '2026-07-01',
      calendarType: 'solar',
      repeatType: 'none'
    }, new Date('2026-06-12T00:00:00'))
  ]

  const grouped = groupAnniversaries(list)

  assert.deepEqual(grouped.upcoming.map((item) => item.id), ['future', 'yearly'])
  assert.deepEqual(grouped.past.map((item) => item.id), ['past'])
})

test('旧中文纪念日类型会归一化为新的语义类型', () => {
  const birthday = decorateAnniversary({
    title: '阿眠的生日',
    date: '2002-12-09',
    type: '生日',
    repeatType: 'yearly'
  }, new Date('2026-06-13T00:00:00'))
  const meeting = decorateAnniversary({
    title: '第一次见面',
    date: '2024-10-08',
    type: '第一次见面',
    repeatType: 'yearly'
  }, new Date('2026-06-13T00:00:00'))

  assert.equal(birthday.semanticType, 'birthday')
  assert.equal(meeting.semanticType, 'shared_memory')
})

test('生日显示中性来到世界天数并隐藏第几次纪念', () => {
  const item = decorateAnniversary({
    title: '阿眠的生日',
    date: '2026-06-10',
    type: 'birthday',
    repeatType: 'yearly'
  }, new Date('2026-06-13T00:00:00'))

  assert.equal(item.elapsedText, '已经来到世界 4 天')
  assert.equal(item.occurrenceText, '')
})

test('恋爱纪念日和普通纪念日使用不同的经过时间文案', () => {
  const relationship = decorateAnniversary({
    title: '恋爱纪念日',
    date: '2026-06-10',
    type: 'relationship',
    repeatType: 'yearly'
  }, new Date('2026-06-13T00:00:00'))
  const custom = decorateAnniversary({
    title: '领证日',
    date: '2026-06-10',
    type: 'custom',
    repeatType: 'yearly'
  }, new Date('2026-06-13T00:00:00'))

  assert.equal(relationship.elapsedText, '我们已经一起走过 4 天')
  assert.equal(custom.elapsedText, '这个日子已经过去 4 天')
})
