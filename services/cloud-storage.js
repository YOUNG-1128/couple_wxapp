function canUpload() {
  return Boolean(
    typeof wx !== 'undefined'
    && wx.cloud
    && typeof wx.cloud.uploadFile === 'function'
  )
}

function isRemoteFile(path) {
  return /^(cloud|https?):\/\//i.test(String(path || ''))
}

function getFileExtension(path) {
  const cleanPath = String(path || '').split('?')[0]
  const match = cleanPath.match(/\.([a-zA-Z0-9]{1,8})$/)

  return match ? match[1].toLowerCase() : 'jpg'
}

function sanitizeSegment(value, fallback) {
  const sanitized = String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 48)

  return sanitized || fallback
}

function createCloudPath(localPath, options = {}) {
  const category = sanitizeSegment(options.category, 'uploads')
  const ownerId = sanitizeSegment(options.ownerId, 'anonymous')
  const extension = getFileExtension(localPath)
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const nonce = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

  return `${category}/${ownerId}/${year}/${month}/${nonce}.${extension}`
}

function uploadFile(localPath, options = {}) {
  if (!localPath || isRemoteFile(localPath) || !canUpload()) {
    return Promise.resolve(localPath)
  }

  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath: createCloudPath(localPath, options),
      filePath: localPath,
      success: (result) => {
        if (!result || !result.fileID) {
          reject(new Error('cloud_file_id_missing'))
          return
        }

        resolve(result.fileID)
      },
      fail: reject
    })
  })
}

function uploadFiles(paths = [], options = {}) {
  const list = Array.isArray(paths) ? paths : []

  return Promise.all(list.map((path) => uploadFile(path, options)))
}

module.exports = {
  canUpload,
  isRemoteFile,
  uploadFile,
  uploadFiles
}
