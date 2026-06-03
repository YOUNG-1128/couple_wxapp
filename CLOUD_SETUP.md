# 站外新信提醒接入说明

## 已完成

- 已补 `login` 云函数，用于获取当前微信用户 `openid`
- 小程序端发送信件时会请求订阅消息授权
- 授权成功后会调用云函数 `sendLetterSubscribeNotice`
- 云函数脚手架已放在 `cloudfunctions/sendLetterSubscribeNotice`

## 登录云函数部署

先部署下面这两个云函数：

- `cloudfunctions/login`
- `cloudfunctions/upsertCurrentUser`

部署完成后，“我们”页里的“微信登录”按钮就可以：

- 拿到真实 `openid`
- 把当前用户写入 `users` 云集合

## 你现在需要补的两件事

### 1. 配置订阅消息模板 ID

把下面两个位置里的占位值：

- `pages/mailbox-compose/mailbox-compose.js`
- `cloudfunctions/sendLetterSubscribeNotice/index.js`

从：

`REPLACE_WITH_LETTER_NOTICE_TEMPLATE_ID`

替换成你真实的小程序订阅消息模板 ID。

建议模板内容使用这些字段类型：

- 标题
- 发送人
- 时间
- 备注

当前云函数示例里按下面字段名在发送：

- `thing1`
- `name2`
- `time3`
- `thing4`

如果你的模板字段名不一样，需要同步改云函数里的 `data` 映射。

### 2. 在微信开发者工具里部署云函数

步骤：

1. 打开微信开发者工具
2. 开通并绑定云开发环境
3. 右键 `cloudfunctions/sendLetterSubscribeNotice`
4. 选择“上传并部署：云端安装依赖”

## 云数据库要求

当前云函数默认读取两个集合：

- `letters`
- `users`

并要求至少有这些字段：

### `users`

```json
{
  "userId": "partner",
  "openId": "用户的小程序 openid"
}
```

### `letters`

```json
{
  "letterId": "letter-xxx",
  "fromUserName": "我",
  "content": "信件内容",
  "title": "信件标题",
  "sentAt": "2026-04-26T20:00:00+08:00",
  "noticeStatus": "pending"
}
```

## 当前限制

- 现在本地 `mock` 发信不会自动同步到云数据库
- 所以云函数脚手架已经有了，但要真正发站外提醒，还需要你把信件和用户同步到云数据库
- 如果还没做登录，`openId` 也需要后续通过云函数登录链路拿到

## 下一步建议

如果你要真正打通站外提醒，建议顺序是：

1. 接小程序登录并保存 `openId`
2. 发信时把 `letters` 写入云数据库
3. 再调用 `sendLetterSubscribeNotice`
