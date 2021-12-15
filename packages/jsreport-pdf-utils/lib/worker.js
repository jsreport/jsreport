const path = require('path')
const fs = require('fs').promises
const { customAlphabet } = require('nanoid')
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 24)
const proxyExtend = require('./proxyExtend')

const missingSecretMessage = 'pdf-sign extension uses encryption to store sensitive data and needs secret key to be defined. Please fill "encryption.secretKey" at the root of the config or disable encryption using "encryption.enabled=false".'

module.exports = (reporter, definition) => {
  let helpersScript

  reporter.addRequestContextMetaConfig('pdfUtilsFomrs', { sandboxHidden: true })
  reporter.addRequestContextMetaConfig('pdfUtilsOutlines', { sandboxHidden: true })

  reporter.extendProxy(proxyExtend)

  reporter.afterTemplatingEnginesExecutedListeners.add('pdf-utils', (req, res) => {
    // https://forum.jsreport.net/topic/1284/pdf-outline-with-child-templates
    if (!req.template.recipe.includes('pdf')) {
      // this skips also the child templates, because we want to get the outlines from final html
      return
    }

    req.context.shared.pdfUtilsHiddenPageFields = req.context.shared.pdfUtilsHiddenPageFields || {}
    ;['group', 'item', 'form'].forEach(m => {
      res.content = res.content.toString().replace(new RegExp(`${m}@@@([^@]*)@@@`, 'g'), (match, p1) => {
        const id = nanoid()
        req.context.shared.pdfUtilsHiddenPageFields[id] = p1
        return m + '@@@' + id + '@@@'
      })
    })

    if (res.content.includes('form@@@')) {
      req.context.pdfUtilsForms = true
    }

    if (!res.content.includes('data-pdf-outline')) {
      // optimization, don't do parsing if there is not a single link enabled
      return
    }

    const $ = require('cheerio').load(res.content)
    const anchors = $('a[data-pdf-outline]')

    req.context.pdfUtilsOutlines = []

    anchors.each(function (i, a) {
      const href = $(this).attr('href')
      if (!href || href[0] !== '#') {
        throw reporter.createError('Invalid url passed to anchor href with data-pdf-outline attribute.', {
          statusCode: 400
        })
      }

      const title =
        $(this).attr('data-pdf-outline-title') ||
        $(this)
          .text()
          .trim()

      if (!title) {
        throw reporter.createError('Invalid value passed to data-pdf-outline-title.', {
          statusCode: 400
        })
      }

      const parent = $(this).attr('data-pdf-outline-parent') || null

      if (parent && !req.context.pdfUtilsOutlines.find(o => o.id === parent)) {
        throw reporter.createError(`Outline parent "${parent}" passed to data-pdf-outline-parent was not found.`, {
          statusCode: 400
        })
      }

      req.context.pdfUtilsOutlines.push({
        id: href.substring(1),
        title,
        parent
      })
    })
  })

  reporter.registerHelpersListeners.add(definition.name, (req) => {
    return helpersScript
  })

  // we insert to the front so we can run before reports or scripts
  reporter.afterRenderListeners.insert(0, 'pdf-utils', async (req, res) => {
    if (
      req.template.pdfPassword == null &&
      req.template.pdfMeta == null &&
      req.template.pdfSign == null &&
      (!req.template.pdfOperations || req.template.pdfOperations.length === 0) &&
      !req.context.pdfUtilsOutlines &&
      !req.context.pdfUtilsForms
    ) {
      return
    }

    if (!req.template.recipe.includes('pdf')) {
      reporter.logger.debug('Skipping pdf utils processing because template is rendered with non-pdf recipe.', req)
      return
    }

    let pdfSign

    if (req.template.pdfSign) {
      let password = req.template.pdfSign.certificateAsset ? req.template.pdfSign.certificateAsset.password : null

      let certificateAsset = req.template.pdfSign.certificateAsset

      if (req.template.pdfSign.certificateAssetShortid) {
        certificateAsset = await reporter.documentStore.collection('assets').findOne({ shortid: req.template.pdfSign.certificateAssetShortid }, req)

        if (!certificateAsset) {
          throw reporter.createError(`Asset with shortid ${req.template.pdfSign.certificateAssetShortid} was not found`, {
            statusCode: 400
          })
        }
        if (certificateAsset.pdfSign && certificateAsset.pdfSign.passwordSecure) {
          try {
            password = await reporter.encryption.decrypt(certificateAsset.pdfSign.passwordSecure)
          } catch (e) {
            if (e.encryptionNoSecret) {
              e.message = missingSecretMessage
            } else if (e.encryptionDecryptFail) {
              e.message = 'pdf-sign data decrypt failed, looks like secret key value is different to the key used to encrypt sensitive data, make sure "encryption.secretKey" was not changed'
            }

            throw e
          }
        }
      } else if (certificateAsset && !Buffer.isBuffer(certificateAsset.content)) {
        certificateAsset.content = Buffer.from(certificateAsset.content, certificateAsset.encoding || 'utf8')
      }

      if (certificateAsset) {
        pdfSign = {
          maxSignaturePlaceholderLength: definition.options.maxSignaturePlaceholderLength,
          password,
          reason: req.template.pdfSign.reason,
          certificateContent: certificateAsset.content.toString('base64')
        }
      }
    }

    let pdfPassword

    if (
      req.template.pdfPassword != null &&
      (
        req.template.pdfPassword.password != null ||
        req.template.pdfPassword.ownerPassword != null
      )
    ) {
      pdfPassword = req.template.pdfPassword
    }

    const pdfMeta = req.template.pdfMeta

    const isPreviewRequest = req.options.preview === true || req.options.preview === 'true'

    if (isPreviewRequest && pdfPassword != null) {
      reporter.logger.debug('Skipping pdf-utils password addition, the feature is disabled during preview requests', req)
      pdfPassword = null
    }

    if (isPreviewRequest && pdfSign != null) {
      reporter.logger.debug('Skipping pdf-utils signature addition, the feature is disabled during preview requests', req)
      pdfSign = null
    }

    reporter.logger.info('pdf-utils is starting pdf processing', req)

    try {
      res.content = await (require('./pdfProcessing.js')(
        {
          pdfContent: res.content,
          operations: req.template.pdfOperations || [],
          outlines: req.context.pdfUtilsOutlines,
          pdfMeta,
          pdfPassword,
          pdfSign,
          removeHiddenMarks: !req.options.pdfUtils || req.options.pdfUtils.removeHiddenMarks !== false
        },
        reporter,
        req,
        res
      ))
    } catch (e) {
      throw reporter.createError('Error while executing pdf-utils operations', {
        original: e,
        weak: true
      })
    }

    reporter.logger.info('pdf-utils pdf processing was finished', req)
  })

  reporter.initializeListeners.add(definition.name, async () => {
    helpersScript = await fs.readFile(path.join(__dirname, '../static/helpers.js'), 'utf8')
  })
}
