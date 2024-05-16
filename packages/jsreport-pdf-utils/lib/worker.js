const path = require('path')
const fs = require('fs').promises
const { customAlphabet } = require('nanoid')
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 24)
const proxyExtend = require('./proxyExtend')

const missingSecretMessage = 'pdf-sign extension uses encryption to store sensitive data and needs secret key to be defined. Please fill "encryption.secretKey" at the root of the config or disable encryption using "encryption.enabled=false".'

module.exports = (reporter, definition) => {
  let helpersScript

  reporter.addRequestContextMetaConfig('pdfUtilsForms', { sandboxHidden: true })
  reporter.addRequestContextMetaConfig('pdfUtilsOutlines', { sandboxHidden: true })
  reporter.addRequestContextMetaConfig('pdfUtilsAccessibility', { sandboxHidden: true })

  reporter.extendProxy(proxyExtend)

  reporter.afterTemplatingEnginesExecutedListeners.add('pdf-utils', async (req, res) => {
    // https://forum.jsreport.net/topic/1284/pdf-outline-with-child-templates
    if (req.template.recipe == null || !req.template.recipe.includes('pdf')) {
      // this skips also the child templates, because we want to get the outlines from final html
      return
    }

    req.context.shared.pdfUtilsHiddenPageFields = req.context.shared.pdfUtilsHiddenPageFields || {}

    const fields = ['group', 'item', 'form', 'dest']
    const fieldsRegExp = new RegExp(`(${fields.join('|')})@@@([^@]*)@@@`, 'g')
    let content = (await res.output.getBuffer()).toString()

    content = content.replace(fieldsRegExp, (match, g1, g2) => {
      const id = nanoid()

      if (g1 === 'form') {
        req.context.pdfUtilsForms = true
      }

      req.context.shared.pdfUtilsHiddenPageFields[id] = g2
      return `${g1}@@@${id}@@@`
    })

    await res.output.update(Buffer.from(content))

    if (!content.includes('data-pdf-outline')) {
      // optimization, don't do parsing if there is not a single link enabled
      return
    }

    const $ = require('cheerio').load(content)
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

  reporter.registerHelpersListeners.add(definition.name, () => {
    return helpersScript
  })

  reporter.beforeRenderListeners.add('pdf-utils', (req, res) => {
    // we need to avoid that nested calls are adding the same root outlines
    req.context.pdfUtilsOutlines = null

    // we use just root template setting for pdfAccessibility
    // this is because otherwise you need to set the accessibility on every merged/template
    // the use case when you would want root template to have for example pdf/ua enabled but not some child renders doesn't exist I tihnk
    if (!req.context.pdfUtilsAccessibility && !req.template.pdfAccessibility) {
      return
    }

    if (req.context.pdfUtilsAccessibility) {
      req.template.pdfAccessibility = req.context.pdfUtilsAccessibility
    } else {
      req.context.pdfUtilsAccessibility = req.template.pdfAccessibility
    }
  })

  // we insert to the front so we can run before reports or scripts
  reporter.afterRenderListeners.insert(0, 'pdf-utils', async (req, res) => {
    if (
      req.template.pdfPassword == null &&
      req.template.pdfMeta == null &&
      req.template.pdfAccessibility?.enabled !== true &&
      req.template.pdfAccessibility?.pdfUA !== true &&
      req.template.pdfA?.enabled !== true &&
      req.template.pdfSign == null &&
      (!req.template.pdfOperations || req.template.pdfOperations.length === 0) &&
      !req.context.pdfUtilsOutlines &&
      !req.context.pdfUtilsForms
    ) {
      return
    }

    if (req.template.recipe == null || !req.template.recipe.includes('pdf')) {
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
      const pdfContent = await res.output.getBuffer()

      const output = await (require('./pdfProcessing.js')(
        {
          pdfContent,
          operations: req.template.pdfOperations || [],
          outlines: req.context.pdfUtilsOutlines,
          pdfMeta: req.template.pdfMeta,
          pdfA: req.template.pdfA,
          pdfAccessibility: req.context.pdfUtilsAccessibility,
          pdfPassword,
          pdfSign,
          removeHiddenMarks: !req.options.pdfUtils || req.options.pdfUtils.removeHiddenMarks !== false
        },
        reporter,
        req,
        res
      ))

      await res.output.update(output)
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
