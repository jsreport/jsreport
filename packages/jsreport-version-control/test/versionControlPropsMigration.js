const path = require('path')
const fs = require('fs/promises')

module.exports = function (reporter) {
  reporter.documentStore.internalAfterInitListeners.add('test-migration-version-control-props', async () => {
    const aProps = JSON.parse(await fs.readFile(path.join(__dirname, './migration/a/config.json'), 'utf8'))
    aProps.content = await fs.readFile(path.join(__dirname, './migration/a/content.html'), 'utf8')

    delete aProps.creationDate
    delete aProps.modificationDate
    delete aProps.$entitySet

    await reporter.documentStore.collection('templates').insert(aProps)

    const bProps = JSON.parse(await fs.readFile(path.join(__dirname, './migration/b/config.json'), 'utf8'))
    bProps.content = await fs.readFile(path.join(__dirname, './migration/b/content.html'), 'utf8')

    delete bProps.creationDate
    delete bProps.modificationDate
    delete bProps.$entitySet

    await reporter.documentStore.collection('templates').insert(bProps)

    const rawVersions = (await fs.readFile(path.join(__dirname, './migration/versions'), 'utf8')).split('\n')

    for (const rawVersion of rawVersions) {
      if (rawVersion == null || rawVersion === '') {
        continue
      }

      const version = JSON.parse(rawVersion)

      delete version.creationDate
      delete version.modificationDate
      delete version.$entitySet

      await reporter.documentStore.collection('versions').insert(version)
    }
  })
}
