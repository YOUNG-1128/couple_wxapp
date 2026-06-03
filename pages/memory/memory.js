const memoryMock = require('../../mock/memory')

Page({
  data: memoryMock,

  onFootprintTap() {
    wx.navigateTo({
      url: '/pages/footprint/footprint'
    })
  },

  onAlbumTap() {
    wx.navigateTo({
      url: '/pages/album/album'
    })
  },

  onCapsuleTap() {
    wx.navigateTo({
      url: '/pages/capsule/capsule'
    })
  },
})
