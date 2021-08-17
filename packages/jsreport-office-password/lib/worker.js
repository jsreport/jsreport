const Encryptor = require('xlsx-populate/lib/Encryptor')
const missingSecretMessage = require('./missingSecretMessage')

module.exports = function (reporter, definition) {
  reporter.initializeListeners.add(definition.name, () => {
    reporter.afterRenderListeners.insert({ before: 'scripts' }, definition.name, async (req, res) => {
      if (!req.template.officePassword || req.template.officePassword.enabled === false) {
        return
      }

      if (res.meta.officeDocumentType == null) {
        reporter.logger.debug('Skipping office-password generation, the feature is disabled during preview requests', req)
        return
      }

      let password = req.template.officePassword.password

      if (password == null) {
        if (!req.template.officePassword.passwordSecure) {
          throw reporter.createError('password was not set, you must supply a password when office-password is enabled', {
            statusCode: 4000
          })
        }

        try {
          password = await reporter.encryption.decrypt(req.template.officePassword.passwordSecure)
        } catch (e) {
          if (e.encryptionNoSecret) {
            e.message = missingSecretMessage
          } else if (e.encryptionDecryptFail) {
            e.message = 'office-password data decrypt failed, looks like secret key value is different to the key used to encrypt sensitive data, make sure "encryption.secretKey" was not changed'
          }

          throw e
        }
      }

      reporter.logger.debug(`office-password starting to add password to office file "${res.meta.officeDocumentType}"`, req)

      let protectedOfficeBuf

      try {
        const officeBuf = res.content
        const encryptor = new Encryptor()
        protectedOfficeBuf = encryptor.encrypt(officeBuf, password)
      } catch (err) {
        const error = new Error(err.message)
        error.stack = err.stack

        throw reporter.createError('Error while adding password to office file', {
          original: error,
          weak: true
        })
      }

      reporter.logger.debug(`office-password finished adding password to office file "${res.meta.officeDocumentType}"`, req)

      res.content = protectedOfficeBuf
    })
  })
}
