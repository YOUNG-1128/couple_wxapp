# AGENTS.md

## 项目概览

这是一个微信小程序项目，主题是情侣关系中的日常陪伴与共同记录。产品功能围绕“首页提醒、情侣绑定、信箱、朋友圈/相册、待办、纪念日、共同足迹、每日问答、想你信号、心情状态、100 件事、胶囊”等模块展开。

项目当前既有本地 mock 数据与内存态，也有一批微信云函数。多数功能遵循“本地 mock 先可用，满足云端条件后调用云函数，失败回退本地数据”的模式。

## 技术栈与运行环境

- 平台：微信小程序。
- 小程序入口：`app.js`、`app.json`、`app.wxss`。
- 云函数根目录：`cloudfunctions/`。
- 云开发环境 ID：`cloudbase-d9g83gcpddf0552fd`，在 `app.js` 里通过 `wx.cloud.init` 初始化。
- appid：`wx8ff3cd9004b80453`，见 `project.config.json`。
- 渲染配置：`app.json` 使用 `renderer: "skyline"`、`componentFramework: "glass-easel"`、`style: "v2"`。
- 导航：`app.json` 设置 `navigationStyle: "custom"`，页面通常使用自定义 `navigation-bar` 组件。
- 代码风格：CommonJS 为主，使用 `require` / `module.exports`。`.eslintrc.js` 配置了微信小程序全局变量，但没有启用强规则。

## 主要目录

- `pages/`：小程序页面，每个页面通常包含 `.js`、`.wxml`、`.wxss`、`.json` 四个文件。
- `components/`：可复用组件，例如自定义导航栏、首页卡片、档案区块、记忆入口等。
- `services/`：小程序端业务服务层，封装 mock 数据、本地状态、云函数调用与数据格式化。
- `mock/`：本地模拟数据，是未登录或未绑定时的主要数据来源。
- `utils/`：通用工具函数，例如时间、ID、纪念日、足迹、待办格式化。
- `cloudfunctions/`：微信云函数，每个云函数是独立目录，通常包含 `index.js` 和 `package.json`。

## 小程序页面结构

`app.json` 注册的主页面包括：

- Tab 页：
  - `pages/home/home`：首页。
  - `pages/hub/hub`：功能入口。
  - `pages/profile/profile`：我们/个人与情侣状态。
- 主要功能页：
  - `pages/mailbox/mailbox`、`pages/letter/letter`、`pages/mailbox-compose/mailbox-compose`、`pages/mailbox-drafts/mailbox-drafts`：信箱与信件。
  - `pages/album/album`、`pages/album-compose/album-compose`、`pages/album-drafts/album-drafts`：朋友圈/相册与草稿。
  - `pages/todo/todo`：共同待办。
  - `pages/anniversary/anniversary`、`pages/anniversary-detail/anniversary-detail`：纪念日。
  - `pages/footprint/footprint`：共同足迹。
  - `pages/daily-question/daily-question`、`pages/question-history/question-history`：每日问答与历史。
  - `pages/companion/companion`：陪伴功能，包含想你信号等。
  - `pages/mood/mood`：心情状态。
  - `pages/bucket-list/bucket-list`、`pages/checklist/checklist`：100 件事/清单。
  - `pages/capsule/capsule`：记忆胶囊。
  - `pages/couple-bind/couple-bind`：情侣绑定。
  - `pages/memory/memory`：记忆集合页。

`pages/function`、`pages/features`、`pages/tools` 等也存在，像是早期或备用的功能入口页。当前 `app.json` 没有注册这些页面，修改导航时要先确认是否仍在使用。

## 数据流与服务层约定

核心状态保存在 `services/local-state.js` 的内存对象中，初始数据来自 `mock/`。该状态不会自动持久化到本地缓存，刷新小程序运行态后会回到 mock 初始值，除非对应功能走云函数同步。

常见服务：

- `services/auth.js`：微信云登录、openid 保存、当前用户资料同步。
- `services/couple.js`：情侣绑定状态、邀请码生成、通过邀请码绑定。
- `services/relationship.js`：当前用户、伴侣、绑定状态的关系上下文。
- `services/mailbox.js`：信箱数据、发信、定时信、草稿、已读状态、订阅提醒状态。
- `services/moments.js`：朋友圈/相册动态、草稿、评论、位置与足迹联动。
- `services/todo.js`：待办列表、创建、完成状态切换、删除。
- `services/companion.js`：想你信号与陪伴模块数据。
- `services/question-daily.js`：每日问答、提交答案、AI 分析、历史记录。
- `services/footprint.js`：共同足迹页面数据、手动创建足迹、从动态创建足迹。
- `services/pending.js`：首页待处理事项聚合，例如未读信、想你信号、每日问答、今日待办。

服务层常见模式：

- 先判断云能力与业务条件，例如 `wx.cloud.callFunction` 是否存在、`session.isCloudLoggedIn === true`、情侣是否已绑定、`coupleId` 是否存在。
- 条件满足时调用云函数。
- 云函数成功后同步到 `local-state`。
- 云函数失败或条件不满足时返回本地 mock/内存数据。

## 登录与情侣绑定

登录链路：

1. `pages/profile/profile.js` 调用 `authService.loginWithWeChat()`。
2. `services/auth.js` 调用 `login` 云函数获取当前微信用户 `openid`。
3. 登录结果写入 `session`。
4. 再调用 `upsertCurrentUser` 云函数，由云端根据 `openid` 生成稳定唯一的真实 `userId`，并把用户资料同步到 `users` 集合。
5. 小程序端把本地占位身份 `me` 迁移为真实云端 `userId`，同时更新动态、信件、待办、状态等内存数据中的身份引用。

情侣绑定链路：

1. 已登录且用户资料同步后，`profile` 页可以生成邀请码。
2. `services/couple.js` 调用 `createCoupleInviteCode` 创建 pending 状态的 `couples` 记录。
3. 另一方在 `pages/couple-bind/couple-bind` 输入邀请码。
4. `bindCoupleByInviteCode` 更新 `couples` 与双方 `users` 记录。
5. `getCoupleBindingStatus` 负责刷新绑定状态，并把本地占位身份 `partner` 迁移为伴侣真实 `userId`。

注意：很多云端功能要求用户已登录、已同步用户资料、已绑定情侣关系。

### 当前身份修复状态

- 客户端不再向 `upsertCurrentUser` 指定 `userId`，避免两个真实账号都被创建成 `me`。
- `cloudfunctions/upsertCurrentUser` 使用 `openid` 的 SHA-256 摘要生成稳定唯一的 `usr_...` 用户 ID。
- 已有非占位 `userId` 的云端用户会继续保留原 ID。
- 本地登录成功后会迁移当前用户引用；绑定成功后会迁移伴侣引用。
- 微信真实登录后，个人页会隐藏仅用于本地 mock 调试的用户切换入口。
- 首页通过 `relationshipService` 获取当前用户和伴侣，不再硬编码查找 `me` / `partner`。

旧测试数据注意事项：

- 如果云数据库已有使用 `me` 或 `partner` 且已经绑定的旧用户，`upsertCurrentUser` 会返回 `legacy_identity_migration_required`，避免只迁移一半造成情侣数据损坏。
- 尚未正式使用时，建议清理旧测试用的 `users`、`couples` 及相关业务集合，再用两个真实微信账号重新测试。
- 如果旧数据需要保留，应编写一次性迁移脚本，同时更新所有集合中的用户引用。

## 云函数与云数据库

云函数目录均位于 `cloudfunctions/`，每个函数独立依赖 `wx-server-sdk`。部署时通常要在微信开发者工具中对对应函数执行“上传并部署：云端安装依赖”。

### 当前部署检查结论

截至 2026-06-10，本地代码检查结果：

- `project.config.json` 已配置 `cloudfunctionRoot: "cloudfunctions/"`。
- `app.js` 已初始化云环境 `cloudbase-d9g83gcpddf0552fd`。
- `login`、`upsertCurrentUser`、`createCoupleInviteCode`、`bindCoupleByInviteCode`、`getCoupleBindingStatus` 均有完整的 `index.js` 与 `package.json`。
- 上述云函数均使用 `cloud.DYNAMIC_CURRENT_ENV`，可以部署到当前选择的云环境。
- 云函数 JavaScript 语法与全部 `package.json` 已通过本地检查。
- 本机没有可读取微信云端部署状态的 CloudBase CLI，因此本地检查不能证明云端已经上传了最新版本。

身份修复后至少需要重新部署：

- `cloudfunctions/upsertCurrentUser`

首次真实双人测试前建议一并确认部署：

- `cloudfunctions/login`
- `cloudfunctions/createCoupleInviteCode`
- `cloudfunctions/bindCoupleByInviteCode`
- `cloudfunctions/getCoupleBindingStatus`
- `cloudfunctions/processScheduledLetters`

部署时在微信开发者工具中选择“上传并部署：云端安装依赖”。部署后使用两个真实微信账号验证登录、邀请码生成、绑定、重启后绑定状态恢复。

主要云函数分组：

- 登录与用户：
  - `login`
  - `upsertCurrentUser`
- 情侣绑定：
  - `createCoupleInviteCode`
  - `bindCoupleByInviteCode`
  - `getCoupleBindingStatus`
- 信箱：
  - `getMailboxPageData`
  - `getDraftById`
  - `saveDraft`
  - `removeDraft`
  - `sendLetterNow`
  - `sendLetterScheduled`
  - `processScheduledLetters`
  - `getLetterDetailOnOpen`
  - `sendLetterSubscribeNotice`
  - `updateLetterNoticeStatus`
- 动态/相册：
  - `getPostsFeed`
  - `publishPost`
  - `saveMomentDraft`
  - `getMomentDrafts`
  - `getMomentDraftById`
  - `removeMomentDraft`
  - `addPostComment`
- 足迹：
  - `getFootprintPageData`
  - `createFootprintManual`
  - `createFootprintFromPost`
- 待办：
  - `getTodos`
  - `createTodo`
  - `toggleTodoStatus`
  - `removeTodo`
- 想你信号：
  - `sendMissSignal`
  - `getMissSignalHistory`
  - `getLatestUnreadMissSignal`
  - `markMissSignalAsRead`
- 每日问答：
  - `getTodayQuestion`
  - `submitDailyAnswer`
  - `generateDailyAnalysis`
  - `getDailyQuestionHistory`
  - `markDailyQuestionResultViewed`

云函数中出现的主要集合：

- `users`
- `couples`
- `letters`
- `posts`
- `todos`
- `dailyQuestions`
- `missSignals`
- `footprints`

## 每日问答与 AI 分析

`cloudfunctions/generateDailyAnalysis` 会读取 `dailyQuestions` 中当天记录，并在双方都回答后生成分析。

它支持通过环境变量接入 OpenAI 或兼容接口：

- `OPENAI_API_KEY` 或 `AI_API_KEY`
- `OPENAI_BASE_URL` 或 `AI_BASE_URL`
- `OPENAI_MODEL` 或 `AI_MODEL`

未配置 API Key 时会使用本地 fallback 逻辑生成模拟分析，并把 `analysisProvider` 标记为 `mock`。

## 信箱与订阅消息

信箱功能支持：

- 立即发送。
- 定时发送。
- 草稿保存。
- 已读/未读状态。
- 站外订阅消息提醒。

定时信投递：

- `cloudfunctions/sendLetterScheduled` 会校验 `visibleAt` 必须是合法未来时间。
- `cloudfunctions/processScheduledLetters` 配置了每分钟执行一次的定时触发器。
- 到期信件会从 `scheduled` 幂等更新为 `delivered`，并记录 `deliveredAt`、`deliveryClaimedAt`。
- 定时任务通过仅更新仍为 `scheduled` 且已经到期的记录，避免重复投递。
- `getMailboxPageData` 和 `getLetterDetailOnOpen` 会对接收方隐藏未到期信件的标题、正文和图片；发信方仍可查看自己定时发送的内容。

部署定时投递时，需要：

- 创建或确认 `letters` 集合。
- 为 `letters` 建立 `status + visibleAt` 组合索引。
- 部署 `processScheduledLetters` 云函数，并确认其定时触发器已创建。
- 在 CloudBase 控制台的云函数日志中确认每分钟执行成功。

当前定时任务只负责到期投递，不负责站外订阅消息发送。站外提醒需要先完成正确的接收方订阅授权设计。

`CLOUD_SETUP.md` 说明了订阅消息接入状态。当前需要注意：

- `pages/mailbox-compose/mailbox-compose.js`
- `cloudfunctions/sendLetterSubscribeNotice/index.js`

这两个位置可能还有订阅消息模板 ID 占位值 `REPLACE_WITH_LETTER_NOTICE_TEMPLATE_ID`，上线前需要替换成真实模板 ID，并确认模板字段名与云函数里的 `thing1`、`name2`、`time3`、`thing4` 匹配。

## UI 与组件约定

- 页面使用微信小程序原生 `Page` / `Component`。
- 页面 JSON 中通过 `usingComponents` 引入组件。
- 自定义导航栏组件位于 `components/navigation-bar/`，适配胶囊按钮、安全区与返回事件。
- 共享卡片组件位于 `components/common-card/`。
- 首页使用多个模块组件，例如 `home-love-days`、`home-anniversary`、`home-pending-actions`、`home-miss-button`、`home-couple-question`。
- 组件与页面样式使用 `.wxss`，项目未使用 npm 前端构建链。

## 云存储图片

图片上传统一通过 `services/cloud-storage.js`：

- 本地临时图片会通过 `wx.cloud.uploadFile` 上传到当前云环境。
- 已经是 `cloud://`、`http://` 或 `https://` 的图片地址会直接复用，避免重复上传。
- 云存储路径按业务、用户、年月组织，例如 `moments/{userId}/2026/06/...jpg`。
- 当前已接入头像、动态/相册草稿与发布、信件草稿与发送、纪念日封面。
- 云数据库应保存上传后返回的 `fileID`，不要保存 `wx.chooseImage` 返回的临时路径。
- 删除业务数据时尚未自动清理无引用云文件，后续需要补充文件清理策略。

## 开发注意事项

- 不要假设所有功能都已经完全云端化。很多服务仍以 `mock/` 和 `services/local-state.js` 为基础。
- 新增图片选择功能时，应在写入云数据库前调用 `services/cloud-storage.js`，保证另一台设备可以访问图片。
- 修改业务逻辑时，优先在对应 `services/` 中改数据与云函数衔接，页面层尽量只处理交互和展示。
- 新增云函数后，需要：
  - 在 `cloudfunctions/` 下新增独立目录。
  - 准备 `package.json`，依赖一般包含 `wx-server-sdk`。
  - 在微信开发者工具中部署。
  - 小程序端通过 `wx.cloud.callFunction` 调用。
- 涉及情侣双人数据的功能，通常要检查：
  - 当前用户是否有 `openid`。
  - 当前用户是否存在于 `users` 集合。
  - 当前用户是否有 `coupleId`。
  - `couples` 是否能找到另一方用户。
- 修改页面路由时，要同步检查 `app.json`、tabBar、功能入口页和 `wx.navigateTo` / `wx.switchTab`。
- `project.config.json` 中 `es6`、`postcss`、`swc` 等构建增强配置多为关闭状态，写代码时保持微信小程序原生兼容风格。
- 当前没有发现统一的自动化测试或 npm 脚本。验证主要依赖微信开发者工具运行、页面手测和云函数部署后联调。

## 适合后续补充的内容

- 云数据库集合字段规范。
- 各页面的详细交互流程。
- 云函数部署清单与部署顺序。
- 本地 mock 数据与云端数据的映射关系。
- 订阅消息模板 ID 与字段配置。
