# Opening Onboarding And Relationship Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将登录、情侣邀请/加入和共享恋爱开始日融入首页开场动画，并动态展示真实恋爱天数。

**Architecture:** 使用纯逻辑工具模块负责日期与动画状态选择；`services/couple.js` 维护共享情侣资料；云函数负责按 openid 鉴权读取和更新 `couples`；首页作为状态驱动的动画交互容器。

**Tech Stack:** 微信小程序原生 Page/WXML/WXSS、CommonJS、微信云函数、Node `assert`。

---

### Task 1: 关系日期与动画状态逻辑

**Files:**
- Create: `utils/relationship.js`
- Create: `tests/relationship.test.js`

- [ ] 先写日期校验、天数计算、模式选择的失败测试。
- [ ] 运行 `node tests/relationship.test.js` 确认失败。
- [ ] 实现最小纯逻辑函数并重新运行测试。

### Task 2: 情侣共享开始日云端能力

**Files:**
- Modify: `services/local-state.js`
- Modify: `services/couple.js`
- Modify: `cloudfunctions/getCoupleBindingStatus/index.js`
- Modify: `cloudfunctions/createCoupleInviteCode/index.js`
- Modify: `cloudfunctions/bindCoupleByInviteCode/index.js`
- Create: `cloudfunctions/updateRelationshipStartDate/index.js`
- Create: `cloudfunctions/updateRelationshipStartDate/package.json`

- [ ] 将共享开始日、绑定时间同步到客户端 session。
- [ ] 扩展绑定状态云函数返回共享资料。
- [ ] 新增带 openid 与情侣归属校验的日期更新云函数。

### Task 3: 首页互动式开场流程

**Files:**
- Modify: `pages/home/home.js`
- Modify: `pages/home/home.wxml`
- Modify: `pages/home/home.wxss`

- [ ] 用关系状态选择 `solo / profile / inviting / joining / just-connected / choose-start-date / story`。
- [ ] 在动画中接入登录、资料跳过、生成邀请、输入邀请码、复制邀请码和刷新状态。
- [ ] 接入日期选择与保存，并动态刷新首页恋爱天数。
- [ ] 保留已有每日开场和用户未提交样式改动。

### Task 4: 验证

**Files:**
- Verify all changed JavaScript and cloud function packages.

- [ ] 运行 `node tests/relationship.test.js`。
- [ ] 对客户端及云函数执行 `node --check`。
- [ ] 检查 git diff，确认未覆盖无关改动。
