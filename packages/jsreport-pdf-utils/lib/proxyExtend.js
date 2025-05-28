module.exports = (proxy, req) => {
  proxy.pdfUtils = {
    parse: async (sourcePdfBuf, includeText) => {
      const manipulator = require('./pdfManipulator')(sourcePdfBuf)

      const parsedPdf = await manipulator.parse({
        includeText,
        hiddenPageFields: req.context.shared.pdfUtilsHiddenPageFields
      })

      return parsedPdf
    },
    prepend: async (sourcePdfBuf, extraPdfBuf) => {
      const manipulator = require('./pdfManipulator')(sourcePdfBuf)

      await manipulator.prepend(extraPdfBuf)

      const resultPdfBuf = await manipulator.toBuffer()

      return resultPdfBuf
    },
    append: async (sourcePdfBuf, extraPdfBuf, options) => {
      const manipulator = require('./pdfManipulator')(sourcePdfBuf)

      await manipulator.append(extraPdfBuf, options)

      const resultPdfBuf = await manipulator.toBuffer()

      return resultPdfBuf
    },
    merge: async (sourcePdfBuf, extraPdfBufOrPages, mergeToFront) => {
      const manipulator = require('./pdfManipulator')(sourcePdfBuf)

      // merge needs to have information about total of pages in source pdf
      await manipulator.parse({
        hiddenPageFields: req.context.shared.pdfUtilsHiddenPageFields
      })

      await manipulator.merge(extraPdfBufOrPages, { mergeToFront })

      const resultPdfBuf = await manipulator.toBuffer()

      return resultPdfBuf
    },
    removePages: async (sourcePdfBuf, pageNumbers) => {
      const manipulator = require('./pdfManipulator')(sourcePdfBuf)

      await manipulator.parse()
      await manipulator.removePages(pageNumbers)

      const resultPdfBuf = await manipulator.toBuffer()

      return resultPdfBuf
    },
    outlines: async (sourcePdfBuf, outlines) => {
      const manipulator = require('./pdfManipulator')(sourcePdfBuf, { outlines })

      await manipulator.postprocess({
        hiddenPageFields: req.context.shared.pdfUtilsHiddenPageFields
      })

      const resultPdfBuf = await manipulator.toBuffer()

      return resultPdfBuf
    },
    postprocess: async (sourcePdfBuf, { pdfMeta, pdfPassword, pdfSign, outlines, pdfCompression } = {}) => {
      const manipulator = require('./pdfManipulator')(sourcePdfBuf, { pdfMeta, pdfPassword, pdfSign, outlines, pdfCompression, removeHiddenMarks: true })
      await manipulator.postprocess({
        hiddenPageFields: req.context.shared.pdfUtilsHiddenPageFields
      })
      const resultPdfBuf = await manipulator.toBuffer()

      return resultPdfBuf
    },
    addAttachment: async (sourcePdfBuf, buf, options) => {
      const manipulator = require('./pdfManipulator')(sourcePdfBuf)

      await manipulator.parse()
      await manipulator.addAttachment(buf, options)

      const resultPdfBuf = await manipulator.toBuffer()

      return resultPdfBuf
    }
  }
}
