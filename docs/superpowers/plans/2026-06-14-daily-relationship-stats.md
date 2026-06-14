# Daily Relationship Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将个人页固定的三项状态统计升级为每天稳定变化、优先展示有数据结果的情侣关系小报告。

**Architecture:** 新增纯函数统计工具，从现有本地状态构建分为亮点、近况、倒计时的统计池，并按日期确定性选择每类一项。`services/stats.js` 只负责收集当前状态并调用工具，组件继续只负责展示三张卡片。

**Tech Stack:** 微信小程序原生组件、CommonJS、Node.js 内置测试运行器。

---

### Task 1: 构建统计池与每日选择器

**Files:**
- Create: `utils/relationship-stats.js`
- Create: `tests/relationshipStats.test.js`

- [ ] 先写测试，验证统计池不少于 20 项、覆盖三个类别、优先非零，并且同一天结果稳定。
- [ ] 运行 `node --test tests/relationshipStats.test.js`，确认因工具不存在而失败。
- [ ] 实现统计池、周范围计算、倒计时计算和按日期确定性选择。
- [ ] 再次运行测试并确认通过。

### Task 2: 接入个人页

**Files:**
- Modify: `services/stats.js`
- Modify: `components/profile-status-stats/profile-status-stats.wxml`
- Modify: `tests/profileStatusStats.test.js`

- [ ] 更新回归测试，验证服务使用完整本地状态生成每日三项报告。
- [ ] 运行测试并确认旧固定统计实现失败。
- [ ] 接入统计工具，将标题更新为“我们的今日小报告”。
- [ ] 运行 `node --test tests/*.test.js`、语法检查和 `git diff --check`。
- [ ] 单独提交并推送当前分支。
