const MAX_FOOTPRINT_IMAGE_COUNT = 4

function appendFootprintImages(current = [], selected = []) {
  return current.concat(selected).slice(0, MAX_FOOTPRINT_IMAGE_COUNT)
}

function removeFootprintImage(images = [], index) {
  return images.filter((_, itemIndex) => itemIndex !== Number(index))
}

module.exports = {
  MAX_FOOTPRINT_IMAGE_COUNT,
  appendFootprintImages,
  removeFootprintImage
}
