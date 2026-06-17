# 足迹地图联动设计

## 目标

在不新增平台权限、不改云数据库结构、不调整云函数的前提下，增强足迹页的地图与列表联动体验，让当前“城市级足迹”更接近真实地图浏览感。

本次范围只覆盖：

- 点击地图 `marker` 切换到对应城市足迹列表
- 点击足迹卡片后地图移动到该足迹位置
- 自动高亮当前足迹和其所在城市

不包含：

- 地点级 POI 选择
- 真实地址解析
- 新的地图权限申请
- 云端数据结构改造

## 现状

- 足迹页已经使用微信 `map` 组件展示城市级 marker。
- `activeCity` 已经能够驱动列表筛选。
- 每条足迹已经具备 `latitude` / `longitude` / `city` 等展示所需数据。
- 当前缺口是地图与列表之间缺少双向联动和清晰的选中反馈。

## 交互设计

### 1. 点击 marker

- 读取 `markerId -> city` 映射。
- 将该城市设置为当前 `activeCity`。
- 列表切换为该城市下的足迹。
- 清空 `selectedFootprintId`，避免在切换城市后仍然保留旧足迹高亮。
- 被点击城市对应的 marker 进入高亮态。

### 2. 点击足迹卡片

- 读取该足迹的经纬度与城市。
- 将地图中心移动到该足迹位置。
- 将该足迹所在城市设置为当前 `activeCity`。
- 设置 `selectedFootprintId` 为当前足迹。
- 当前足迹卡片进入高亮态。
- 当前城市对应 marker 进入高亮态。

### 3. 查看全部

- 保持现有 `onViewAll` 行为，恢复全部列表。
- 清空 `selectedFootprintId`。
- marker 恢复默认态。

## 视觉反馈

- 当前选中的足迹卡片增加浅色背景、边框或阴影高亮。
- 当前城市 marker 与默认 marker 使用不同视觉样式：
  - 高亮 marker 更大
  - 高亮 marker 颜色更醒目
- 不引入复杂动画，只使用现有页面风格的轻量强调。

## 实现方案

### 页面层状态

在 `pages/footprint/footprint.js` 新增：

- `selectedFootprintId`
- 根据当前 `activeCity` / `selectedFootprintId` 派生 marker 高亮与卡片高亮

### 工具层

在 `utils/footprint.js` 中扩展 marker 构建逻辑：

- 支持传入当前高亮城市
- 为高亮 marker 返回不同尺寸和 callout 样式

### 模板层

在 `pages/footprint/footprint.wxml` 中：

- 给足迹卡片增加点击事件
- 根据 `selectedFootprintId` 应用高亮 class

### 样式层

在 `pages/footprint/footprint.wxss` 中：

- 增加卡片高亮样式
- 保持现有柔和色系，不新增突兀视觉语言

## 错误与边界处理

- 如果足迹没有有效经纬度，点击卡片时不移动地图，但仍可切换到该城市并高亮卡片。
- 如果 marker 映射不到城市，则忽略点击。
- 如果当前城市没有相关足迹，保留现有空状态提示。

## 测试策略

- 单元测试：
  - marker 高亮逻辑
  - 切换城市时选中足迹是否清空
  - 选中足迹时是否同步选中所属城市
- UI 结构测试：
  - 足迹卡片存在选中态 class
  - 地图仍保留 `bindmarkertap`
- 手工验证：
  - 点击 marker 后列表正确切换
  - 点击足迹卡片后地图中心变化
  - “查看全部”后恢复默认状态
