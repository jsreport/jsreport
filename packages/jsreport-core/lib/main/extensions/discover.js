const path = require('path')
const locationCache = require('./locationCache')

module.exports = async (config) => {
  const cache = locationCache(config)

  config.logger.info(`Searching for available extensions in ${config.rootDirectory}`)

  const results = await cache.get()
  config.logger.info(`Found ${results.length} extension(s)`)

  const availableExtensions = results.map((configFile) => (
    Object.assign({
      directory: path.dirname(configFile)
    }, require(configFile))
  ))

  await cache.save(availableExtensions)
  return availableExtensions
}
