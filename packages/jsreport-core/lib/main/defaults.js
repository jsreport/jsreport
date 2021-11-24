const os = require('os')
const path = require('path')

exports.getDefaultTempDirectory = () => {
  return path.join(os.tmpdir(), 'jsreport')
}

exports.getDefaultRootDirectory = () => {
  return path.join(__dirname, '../../../../../')
}

exports.getDefaultLoadConfig = () => {
  return false
}
