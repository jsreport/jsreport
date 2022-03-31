const removePages = require('./removePages')
const mergePdfs = require('./mergePdfs')
const parsePdf = require('./parsePdf')
const addPages = require('./addPages')
const addAttachment = require('./addAttachment')
const { addSignaturePlaceholder, sign } = require('./sign')
const processText = require('./processText')
const pdfjs = require('@jsreport/pdfjs')
const PDF = require('@jsreport/pdfjs/lib/object')

module.exports = (contentBuffer, { pdfMeta, pdfPassword, pdfSign, outlines, removeHiddenMarks } = {}) => {
  let currentBuffer = contentBuffer
  let currentlyParsedPdf
  let pagesHelpInfo = []

  return {
    async parse ({
      includeText = false,
      hiddenPageFields = {}
    } = {}) {
      currentlyParsedPdf = await parsePdf(currentBuffer, {
        hiddenPageFields,
        includeText
      })
      return currentlyParsedPdf
    },

    get parsedPdf () {
      return currentlyParsedPdf
    },

    async append (appendBuffer) {
      const addPageResult = await addPages(currentBuffer, appendBuffer)
      currentBuffer = addPageResult.buffer
    },

    async prepend (prependBuffer) {
      const addPageResult = await addPages(prependBuffer, currentBuffer)
      currentBuffer = addPageResult.buffer
      pagesHelpInfo = new Array(addPageResult.pagesInAppend).concat(pagesHelpInfo)
      currentBuffer = addPageResult.buffer
    },

    async merge (pageBuffersOrDocBuffer, mergeToFront) {
      for (let i = 0; i < currentlyParsedPdf.pages.length; i++) {
        pagesHelpInfo[i] = pagesHelpInfo[i] || { xObjIndex: 0, removeContentBackLayer: true }
        pagesHelpInfo[i].xObjIndex++
      }

      if (Buffer.isBuffer(pageBuffersOrDocBuffer)) {
        currentBuffer = await mergePdfs.mergeDocument(currentBuffer, pageBuffersOrDocBuffer, mergeToFront, pagesHelpInfo)
      } else {
        currentBuffer = await mergePdfs.mergePages(currentBuffer, pageBuffersOrDocBuffer, mergeToFront, pagesHelpInfo)
      }

      pagesHelpInfo.forEach(i => (i.removeContentBackLayer = false))
    },

    async removePages (pageNumbers) {
      currentBuffer = await removePages(currentBuffer, pageNumbers)
    },

    async addAttachment (buf, options) {
      currentBuffer = await addAttachment(currentBuffer, buf, options)
    },

    toBuffer () {
      return Promise.resolve(currentBuffer)
    },

    async postprocess ({
      hiddenPageFields
    }) {
      // https://github.com/vbuch/node-signpdf/issues/98
      // pdf sign placeholder needs to be written before the password protection takes place
      if (pdfSign) {
        currentBuffer = await addSignaturePlaceholder(currentBuffer, pdfSign.reason, pdfSign.maxSignaturePlaceholderLength)
      }

      const ext = new pdfjs.ExternalDocument(currentBuffer)

      const newDocOpts = {}
      if (pdfPassword) {
        newDocOpts.encryption = {
          password: pdfPassword.password,
          ownerPassword: pdfPassword.ownerPassword,
          permissions: {
            printing: pdfPassword.printing,
            modifying: pdfPassword.modifying,
            copying: pdfPassword.copying,
            annotating: pdfPassword.annotating,
            fillingForms: pdfPassword.fillingForms,
            contentAccessibility: pdfPassword.contentAccessibility,
            documentAssembly: pdfPassword.documentAssembly
          }
        }
      }

      const doc = new pdfjs.Document(newDocOpts)

      if (pdfMeta) {
        doc.info.Title = pdfMeta.title
        doc.info.Author = pdfMeta.author
        doc.info.Subject = pdfMeta.subject
        doc.info.Keywords = pdfMeta.keywords
        doc.info.Creator = pdfMeta.creator
        doc.info.Producer = pdfMeta.producer

        if (pdfMeta.language) {
          doc._finalizeCatalog.push(() => {
            doc._catalog.prop('Lang', new PDF.String(pdfMeta.language))
          })
        }
      }

      if (outlines) {
        for (const o of outlines) {
          doc.outline(o.title, o.id, o.parent)
        }
      }

      await processText(doc, ext, {
        removeHiddenMarks,
        hiddenPageFields
      })

      doc.addPagesOf(ext)

      currentBuffer = await doc.asBuffer()

      if (pdfSign) {
        currentBuffer = await sign(
          currentBuffer,
          Buffer.from(pdfSign.certificateContent, 'base64'),
          pdfSign.password
        )
      }
    }
  }
}
