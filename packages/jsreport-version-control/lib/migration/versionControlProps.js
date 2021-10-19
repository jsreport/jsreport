const { customAlphabet } = require('nanoid')
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

module.exports = async (reporter) => {
  if (reporter.options.migrateVersionControlProps === false) {
    return
  }

  const migrated = await reporter.settings.findValue('core-migrated-versionControl-props')

  if (migrated) {
    return
  }

  const req = reporter.Request({})
  await reporter.documentStore.beginTransaction(req)

  try {
    const versionIds = await reporter.documentStore.collection('versions').find({}, { _id: 1 }, req)

    if (versionIds.length !== 0) {
      reporter.logger.debug('Running migration "versionControlProps"')
    }

    for (const versionId of versionIds) {
      const version = await reporter.documentStore.collection('versions').findOne({ _id: versionId._id }, req)

      if (!Array.isArray(version.changes)) {
        continue
      }

      const changesForBlob = version.changes
      const blobName = `versions/${version.message.replace(/[^a-zA-Z0-9]/g, '')}${nanoid()}.json`

      await reporter.blobStorage.write(blobName, Buffer.from(JSON.stringify(changesForBlob)))

      version.blobName = blobName
      version.changes = null

      await reporter.documentStore.collection('versions').update({ _id: versionId._id }, { $set: version }, req)
    }

    if (versionIds.length !== 0) {
      reporter.logger.debug('Migration "versionControlProps" finished')
    }

    await reporter.documentStore.commitTransaction(req)

    await reporter.settings.addOrSet('core-migrated-versionControl-props', true)
  } catch (migrationErr) {
    await reporter.documentStore.rollbackTransaction(req)

    migrationErr.message = `Migration "versionControlProps" failed: ${migrationErr.message}`

    throw migrationErr
  }
}
