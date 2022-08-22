const parsePdf = require('./parsePdf')
const { Document, External } = require('@jsreport/minpdf')

module.exports = (contentBuffer, { pdfMeta, pdfPassword, pdfSign, outlines, removeHiddenMarks } = {}) => {
  let currentBuffer = contentBuffer
  let currentlyParsedPdf

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
      const document = new Document()
      document.append(new External(currentBuffer))
      document.append(new External(appendBuffer))
      currentBuffer = await document.asBuffer()
    },

    async prepend (prependBuffer) {
      const document = new Document()
      document.append(new External(prependBuffer))
      document.append(new External(currentBuffer))
      currentBuffer = await document.asBuffer()
    },

    async merge (pageBuffersOrDocBuffer, mergeToFront) {
      const document = new Document()
      document.append(new External(currentBuffer))
      if (Buffer.isBuffer(pageBuffersOrDocBuffer)) {
        document.merge(new External(pageBuffersOrDocBuffer), mergeToFront)
      } else {
        for (const i in pageBuffersOrDocBuffer) {
          document.merge(new External(pageBuffersOrDocBuffer[i]), mergeToFront, i)
        }
      }
      currentBuffer = await document.asBuffer()
    },

    async removePages (pageNumbersToRemove) {
      const document = new Document()

      if (!Array.isArray(pageNumbersToRemove)) {
        pageNumbersToRemove = [pageNumbersToRemove]
      }

      for (const n of pageNumbersToRemove) {
        if (!Number.isInteger(n)) {
          throw new Error('Page number for remove operation needs to be an integer, got ' + pageNumbersToRemove)
        }

        if (n < 1) {
          throw new Error('Page number for remove operation needs to be bigger than 0')
        }
      }

      const ext = new External(currentBuffer)
      const pageIndexesToAppend = []
      for (let i = 0; i < ext.catalog.properties.get('Pages').object.properties.get('Kids').length; i++) {
        if (!pageNumbersToRemove.includes(i + 1)) {
          pageIndexesToAppend.push(i)
        }
      }

      document.append(ext, pageIndexesToAppend)
      currentBuffer = await document.asBuffer()
    },

    async addAttachment (buf, options) {
      const doc = new Document()
      doc.append(new External(currentBuffer))
      doc.attachment(buf, options)
      currentBuffer = await doc.asBuffer()
    },

    toBuffer () {
      return Promise.resolve(currentBuffer)
    },

    async postprocess ({
      hiddenPageFields
    }) {
      const doc = new Document()

      const ext = new External(currentBuffer)
      doc.append(ext)

      if (pdfSign) {
        doc.sign({
          certificateBuffer: Buffer.from(pdfSign.certificateContent, 'base64'),
          password: pdfSign.password,
          reason: pdfSign.reason,
          maxSignaturePlaceholderLength: pdfSign.maxSignaturePlaceholderLength
        })
      }

      if (outlines) {
        doc.outlines(outlines)
      }

      doc.processText({
        resolver: async (text, { remove, getPosition }) => {
          for (const mark of ['group', 'item', 'form']) {
            let i = -1
            while ((i = text.indexOf(`${mark}@@@`, i + 1)) !== -1) {
              if (removeHiddenMarks || mark === 'form') {
                remove(i, text.indexOf('@@@', i + `${mark}@@@`.length) + '@@@'.length)
              }

              if (mark === 'form') {
                const trimmedText = text.substring(i + 'form@@@'.length, text.indexOf('@@@', i + 'form@@@'.length))
                const valueOfText = hiddenPageFields[trimmedText]

                const { pageIndex, position } = getPosition(i, text.indexOf('@@@', i + `${mark}@@@`.length) + '@@@'.length)
                const formSpec = JSON.parse(Buffer.from(valueOfText, 'base64').toString())

                await doc.acroForm({
                  ...formSpec,
                  position,
                  pageIndex
                })
              }
            }
          }
        }
      })

      if (pdfPassword) {
        doc.encrypt({
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
        })
      }

      if (pdfMeta) {
        doc.info(pdfMeta)
      }

      try {
        currentBuffer = await doc.asBuffer()
      } catch (e) {
        if (e.message.includes('Signature exceeds placeholder')) {
          e.message += '. Increase placeholder length using config extensions.pdfUtils.maxSignaturePlaceholderLength'
          throw e
        }
      }
      /*
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
      } */
    }
  }
}
