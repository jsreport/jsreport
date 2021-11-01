const path = require('path')
const fs = require('fs/promises')
const fileUtils = require('./fileUtils')

module.exports = (config) => {
  // we want to have as cache entry the node_modules folder
  const cacheEntryRootPath = path.join(__dirname, '../../../../../')
  const pathToLocationCache = path.join(config.tempCoreDirectory, 'locations.json')

  return {
    async get () {
      if (process.env.NODE_ENV === 'jsreport-development' || config.useExtensionsLocationCache === false) {
        config.logger.info('Skipping extensions location cache when NODE_ENV=jsreport-development or when option useExtensionsLocationCache === false, crawling now')

        return fileUtils.walkSync(config.rootDirectory, 'jsreport.config.js')
      }

      try {
        await fs.stat(pathToLocationCache)
      } catch (e) {
        config.logger.info('Extensions location cache not found, crawling directories')
        return fileUtils.walkSync(config.rootDirectory, 'jsreport.config.js')
      }

      const content = await fs.readFile(pathToLocationCache, 'utf8')

      let cache

      try {
        cache = JSON.parse(content)[cacheEntryRootPath]
      } catch (e) {
        // file is corrupted, never mind and crawl the extensions
      }

      if (!cache) {
        config.logger.info('Extensions location cache doesn\'t contain entry yet, crawling')
        return fileUtils.walkSync(config.rootDirectory, 'jsreport.config.js')
      }

      if (cache.rootDirectory !== config.rootDirectory) {
        config.logger.info(`Extensions location cache ${pathToLocationCache} contains information with different rootDirectory, crawling`)
        return fileUtils.walkSync(config.rootDirectory, 'jsreport.config.js')
      }

      const stat = await fs.stat(cacheEntryRootPath)

      if (stat.mtime.getTime() > cache.lastSync) {
        config.logger.info(`Extensions location cache ${pathToLocationCache} contains older information, crawling`)
        return fileUtils.walkSync(config.rootDirectory, 'jsreport.config.js')
      }

      await Promise.all(cache.locations.map((l) => fs.stat(l)))

      config.logger.info(`Extensions location cache contains up to date information, skipping crawling in ${config.rootDirectory}`)

      // since the rootDirectory is dynamic (can be changed from options) we need to still
      // crawl to see if we find new extensions if the rootDirectory was changed
      const directories = fileUtils.walkSync(config.rootDirectory, 'jsreport.config.js', cacheEntryRootPath)
      const result = directories.concat(cache.locations)

      return result
    },

    async save (extensions) {
      // we just want to store in cache the extensions found from the cache entry root path
      // or in other words the ones from node_modules, we skip storing the extensions found
      // in the rootDirectory
      const directories = (
        extensions
          .map((e) => path.join(e.directory, 'jsreport.config.js'))
          .filter((d) => d.startsWith(cacheEntryRootPath))
      )

      await fs.mkdir(config.tempCoreDirectory, { recursive: true })

      try {
        await fs.stat(pathToLocationCache)
      } catch (e) {
        await fs.writeFile(pathToLocationCache, JSON.stringify({}), 'utf8')
      }

      const content = await fs.readFile(pathToLocationCache, 'utf8')

      let nodes = {}

      try {
        nodes = JSON.parse(content)
      } catch (e) {
        // file is corrupted, never mind and override all
      }

      nodes[cacheEntryRootPath] = {
        rootDirectory: config.rootDirectory,
        locations: directories,
        lastSync: new Date().getTime()
      }

      config.logger.debug(`Writing extension locations cache to ${pathToLocationCache}`)

      return fs.writeFile(pathToLocationCache, JSON.stringify(nodes), 'utf8')
    }
  }
}
