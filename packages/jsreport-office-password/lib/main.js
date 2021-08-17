const missingSecretMessage = require('./missingSecretMessage')

module.exports = function (reporter, definition) {
  reporter.documentStore.registerComplexType('OfficePasswordTemplateType', {
    passwordRaw: { type: 'Edm.String', visible: false },
    passwordSecure: { type: 'Edm.String', encrypted: true, visible: false },
    passwordFilled: { type: 'Edm.Boolean' },
    enabled: { type: 'Edm.Boolean' }
  })

  reporter.documentStore.model.entityTypes.TemplateType.officePassword = {
    type: 'jsreport.OfficePasswordTemplateType'
  }

  reporter.initializeListeners.add(definition.name, () => {
    reporter.documentStore.collection('templates').beforeInsertListeners.add(definition.name, async (doc, req) => {
      if (!doc.officePassword || !doc.officePassword.passwordRaw) {
        return
      }

      try {
        doc.officePassword.passwordSecure = await reporter.encryption.encrypt(doc.officePassword.passwordRaw)
      } catch (e) {
        if (e.encryptionNoSecret) {
          e.message = missingSecretMessage
        }

        throw e
      }

      doc.officePassword.passwordRaw = null
      doc.officePassword.passwordFilled = true
    })

    reporter.documentStore.collection('templates').beforeUpdateListeners.add(definition.name, async (q, u, req) => {
      if (!u.$set.officePassword || !u.$set.officePassword.passwordRaw) {
        return
      }

      try {
        u.$set.officePassword.passwordSecure = await reporter.encryption.encrypt(u.$set.officePassword.passwordRaw)
      } catch (e) {
        if (e.encryptionNoSecret) {
          e.message = missingSecretMessage
        }

        throw e
      }

      u.$set.officePassword.passwordRaw = null
      u.$set.officePassword.passwordFilled = true
    })
  })
}
