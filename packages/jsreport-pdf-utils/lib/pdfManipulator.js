const parsePdf = require('./utils/parsePdf')
const { Document, External } = require('@jsreport/pdfjs')
const PDF = require('@jsreport/pdfjs/lib/object')
const HIDDEN_TEXT_SIZE = 1.1

module.exports = (contentBuffer, { pdfMeta, pdfPassword, pdfSign, pdfA, outlines, removeHiddenMarks, pdfAccessibility, pdfCompression } = {}) => {
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

    async append (appendBuffer, options = {}) {
      const document = new Document()
      document.append(new External(currentBuffer), { copyAccessibilityTags: pdfAccessibility?.enabled })
      document.append(new External(appendBuffer), {
        copyAccessibilityTags: pdfAccessibility?.enabled,
        appendAfterIndex: options.appendAfterPageNumber != null ? options.appendAfterPageNumber - 1 : null
      })
      currentBuffer = await document.asBuffer()
    },

    async prepend (prependBuffer) {
      const document = new Document()
      document.append(new External(prependBuffer), { copyAccessibilityTags: pdfAccessibility?.enabled })
      document.append(new External(currentBuffer), { copyAccessibilityTags: pdfAccessibility?.enabled })
      currentBuffer = await document.asBuffer()
    },

    async merge (pageBuffersOrDocBuffer, mergeToFront) {
      const document = new Document()
      document.append(new External(currentBuffer), { copyAccessibilityTags: pdfAccessibility?.enabled })
      if (Buffer.isBuffer(pageBuffersOrDocBuffer)) {
        document.merge(new External(pageBuffersOrDocBuffer), { mergeToFront, copyAccessibilityTags: pdfAccessibility?.enabled })
      } else {
        for (const i in pageBuffersOrDocBuffer) {
          document.merge(new External(pageBuffersOrDocBuffer[i]), { mergeToFront, pageNum: i, copyAccessibilityTags: pdfAccessibility?.enabled })
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
      function collectPages (pagesObj, pages) {
        for (const page of pagesObj.properties.get('Kids').map(k => k.object)) {
          if (page.properties.get('Type').name === 'Pages') {
            collectPages(page, pages)
          } else {
            pages.push(page)
          }
        }
      }
      const pages = []
      collectPages(ext.catalog.properties.get('Pages').object, pages)

      const pageIndexesToAppend = []
      for (let i = 0; i < pages.length; i++) {
        if (!pageNumbersToRemove.includes(i + 1)) {
          pageIndexesToAppend.push(i)
        }
      }

      document.append(ext, { pageIndexes: pageIndexesToAppend, copyAccessibilityTags: pdfAccessibility?.enabled })
      currentBuffer = await document.asBuffer()
    },

    async addAttachment (buf, options) {
      const doc = new Document()
      doc.append(new External(currentBuffer), { copyAccessibilityTags: pdfAccessibility?.enabled })
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
      doc.append(ext, { copyAccessibilityTags: pdfAccessibility?.enabled })

      if (pdfSign) {
        doc.sign({
          certificateBuffer: Buffer.from(pdfSign.certificateContent, 'base64'),
          password: pdfSign.password,
          reason: pdfSign.reason,
          maxSignaturePlaceholderLength: pdfSign.maxSignaturePlaceholderLength
        })
      }

      doc.processText({
        resolver: async (text, { remove, getPosition }) => {
          for (const mark of ['group', 'item', 'form', 'dest']) {
            let i = -1
            while ((i = text.indexOf(`${mark}@@@`, i + 1)) !== -1) {
              if (removeHiddenMarks || mark === 'form' || mark === 'dest') {
                remove(i, text.indexOf('@@@', i + `${mark}@@@`.length) + '@@@'.length)
              }

              if (mark !== 'form' && mark !== 'dest') {
                continue
              }

              const trimmedText = text.substring(i + `${mark}@@@`.length, text.indexOf('@@@', i + `${mark}@@@`.length))
              const valueOfText = hiddenPageFields[trimmedText]
              const { pageIndex, position, matrix } = getPosition(i)
              position[5] -= HIDDEN_TEXT_SIZE * matrix[3]

              if (mark === 'dest') {
                const dest = new PDF.Array([
                  doc.pages[pageIndex].toReference(),
                  new PDF.Name('XYZ'),
                  position[4],
                  position[5],
                  0
                ])
                doc.catalog.properties.get('Dests').object.properties.set(`/${valueOfText}`, dest)
              }

              if (mark === 'form') {
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

      if (outlines) {
        // needs to be after the processText because it may need pdfDest processed
        doc.outlines(outlines)
      }

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
        const meta = { ...pdfMeta }
        if (meta.custom && typeof meta.custom === 'string' && meta.custom !== '') {
          meta.custom = JSON.parse(meta.custom)
        }
        doc.info(meta)
      }

      if (pdfA?.enabled === true) {
        doc.pdfA()
      }

      if (pdfAccessibility?.pdfUA === true) {
        doc.pdfUA()
      }

      if (pdfCompression?.enabled === true) {
        doc.compress(pdfCompression)
      }

      try {
        currentBuffer = await doc.asBuffer()
      } catch (e) {
        if (e.message.includes('Signature exceeds placeholder')) {
          e.message += '. Increase placeholder length using config extensions.pdfUtils.maxSignaturePlaceholderLength'
          throw e
        }

        throw e
      }
    }
  }
}
