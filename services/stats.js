const companionService = require('./companion')

function getRecentStatusStats() {
  const companionData = companionService.getCompanionData()
  const currentWeekMoods = companionData.moodRecords.filter((record) => record.weekTag === 'current')
  const happyDays = getUniqueHappyDays(currentWeekMoods).length
  const missCount = companionData.missHistory.filter((record) => record.weekTag === 'current').length
  const mailboxCount = currentWeekMoods.length

  return [
    {
      value: happyDays,
      title: '本周开心天数',
      desc: '来自小信箱里的开心记录'
    },
    {
      value: missCount,
      title: '本周想你次数',
      desc: '包含发出和收到的想你信号'
    },
    {
      value: mailboxCount,
      title: '小信箱数量',
      desc: '本周写下的心情记录'
    }
  ]
}

function getUniqueHappyDays(records) {
  const happyDays = {}

  records.forEach((record) => {
    if (record.tag === '开心') {
      happyDays[record.dateKey] = true
    }
  })

  return Object.keys(happyDays)
}

module.exports = {
  getRecentStatusStats
}
