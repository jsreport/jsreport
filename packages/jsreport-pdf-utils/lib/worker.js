const cheerio = require('cheerio')
const { customAlphabet } = require('nanoid')
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 24)
const pdfProcessing = require('./pdfProcessing.js')
const proxyExtend = require('./proxyExtend')

const missingSecretMessage = 'pdf-sign extension uses encryption to store sensitive data and needs secret key to be defined. Please fill "encryption.secretKey" at the root of the config or disable encryption using "encryption.enabled=false".'

module.exports = (reporter, definition) => {
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

    const $ = cheerio.load(res.content)
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

  reporter.beforeRenderListeners.insert({ after: 'data' }, 'pdf-utils', async (req, res) => {
    // avoid helpers duplication
    if (typeof req.template.helpers === 'object') {
      if (req.template.helpers.pdfAddPageItem) {
        return
      }
    } else {
      if (req.template.helpers && req.template.helpers.includes('function pdfAddPageItem')) {
        return
      }
    }

    function pdfFormField (el) {
      // handlebars
      if (el && el.hash) {
        el = el.hash
      }
      // jsrender
      if (this && this.tagCtx && this.tagCtx.props) {
        el = this.tagCtx.props
      }

      if (el == null || el.type == null || el.name == null || el.width == null || el.height == null) {
        throw new Error('pdfFormField requires name, type, width, height params ')
      }

      if (!el.width.includes('px')) {
        throw new Error('pdfFormField width should be in px')
      }

      el.width = parseInt(el.width.substring(0, el.width.length - 2))

      if (!el.height.includes('px')) {
        throw new Error('pdfFormField height should be in px')
      }

      el.height = parseInt(el.height.substring(0, el.height.length - 2))

      if (el.fontSize != null) {
        if (!el.fontSize.includes('px')) {
          throw new Error('pdfFormField fontSize should be in px')
        }

        el.fontSize = parseInt(el.fontSize.substring(0, el.fontSize.length - 2))
      }

      if (el.items && typeof el.items === 'string') {
        el.items = el.items.split(',')
      }

      if (el.type === 'combo' && el.items == null) {
        throw new Error('pdfFormField with combo type needs requires items attribute')
      }

      if (el.fontFamily != null) {
        const stdFonts = ['Times-Roman', 'Times-Bold', 'Time-Italic', 'Time-BoldItalic', 'Courier', 'Courier-Bold', 'Courier-Oblique', 'Helvetica', 'Helvetica-Bold',
          'Helvetica-Oblique', 'Helvetica-BoldOblique', 'Symbol', 'ZapfDingbats', 'Courier-BoldOblique']

        if (!stdFonts.includes(el.fontFamily)) {
          throw new Error('pdfFormField supports only pdf base 14 fonts in fontFamily attribute.')
        }
      }

      const params = JSON.stringify(el)
      const value = Buffer.from(params).toString('base64')

      return `<span class='jsreport-pdf-utils-form-element jsreport-pdf-utils-hidden-element' style='font-family: Helvetica;display: inline-block;vertical-align:middle;text-transform:none;font-size:1.1px;width: ${el.width}px; height: ${el.height}px'>form@@@${value}@@@</span>`
    }

    function pdfCreatePagesGroup (groupId) {
      // handlebars
      if (groupId && groupId.hash) {
        groupId = groupId.hash
      }
      // jsrender
      if (this && this.tagCtx && this.tagCtx.props) {
        groupId = this.tagCtx.props
      }
      // otherwise just simple one value param is supported

      if (groupId == null) {
        const err = new Error('"pdfCreatePagesGroup" was called with undefined parameter. One parameter was expected.')
        err.stack = null
        throw err
      }

      const jsonStrOriginalValue = JSON.stringify(groupId)
      const value = Buffer.from(jsonStrOriginalValue).toString('base64')
      // we use position: absolute to make the element to not participate in flexbox layout
      // (making it not a flexbox child)
      const result = `<span class='jsreport-pdf-utils-page-group jsreport-pdf-utils-hidden-element' style='font-family: Helvetica;position:absolute;text-transform: none;opacity: 0.01;font-size:1.1px'>group@@@${value}@@@</span>`
      console.log(`Pdf utils adding group field, value: ${jsonStrOriginalValue}`)
      return result
    }

    function pdfAddPageItem (item) {
      // handlebars
      if (item && item.hash) {
        item = item.hash
      }
      // jsrender
      if (this && this.tagCtx && this.tagCtx.props) {
        item = this.tagCtx.props
      }
      // otherwise just simple one value param is supported

      if (item == null) {
        const err = new Error('"pdfAddPageItem" was called with undefined parameter. One parameter was expected.')
        err.stack = null
        throw err
      }

      const jsonStrOriginalValue = JSON.stringify(item)
      const value = Buffer.from(jsonStrOriginalValue).toString('base64')
      // we use position: absolute to make the element to not participate in flexbox layout
      // (making it not a flexbox child)
      const result = `<span class='jsreport-pdf-utils-page-item jsreport-pdf-utils-hidden-element' style='font-family: Helvetica;position:absolute;text-transform: none;opacity: 0.01;font-size:1.1px'>item@@@${value}@@@</span>`
      console.log(`Pdf utils adding item field, value: ${jsonStrOriginalValue}`)
      return result
    }

    if (req.template.helpers && typeof req.template.helpers === 'object') {
      req.template.helpers.pdfFormField = pdfFormField
      req.template.helpers.pdfCreatePagesGroup = pdfCreatePagesGroup
      req.template.helpers.pdfAddPageItem = pdfAddPageItem
    } else {
      req.template.helpers = (req.template.helpers || '') + '\n;' + pdfFormField + '\n' + pdfCreatePagesGroup + '\n' + pdfAddPageItem
    }
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
      res.content = await pdfProcessing(
        {
          pdfContent: res.content.toString('base64'),
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
      )
    } catch (e) {
      throw reporter.createError('Error while executing pdf-utils operations', {
        original: e,
        weak: true
      })
    }

    reporter.logger.info('pdf-utils pdf processing was finished', req)
  })
}
