const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const TEMPLATE_ID = 'REPLACE_WITH_LETTER_NOTICE_TEMPLATE_ID'
const LETTER_COLLECTION = 'letters'
const USER_COLLECTION = 'users'
const DEFAULT_PAGE = 'pages/mailbox/mailbox'

exports.main = async (event) => {
  const letterId = event && event.letterId ? event.letterId : ''
  const toUserId = event && event.toUserId ? event.toUserId : ''

  if (!letterId || !toUserId) {
    return {
      success: false,
      errorMessage: 'missing_letter_or_receiver'
    }
  }

  if (!TEMPLATE_ID || TEMPLATE_ID.includes('REPLACE_WITH')) {
    return {
      success: false,
      errorMessage: 'template_id_not_configured'
    }
  }

  try {
    const [letterRes, userRes] = await Promise.all([
      db.collection(LETTER_COLLECTION).where({
        letterId
      }).limit(1).get(),
      db.collection(USER_COLLECTION).where({
        userId: toUserId
      }).limit(1).get()
    ])

    const letter = letterRes.data && letterRes.data[0]
    const receiver = userRes.data && userRes.data[0]

    if (!letter) {
      return {
        success: false,
        errorMessage: 'letter_not_found'
      }
    }

    if (!receiver || !receiver.openId) {
      return {
        success: false,
        errorMessage: 'receiver_openid_missing'
      }
    }

    const senderName = letter.fromUserName || 'TA'
    const title = letter.title || '你收到一封新信'
    const sentAt = formatDateTime(letter.sentAt || new Date())

    const sendRes = await cloud.openapi.subscribeMessage.send({
      touser: receiver.openId,
      templateId: TEMPLATE_ID,
      page: `${DEFAULT_PAGE}?letterId=${letterId}`,
      data: {
        thing1: {
          value: clipText(title, 20)
        },
        name2: {
          value: clipText(senderName, 10)
        },
        time3: {
          value: sentAt
        },
        thing4: {
          value: clipText(letter.content || '点开看看 TA 想对你说什么', 20)
        }
      }
    })

    await db.collection(LETTER_COLLECTION).where({
      letterId
    }).update({
      data: {
        noticeStatus: 'sent',
        noticeSentAt: new Date().toISOString(),
        noticeMsgId: sendRes.msgid || '',
        noticeError: ''
      }
    })

    return {
      success: true,
      msgId: sendRes.msgid || ''
    }
  } catch (error) {
    return {
      success: false,
      errorMessage: error && error.message ? error.message : 'subscribe_send_failed'
    }
  }
}

function clipText(text, maxLength) {
  return String(text || '').slice(0, maxLength)
}

function formatDateTime(input) {
  const date = new Date(input)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')

  return `${y}-${m}-${d} ${h}:${mm}`
}
