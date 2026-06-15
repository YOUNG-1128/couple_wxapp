const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const pages = ['album', 'mailbox', 'todo', 'footprint']

test('统一页面状态组件提供加载、错误和重试入口', () => {
  const componentWxml = fs.readFileSync(path.join(__dirname, '../components/async-page-state/async-page-state.wxml'), 'utf8')
  const componentJs = fs.readFileSync(path.join(__dirname, '../components/async-page-state/async-page-state.js'), 'utf8')

  assert.match(componentWxml, /mode === 'loading'/)
  assert.match(componentWxml, /mode === 'error'/)
  assert.match(componentWxml, /bindtap="onRetry"/)
  assert.match(componentJs, /triggerEvent\('retry'\)/)
})

test('高频数据页统一接入加载失败与重试状态', () => {
  pages.forEach((pageName) => {
    const pageJs = fs.readFileSync(path.join(__dirname, `../pages/${pageName}/${pageName}.js`), 'utf8')
    const pageWxml = fs.readFileSync(path.join(__dirname, `../pages/${pageName}/${pageName}.wxml`), 'utf8')
    const pageJson = fs.readFileSync(path.join(__dirname, `../pages/${pageName}/${pageName}.json`), 'utf8')

    assert.match(pageJs, /pageState:/)
    assert.match(pageJs, /onRetryLoad\(\)/)
    assert.match(pageWxml, /<async-page-state/)
    assert.match(pageWxml, /bind:retry="onRetryLoad"/)
    assert.match(pageJson, /async-page-state/)
  })
})

test('动态分页失败后提供页面内重试入口', () => {
  const pageJs = fs.readFileSync(path.join(__dirname, '../pages/album/album.js'), 'utf8')
  const pageWxml = fs.readFileSync(path.join(__dirname, '../pages/album/album.wxml'), 'utf8')

  assert.match(pageJs, /loadMoreFailed:/)
  assert.match(pageJs, /onRetryLoadMore\(\)/)
  assert.match(pageWxml, /onRetryLoadMore/)
})
