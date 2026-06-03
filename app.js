App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloudbase-d9g83gcpddf0552fd',
        traceUser: true
      })
    }
  }
})
