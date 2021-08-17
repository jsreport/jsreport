
const path = require('path')
const config = require('../jsreport.config.js')

module.exports = (options) => {
  const newConfig = { ...config }
  newConfig.options = options
  newConfig.directory = path.join(__dirname, '../')
  return newConfig
}
