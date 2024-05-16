
const missingSecretMessage = 'pdf-sign extension uses encryption to store sensitive data and needs secret key to be defined. Please fill "encryption.secretKey" at the root of the config or disable encryption using "encryption.enabled=false".'

module.exports = (reporter, definition) => {
  reporter.documentStore.registerComplexType('PdfOperationType', {
    templateShortid: { type: 'Edm.String', referenceTo: 'templates' },
    type: { type: 'Edm.String' },
    mergeToFront: { type: 'Edm.Boolean' },
    renderForEveryPage: { type: 'Edm.Boolean' },
    mergeWholeDocument: { type: 'Edm.Boolean' },
    enabled: { type: 'Edm.Boolean' }
  })

  reporter.documentStore.registerComplexType('PdfMetaType', {
    title: { type: 'Edm.String' },
    author: { type: 'Edm.String' },
    subject: { type: 'Edm.String' },
    keywords: { type: 'Edm.String' },
    creator: { type: 'Edm.String' },
    producer: { type: 'Edm.String' },
    language: { type: 'Edm.String' },
    custom: { type: 'Edm.String' }
  })

  reporter.documentStore.registerComplexType('PdfAType', {
    enabled: { type: 'Edm.Boolean' }
  })

  reporter.documentStore.registerComplexType('PdfAccessibility', {
    enabled: { type: 'Edm.Boolean' },
    pdfUA: { type: 'Edm.Boolean' }
  })

  reporter.documentStore.registerComplexType('PdfPasswordType', {
    password: { type: 'Edm.String' },
    ownerPassword: { type: 'Edm.String' },
    printing: { type: 'Edm.String', schema: { type: 'null' } },
    modifying: { type: 'Edm.Boolean' },
    copying: { type: 'Edm.Boolean' },
    annotating: { type: 'Edm.Boolean' },
    fillingForms: { type: 'Edm.Boolean' },
    contentAccessibility: { type: 'Edm.Boolean' },
    documentAssembly: { type: 'Edm.Boolean' }
  })

  reporter.documentStore.registerComplexType('PdfSignTemplateType', {
    certificateAssetShortid: { type: 'Edm.String', referenceTo: 'assets', schema: { type: 'null' } },
    reason: { type: 'Edm.String' }
  })

  if (reporter.documentStore.model.entityTypes.TemplateType) {
    reporter.documentStore.model.entityTypes.TemplateType.pdfOperations = { type: 'Collection(jsreport.PdfOperationType)' }
    reporter.documentStore.model.entityTypes.TemplateType.pdfMeta = { type: 'jsreport.PdfMetaType', schema: { type: 'null' } }
    reporter.documentStore.model.entityTypes.TemplateType.pdfA = { type: 'jsreport.PdfAType', schema: { type: 'null' } }
    reporter.documentStore.model.entityTypes.TemplateType.pdfPassword = { type: 'jsreport.PdfPasswordType', schema: { type: 'null' } }
    reporter.documentStore.model.entityTypes.TemplateType.pdfSign = { type: 'jsreport.PdfSignTemplateType', schema: { type: 'null' } }
    reporter.documentStore.model.entityTypes.TemplateType.pdfAccessibility = { type: 'jsreport.PdfAccessibility', schema: { type: 'null' } }
  }

  reporter.documentStore.on('before-init', () => {
    if (reporter.documentStore.model.entityTypes.AssetType) {
      reporter.documentStore.registerComplexType('PdfSignAssetType', {
        passwordRaw: { type: 'Edm.String', visible: false },
        passwordSecure: { type: 'Edm.String', encrypted: true, visible: false },
        passwordFilled: { type: 'Edm.Boolean' }
      })

      reporter.documentStore.model.entityTypes.AssetType.pdfSign = { type: 'jsreport.PdfSignAssetType' }
    }
  })

  reporter.initializeListeners.add('pdf-utils', async (req, res) => {
    if (reporter.documentStore.collection('assets') == null) {
      return
    }

    reporter.documentStore.collection('assets').beforeInsertListeners.add('pdf-sign', async (doc, req) => {
      if (!doc.pdfSign || !doc.pdfSign.passwordRaw) {
        return
      }

      try {
        doc.pdfSign.passwordSecure = await reporter.encryption.encrypt(doc.pdfSign.passwordRaw)
      } catch (e) {
        if (e.encryptionNoSecret) {
          e.message = missingSecretMessage
        }

        throw e
      }

      doc.pdfSign.passwordRaw = null
      doc.pdfSign.passwordFilled = true
    })

    reporter.documentStore.collection('assets').beforeUpdateListeners.add('pdf-sign', async (q, u, req) => {
      if (!u.$set.pdfSign || !u.$set.pdfSign.passwordRaw) {
        return
      }

      try {
        u.$set.pdfSign.passwordSecure = await reporter.encryption.encrypt(u.$set.pdfSign.passwordRaw)
      } catch (e) {
        if (e.encryptionNoSecret) {
          e.message = missingSecretMessage
        }

        throw e
      }

      u.$set.pdfSign.passwordRaw = null
      u.$set.pdfSign.passwordFilled = true
    })
  })
}
