const Request = require('../../shared/request')

module.exports = async (reporter) => {
  if (reporter.options.migrateXlsxTemplatesToAssets === false) {
    return
  }

  const migrated = await reporter.settings.findValue('core-migrated-xlsxTemplates')

  if (migrated) {
    return
  }

  const req = Request({})
  await reporter.documentStore.beginTransaction(req)

  try {
    const xlsxTemplates = await reporter.documentStore.collection('xlsxTemplates').find({}, req)

    if (xlsxTemplates.length !== 0) {
      reporter.logger.debug('Running migration "xlsxTemplatesToAssets"')
    }

    const xlsxTemplateToAssetMap = new Map()

    for (const xlsxTemplate of xlsxTemplates) {
      let newAsset
      let tryCount = 0

      while (newAsset == null) {
        try {
          const assetName = `${'_'.repeat(tryCount) + xlsxTemplate.name}.xlsx`

          newAsset = await reporter.documentStore.collection('assets').insert({
            name: assetName,
            content: xlsxTemplate.contentRaw,
            folder: xlsxTemplate.folder || null
          }, req)
        } catch (insertError) {
          tryCount++

          if (insertError.code === 'DUPLICATED_ENTITY') {
            continue
          } else {
            throw insertError
          }
        }
      }

      xlsxTemplateToAssetMap.set(xlsxTemplate.shortid, newAsset.shortid)

      await reporter.documentStore.collection('xlsxTemplates').remove({ _id: xlsxTemplate._id }, req)
    }

    const templates = await reporter.documentStore.collection('templates').find({}, req)

    for (const template of templates) {
      let continueUpdate = false

      // handle jsreport-xlsx migration
      if (template.xlsxTemplate != null) {
        continueUpdate = true

        const xlsxTemplateRef = template.xlsxTemplate

        template.xlsxTemplate = null

        if (xlsxTemplateRef.shortid != null && xlsxTemplateToAssetMap.has(xlsxTemplateRef.shortid)) {
          template.xlsx = template.xlsx || {}
          template.xlsx.templateAssetShortid = xlsxTemplateToAssetMap.get(xlsxTemplateRef.shortid)
        }
      }

      // handle jsreport-html-to-xlsx migration
      if (template.baseXlsxTemplate != null) {
        continueUpdate = true

        const baseXlsxTemplateRef = template.baseXlsxTemplate

        template.baseXlsxTemplate = null

        if (baseXlsxTemplateRef.shortid != null && xlsxTemplateToAssetMap.has(baseXlsxTemplateRef.shortid)) {
          template.htmlToXlsx = template.htmlToXlsx || {}
          template.htmlToXlsx.templateAssetShortid = xlsxTemplateToAssetMap.get(baseXlsxTemplateRef.shortid)
        }
      }

      if (continueUpdate) {
        await reporter.documentStore.collection('templates').update({ _id: template._id }, { $set: template }, req)
      }
    }

    if (xlsxTemplates.length !== 0) {
      reporter.logger.debug('Migration "xlsxTemplatesToAssets" finished')
    }

    await reporter.documentStore.commitTransaction(req)

    await reporter.settings.addOrSet('core-migrated-xlsxTemplates', true)
  } catch (migrationErr) {
    await reporter.documentStore.rollbackTransaction(req)

    migrationErr.message = `Migration "xlsxTemplatesToAssets" failed: ${migrationErr.message}`

    throw migrationErr
  }
}
