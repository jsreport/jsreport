const Request = require('../../shared/request')

module.exports = async (reporter) => {
  if (
    reporter.options.migrateXlsxTemplatesToAssets === false ||
    reporter.documentStore.collection('xlsxTemplates') == null ||
    reporter.documentStore.collection('assets') == null
  ) {
    return
  }

  const migrated = await reporter.settings.findValue('core-migrated-xlsxTemplates')

  if (migrated) {
    return
  }

  const req = Request({})
  await reporter.documentStore.beginTransaction(req)

  try {
    const xlsxTemplateIds = await reporter.documentStore.collection('xlsxTemplates').find({}, { _id: 1 }, req)

    if (xlsxTemplateIds.length !== 0) {
      reporter.logger.debug('Running migration "xlsxTemplatesToAssets"')
    }

    const xlsxTemplateToAssetMap = new Map()

    for (const xlsxTemplateId of xlsxTemplateIds) {
      const xlsxTemplate = await reporter.documentStore.collection('xlsxTemplates').findOne({ _id: xlsxTemplateId._id }, req)

      if (!xlsxTemplateToAssetMap.has(xlsxTemplate.shortid)) {
        let newAsset
        let tryCount = 0

        while (newAsset == null) {
          try {
            const assetName = `${'_'.repeat(tryCount) + xlsxTemplate.name}.xlsx`

            const assetProps = {
              name: assetName,
              content: xlsxTemplate.contentRaw,
              folder: xlsxTemplate.folder || null
            }

            if (xlsxTemplate.readPermissions != null) {
              assetProps.readPermissions = xlsxTemplate.readPermissions
            }

            if (xlsxTemplate.editPermissions != null) {
              assetProps.editPermissions = xlsxTemplate.editPermissions
            }

            newAsset = await reporter.documentStore.collection('assets').insert(assetProps, req)
          } catch (insertError) {
            tryCount++

            if (insertError.code === 'DUPLICATED_ENTITY') {
              continue
            } else {
              throw insertError
            }
          }
        }

        xlsxTemplateToAssetMap.set(xlsxTemplate.shortid, newAsset)
      }
    }

    const templateIds = await reporter.documentStore.collection('templates').find({}, { _id: 1 }, req)

    for (const templateId of templateIds) {
      const template = await reporter.documentStore.collection('templates').findOne({ _id: templateId._id }, req)
      let continueUpdate = false

      // handle jsreport-xlsx migration
      if (template.xlsxTemplate != null) {
        continueUpdate = true

        const xlsxTemplateRef = template.xlsxTemplate

        template.xlsxTemplate = null

        if (xlsxTemplateRef.shortid != null && xlsxTemplateToAssetMap.has(xlsxTemplateRef.shortid)) {
          template.xlsx = template.xlsx || {}
          template.xlsx.templateAssetShortid = xlsxTemplateToAssetMap.get(xlsxTemplateRef.shortid).shortid
        }
      }

      // handle jsreport-html-to-xlsx migration
      if (template.baseXlsxTemplate != null) {
        continueUpdate = true

        const baseXlsxTemplateRef = template.baseXlsxTemplate

        template.baseXlsxTemplate = null

        if (baseXlsxTemplateRef.shortid != null && xlsxTemplateToAssetMap.has(baseXlsxTemplateRef.shortid)) {
          template.htmlToXlsx = template.htmlToXlsx || {}
          template.htmlToXlsx.templateAssetShortid = xlsxTemplateToAssetMap.get(baseXlsxTemplateRef.shortid).shortid
        }
      }

      if (continueUpdate) {
        await reporter.documentStore.collection('templates').update({ _id: template._id }, { $set: template }, req)
      }
    }

    for (const xlsxTemplateId of xlsxTemplateIds) {
      await reporter.documentStore.collection('xlsxTemplates').remove({ _id: xlsxTemplateId._id }, req)
    }

    if (xlsxTemplateIds.length !== 0) {
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
