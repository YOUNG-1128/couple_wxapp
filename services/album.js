const albumMock = require('../mock/album')

function getAlbumData() {
  return albumMock
}

function getPhotoById(id) {
  return albumMock.photos.find((photo) => photo.id === id)
}

function createPhotoRecord(photo) {
  albumMock.photos.unshift(photo)

  return photo
}

function updatePhotoRecord(id, patch) {
  const photo = getPhotoById(id)

  if (!photo) {
    return null
  }

  Object.assign(photo, patch)

  return photo
}

module.exports = {
  getAlbumData,
  getPhotoById,
  createPhotoRecord,
  updatePhotoRecord
}
